import { promises } from "fs";
import path from "path";
import mongoose from "mongoose";
import imagemin from "imagemin";
// import imageminJpegtran from "imagemin-jpegtran";
// import imageminPngquant from "imagemin-pngquant";
import imageminWebp, { Options } from "imagemin-webp";
import jpegRotator from "jpeg-autorotate";
import { timeLog, timeWarn } from "./log.js";
import { insertAlbum, selectAlbumById } from "./database/albums/albumsCollection.js";
import { insertNewTag } from "./database/tags/tagsCollection.js";
import { insertAlbumTagDependency } from "./database/tags/tagAlbumsCollection.js";
import { deletePicturesByIds, insertAlbumPicture, selectAlbumPictureById, selectAlbumPicturesGroupByIds, selectPicturesByAlbumId, updateAlbumPictureById } from "./database/pictures/albumPicturesCollection.js";
import { PictureSizing, SnapFileSize } from "./types.js";
import { AlbumsListItem } from "./database/albums/types.js";
import { AlbumPicturesItem, AlbumPicturesItemExport } from "./database/pictures/types.js";
import { getEnvGalleryCashLocation, getEnvGallerySrcLocation, getEnvRootCashLocation } from "./env.js";
import { insertAlbumWithTags } from "./database/utils.js";

const DIR_WEBP_FULL = ".webpFull";
const DIR_WEBP_SNAP = ".webpSnap";

export function getEnvLocation(dirPath: string, galleryName = ""): string {
  if (!dirPath) {
    timeWarn("No .env location provided!");
    process.exit(1);
  } else if (dirPath[0] === "~") {
    return path.join(`${process.env.HOME}${dirPath.slice(1)}`, galleryName);
  }
  return path.join(dirPath, galleryName);
}

export function fileNameToWebp(filePath: string): string {
  const dirPath = path.dirname(filePath);
  const baseFileName = path.basename(filePath, path.extname(filePath));
  return path.join(dirPath, `${baseFileName}.webp`);
}

export function getFullWebpFilePath(filePath: string): string {
  const dirPath = path.dirname(filePath);
  const webpDirPath = path.join(dirPath, DIR_WEBP_FULL);
  const baseFileName = path.basename(filePath, path.extname(filePath));
  return path.join(webpDirPath, `${baseFileName}.webp`);
}

export function getSnapWebpFilePath(filePath: string): string {
  const dirPath = path.dirname(filePath);
  const webpDirPath = path.join(dirPath, DIR_WEBP_SNAP);
  const baseFileName = path.basename(filePath, path.extname(filePath));
  return path.join(webpDirPath, `${baseFileName}.webp`);
}

export async function imageToWebpData(
  srcFilePath: string,
  desctinationFilePath: string,
  sizing: PictureSizing
): Promise<Buffer> {
  let wepbConfig: Options = {};
  if (sizing === PictureSizing.Snap) {
    wepbConfig = {
      resize: {
        width: 0,
        height: 200
      },
      size: SnapFileSize,
      method: 2
    };
  } else if (sizing === PictureSizing.ExtraReduced) {
    wepbConfig = {
      resize: {
        width: 0,
        height: 200
      },
      size: SnapFileSize,
      // quality: 1,
      method: 2
    };
  }
  const distanationPath = path.dirname(desctinationFilePath);

  const resultsArray = await imagemin([srcFilePath.replace(/\\/g, "/")], {
    destination: distanationPath.replace(/\\/g, "/"),
    // @ts-ignore
    plugins: [imageminWebp(wepbConfig)]
  });

  return resultsArray?.[0]?.data;
}

export function writeBase64DecodedFile(base64str: string, fileName: string, dirName: string): Promise<void> {
  const fileContents = base64str.split(";base64,").pop() || "";
  // const bitmap = Buffer.alloc(base64str, 'base64')
  return promises.writeFile(`${dirName}/photo/${fileName}`, fileContents, {
    encoding: "base64"
  });
}

function fileNameIsImage(filePath: string): boolean {
  const fileFormat = path.extname(filePath).toLowerCase();
  return (
    fileFormat === ".png" ||
    fileFormat === ".jpeg" ||
    fileFormat === ".jpg" ||
    fileFormat === ".webp" ||
    fileFormat === ".gif"
  );
}

export async function fileExists(fullPath: string): Promise<boolean> {
  try {
    await promises.access(fullPath);
    return true;
  } catch (localErr) {
    return false;
  }
}

export async function getFileSize(fullPath: string): Promise<number> {
  try {
    const fileStats = await promises.stat(fullPath);
    return fileStats.size;
  } catch (localErr) {
    return 0;
  }
}

async function getDirectoryFilesCount(directoryPath: string): Promise<number> {
  let filesCount = 0;
  try {
    const files = await promises.readdir(directoryPath);

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = await promises.stat(filePath);
      if (stats.isFile() && fileNameIsImage(filePath)) {
        filesCount++;
        if (file.includes("(") || file.includes(")")) {
          const fixedFileName = file.replace(/\(/g, "").replace(/\)/g, "");
          await promises.rename(filePath, path.join(directoryPath, fixedFileName));
        }
      }
    }
    return filesCount;
  } catch (localErr) {
    timeWarn("getDirectoryFilesCount");
    console.log(localErr);
    return filesCount;
  }
}

export async function initAllAlbums(
  directoryPath: string,
  parentTags: string[] = [],
  parentAlbumId: mongoose.Types.ObjectId | null = null
): Promise<number> {
  try {
    const files = await promises.readdir(directoryPath);
    let albumSize = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(directoryPath, file);
      const stats = await promises.stat(filePath);

      if (stats.isDirectory()) {
        if (file.startsWith(".")) {
          continue;
        }
        const newTags = [...parentTags, file];
        const subAlbumSize = await getDirectoryFilesCount(filePath);

        const albumInfo: AlbumsListItem = {
          albumName: file,
          fullPath: filePath,
          changedDate: stats.mtime.toISOString(),
          albumSize: subAlbumSize
        };

        let newAlbumId: mongoose.Types.ObjectId | null = null;
        if (subAlbumSize) {
          newAlbumId = await insertAlbumWithTags(albumInfo, parentTags);
        }
        await initAllAlbums(filePath, newTags, newAlbumId);
      } else {
        albumSize++;
        if (parentAlbumId && fileNameIsImage(file)) {
          // timeLog(parentAlbumId)
          const albumPicture: AlbumPicturesItem = {
            fileName: file,
            fileFormat: path.extname(file).toLowerCase(),
            fullPath: filePath,
            pictureNumber: i + 1,
            album: parentAlbumId
          };
          await insertAlbumPicture(albumPicture);
        }
      }
    }
    return albumSize;
  } catch (localErr) {
    timeWarn(`Error reading directory: ${directoryPath}`);
    console.log(localErr);
    return -1;
  }
}

export function getRenameFilePath(oldPath: string, newFileName: string): string {
  const parentDir = path.dirname(oldPath);
  return path.join(parentDir, newFileName);
}

export async function renameFile(oldPath: string, newPath: string): Promise<number> {
  try {
    await promises.rename(oldPath, newPath);
    return 0;
  } catch (localErr) {
    timeWarn(`File rename error: ${oldPath} -> ${newPath}`);
    console.log(localErr);
    return 1;
  }
}

export async function moveFile(oldPath: string, newPath: string): Promise<number> {
  try {
    await promises.cp(oldPath, newPath);
    await promises.rm(oldPath);
    return 0;
  } catch (localErr) {
    timeWarn(`File move error: ${oldPath} -> ${newPath}`);
    console.log(localErr);
    return 1;
  }
}

export async function generateNewAlbumPath(albumTags: string[], albumName: string): Promise<string | null> {
  let currentPath = getEnvGallerySrcLocation();
  const localAlbumTags = [...albumTags];
  try {
    let files = await promises.readdir(currentPath);
    let filesIndex = 0;

    while (filesIndex < files.length && localAlbumTags.length) {
      const file = files[filesIndex];
      const filePath = path.join(currentPath, file);
      const stats = await promises.stat(filePath);
      if (stats.isDirectory()) {
        const foundTagIndex = localAlbumTags.indexOf(file);
        if (foundTagIndex >= 0) {
          currentPath = filePath;
          localAlbumTags.splice(foundTagIndex, 1);
          files = await promises.readdir(currentPath);
          filesIndex = -1;
        }
      }
      filesIndex++;
    }
    const finalPath = path.join(currentPath, albumName);
    await promises.mkdir(finalPath);
    return finalPath;
  } catch (localErr) {
    timeWarn("mkDir Error!");
    console.log(localErr);
    return null;
  }
}

export async function removePath(fullPath: string): Promise<number> {
  try {
    await promises.rm(fullPath, { recursive: true, force: true });
    return 0;
  } catch (localErr) {
    timeWarn(`Direcory remove error: ${fullPath}`);
    console.log(localErr);
    return 1;
  }
}

function imageHasWrongName(albumPic: AlbumPicturesItem, i: number, correctFileName: string): boolean {
  return albumPic?.fileName !== correctFileName || albumPic.pictureNumber !== i + 1;
}

function getCorrectFileName(imageNumber: number, fileFormat: string): string {
  return `pic_${String(imageNumber).padStart(4, "0")}.${fileFormat}`;
}

async function imageNeedsBufferToRename(albumPic: AlbumPicturesItemExport, i: number): Promise<boolean> {
  const correctFileName = getCorrectFileName(i, albumPic?.fileFormat);
  if (!imageHasWrongName(albumPic, i, correctFileName)) {
    return false;
  }
  return await fileExists(albumPic.fullPath.replace(albumPic.fileName, correctFileName));
}

async function moveImageByNumber(
  albumPic: AlbumPicturesItemExport,
  imageNumber: number,
  oldDir?: string
): Promise<number> {
  const correctFileName = getCorrectFileName(imageNumber, albumPic?.fileFormat);
  const oldPath = oldDir ? path.join(oldDir, albumPic.fileName) : albumPic.fullPath;
  const newPath = albumPic.fullPath.replace(albumPic.fileName, correctFileName);
  const rc = await moveFile(oldPath, newPath);
  if (rc) {
    return rc;
  }
  return updateAlbumPictureById(albumPic._id, newPath, correctFileName, imageNumber);
}

export async function arrangeImageFiles(albumImageIds: string[], albumId: string): Promise<number> {
  try {
    const albumPictures = await selectPicturesByAlbumId(albumId);
    const album = await selectAlbumById(albumId);
    if (!album || (!albumPictures.length && albumImageIds.length)) {
      timeLog(album);
      return 404;
    }

    const gallerySrcLocation = getEnvGallerySrcLocation();
    const galleryCashLocation = getEnvGalleryCashLocation();
    await removePath(album.fullPath.replace(gallerySrcLocation, galleryCashLocation));

    const sortedAlbumPictures: AlbumPicturesItemExport[] = [];
    for (const albumImageId of albumImageIds) {
      const foundAlbumPic = albumPictures.find((albimPic) => albimPic._id.toString() === albumImageId);
      if (!foundAlbumPic) {
        timeLog(albumImageId);
        return 404;
      }
      sortedAlbumPictures.push(foundAlbumPic);
    }

    const albumPicturesToDelete: mongoose.Types.ObjectId[] = [];
    for (const albumPicture of albumPictures) {
      const foundAlbumPic = albumImageIds.find((albumImageId) => albumPicture._id.toString() === albumImageId);
      if (!foundAlbumPic) {
        await promises.rm(albumPicture.fullPath, { force: true });
        albumPicturesToDelete.push(albumPicture._id);
      }
    }
    if (albumPicturesToDelete.length) {
      await deletePicturesByIds(albumPicturesToDelete);
    }

    let bufferNeeded = false;
    for (let i = 0; i < sortedAlbumPictures.length; i++) {
      bufferNeeded = await imageNeedsBufferToRename(sortedAlbumPictures[i], i);
      if (bufferNeeded) {
        break;
      }
    }
    timeLog(`bufferNeeded=${bufferNeeded}`);
    if (bufferNeeded) {
      const bufferDir = path.join(getEnvRootCashLocation(), ".buffer");
      await promises.cp(album.fullPath, bufferDir, { force: true, recursive: true });
      for (let i = 0; i < sortedAlbumPictures.length; i++) {
        const correctFileName = getCorrectFileName(i, sortedAlbumPictures[i].fileFormat);
        if (!imageHasWrongName(sortedAlbumPictures[i], i, correctFileName)) {
          continue;
        }
        await promises.rm(sortedAlbumPictures[i].fullPath);
        const rc = await moveImageByNumber(sortedAlbumPictures[i], i, bufferDir);
        if (rc) {
          return 10;
        }
      }
    } else {
      for (let i = 0; i < sortedAlbumPictures.length; i++) {
        const correctFileName = getCorrectFileName(i, sortedAlbumPictures[i].fileFormat);
        if (!imageHasWrongName(sortedAlbumPictures[i], i, correctFileName)) {
          continue;
        }
        const rc = await moveImageByNumber(sortedAlbumPictures[i], i);
        if (rc) {
          return 10;
        }
      }
    }
  } catch (localErr) {
    timeLog(localErr);
    return 3;
  }
  return 0;
}

export async function saveNewImageFiles(
  albumDir: string,
  files: Express.Multer.File[],
  albumImagesCount: number,
  albumId: string
): Promise<Map<string, AlbumPicturesItemExport>> {
  const pictureItems = new Map<string, AlbumPicturesItemExport>();
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const originalName = Buffer.from(file.originalname, "latin1").toString("utf-8");
    const imageNumber = albumImagesCount + i;

    const fileType = file.mimetype.split("/")?.[1];
    const fileName = `${file.filename}.${fileType}`;
    const savePath = path.join(albumDir, fileName);

    const rc = await moveFile(file.path, savePath);
    if (fileType === "jpeg" || fileType === "jpg") {
      try {
        const { buffer } = await jpegRotator.rotate(savePath, {});
        await promises.writeFile(savePath, buffer);
      } catch (localErr) {
        timeLog(`Error rotating file: ${savePath}`);
      }
    }
    if (!rc) {
      pictureItems.set(originalName, {
        fileFormat: fileType,
        fileName,
        album: new mongoose.Types.ObjectId(albumId),
        fullPath: savePath,
        pictureNumber: imageNumber,
        _id: new mongoose.Types.ObjectId()
      });
    }
  }
  return pictureItems;
}
