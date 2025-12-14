import express from "express";
import mongoose from "mongoose";
import { AlbumPicturesItem, AlbumPicturesItemExport } from "../../database/pictures/types.js";
import {
  copyPath,
  fileExists,
  fixJpegFileRotation,
  getJoindedPath,
  imageToWebpData,
  moveFile,
  removePath
} from "../../fileSystem.js";
import { timeLog, timeWarn } from "../../log.js";
import {
  deletePicturesByIds,
  insertManyAlbumPictures,
  selectPicturesByAlbumId,
  updateAlbumPictureById
} from "../../database/pictures/albumPicturesCollection.js";
import { selectAlbumById, updateAlbumSizeById } from "../../database/albums/albumsCollection.js";
import { getEnvGalleryCashLocation, getEnvRootCashLocation, getEnvS3BaseUrl } from "../../env.js";
import { clearAlbumCache, getCommonJoindedPath } from "../../fileRouter.js";
import { PictureSizing } from "../../types.js";
import {
  copyS3Dir,
  fileExistsInS3,
  moveS3File,
  putFileToS3,
  putLocalFileToS3,
  removeFileFromS3
} from "../../api/s3storage.js";
import { PostPicturesBody, PutPicturesBody } from "./types.js";

export function parsePostPicturesBody(body: Record<string, unknown>, res: express.Response): PostPicturesBody | null {
  if (!body?.albumId || typeof body?.albumId !== "string") {
    res.status(400).json({
      title: "Invalid album id!",
      message: "Invalid album id."
    });
    return null;
  }

  return {
    albumId: body.albumId
  };
}

export function parsePutPicturesBody(body: Record<string, unknown>, res: express.Response): PutPicturesBody | null {
  if (!body?.albumId || typeof body?.albumId !== "string") {
    res.status(400).json({
      title: "Invalid album id!",
      message: "Invalid album id."
    });
    return null;
  }
  if (!body?.imageIds || !Array.isArray(body.imageIds)) {
    res.status(400).json({
      title: "No image ids!",
      message: "No image ids provided."
    });
    return null;
  }
  if ((body.imageIds as string[]).find((imageId) => typeof imageId !== "string")) {
    res.status(400).json({
      title: "No image ids!",
      message: "No image ids provided."
    });
    return null;
  }
  return {
    albumId: body.albumId,
    imageIds: body.imageIds as string[]
  };
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

    const sourcefileType = file.mimetype.split("/")?.[1];
    const fileName = `${file.filename}.webp`;
    const savePath = getCommonJoindedPath(albumDir, fileName);
    const isS3 = !!getEnvS3BaseUrl();

    if (sourcefileType === "jpeg" || sourcefileType === "jpg") {
      await fixJpegFileRotation(file.path);
    }
    let rc = -1;
    if (sourcefileType === "webp") {
      if (isS3) {
        rc = await putLocalFileToS3(file.path, savePath, file.mimetype);
      } else {
        rc = await moveFile(file.path, savePath);
      }
    } else {
      const localSavePath = isS3 ? getJoindedPath(getEnvGalleryCashLocation(), albumDir, fileName) : savePath;
      const webpImageData = await imageToWebpData(file.path, localSavePath, PictureSizing.Original);
      rc = Number(!webpImageData);
      if (!rc && isS3) {
        rc = await putFileToS3(webpImageData, savePath, "image/webp");
      }
    }
    // const webpImageData = await imageToWebpData(albumPicture.fullPath, webpFilePath, sizing);
    if (!rc) {
      pictureItems.set(originalName, {
        fileFormat: "webp",
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

async function moveImageByNumber(
  albumPic: AlbumPicturesItemExport,
  imageNumber: number,
  albumPath: string,
  bufferDir?: string
): Promise<number> {
  const correctFileName = getCorrectFileName(imageNumber, albumPic?.fileFormat);
  const oldPath = bufferDir ? getCommonJoindedPath(bufferDir, albumPic.fileName) : albumPic.fullPath;
  const newPath = getCommonJoindedPath(albumPath, correctFileName);
  let rc: number;
  if (getEnvS3BaseUrl()) {
    rc = await moveS3File(oldPath, newPath);
  } else {
    rc = await moveFile(oldPath, newPath);
  }
  if (rc) {
    timeWarn(`Error move ${oldPath} -> ${newPath}`);
    return rc;
  }
  if (!bufferDir) {
    return updateAlbumPictureById(albumPic._id, newPath, correctFileName, imageNumber);
  }
  return 0;
}

export function imageHasWrongName(albumPic: AlbumPicturesItem, i: number, correctFileName: string): boolean {
  return albumPic?.fileName !== correctFileName || albumPic.pictureNumber !== i;
}

export function getCorrectFileName(imageNumber: number, fileFormat: string): string {
  return `pic_${String(imageNumber).padStart(4, "0")}.${fileFormat}`;
}

export async function imageNeedsBufferToRename(
  albumPic: AlbumPicturesItemExport,
  albumDir: string,
  i: number
): Promise<boolean> {
  const correctFileName = getCorrectFileName(i, albumPic?.fileFormat);
  if (!imageHasWrongName(albumPic, i, correctFileName)) {
    return false;
  }
  const correctFilePath = getCommonJoindedPath(albumDir, correctFileName);
  if (getEnvS3BaseUrl()) {
    return fileExistsInS3(correctFilePath);
  }
  return fileExists(correctFilePath);
}

export async function arrangeImageFiles(newAlbumImageIds: string[], albumId: string): Promise<number> {
  try {
    // Album and pictures select
    const albumPictures = await selectPicturesByAlbumId(albumId);
    const album = await selectAlbumById(albumId);
    if (!album || !album._id) {
      timeLog("No album");
      return 404;
    }
    if (!album || (!albumPictures.length && newAlbumImageIds.length)) {
      timeLog(`404 albumPictures.length=${albumPictures.length} newAlbumImageIds.length=${newAlbumImageIds.length}`);
      return 404;
    }
    const isS3 = getEnvS3BaseUrl();

    // clear cache images
    await clearAlbumCache(album.fullPath);

    // Array of image objects in the order of input ids array
    const sortedAlbumPictures: AlbumPicturesItemExport[] = [];
    for (const albumImageId of newAlbumImageIds) {
      const foundAlbumPic = albumPictures.find((albimPic) => albimPic._id.toString() === albumImageId);
      if (!foundAlbumPic) {
        timeWarn(`404: ${albumImageId}`);
        return 404;
      }
      sortedAlbumPictures.push(foundAlbumPic);
    }

    // Delete redundant image files
    const albumPicturesToDelete: mongoose.Types.ObjectId[] = [];
    for (const albumPicture of albumPictures) {
      const foundAlbumPic = newAlbumImageIds.find((albumImageId) => albumPicture._id.toString() === albumImageId);
      if (!foundAlbumPic) {
        if (isS3) {
          await removeFileFromS3(albumPicture.fullPath);
        } else {
          await removePath(albumPicture.fullPath, { force: true });
        }
        albumPicturesToDelete.push(albumPicture._id);
      }
    }

    // Whether images need to be removed first
    let bufferNeeded = false;
    for (let i = 0; i < sortedAlbumPictures.length; i++) {
      bufferNeeded = await imageNeedsBufferToRename(sortedAlbumPictures[i], album.fullPath, i);
      if (bufferNeeded) {
        break;
      }
    }
    timeLog(`bufferNeeded=${bufferNeeded}`);

    if (bufferNeeded) {
      const bufferDir = isS3
        ? getCommonJoindedPath("/.buffer", album.albumName)
        : getJoindedPath(getEnvRootCashLocation(), ".buffer", album.albumName);
      // const localBufferDir = getJoindedPath(getEnvRootCashLocation(), ".buffer", album.albumName);

      if (isS3) {
        await copyS3Dir(album.fullPath, bufferDir);
      } else {
        await copyPath(album.fullPath, bufferDir, { force: true, recursive: true });
      }

      const newPictureItems: AlbumPicturesItem[] = [];
      // Delete all album images in DB
      await deletePicturesByIds(albumPictures.map((albumPic) => albumPic._id));
      let moveRc = 0;
      for (let i = 0; i < sortedAlbumPictures.length; i++) {
        const correctFileName = getCorrectFileName(i, sortedAlbumPictures[i].fileFormat);
        newPictureItems.push({
          fileName: correctFileName,
          fullPath: getCommonJoindedPath(album.fullPath, correctFileName),
          pictureNumber: i,
          fileFormat: sortedAlbumPictures[i].fileFormat,
          album: album._id
        });
        if (!imageHasWrongName(sortedAlbumPictures[i], i, correctFileName)) {
          continue;
        }
        // if (isS3) {
        //   const rc = await moveS3ImageWithLocalBuffer(sortedAlbumPictures[i], i, album.fullPath, bufferDir);
        //   if (rc) {
        //     timeWarn("moveS3ImageWithLocalBuffer error");
        //     return 10;
        //   }
        // } else {
        // }
        // if (!isS3) {
        //   await removePath(sortedAlbumPictures[i].fullPath);
        // }
        moveRc = await moveImageByNumber(sortedAlbumPictures[i], i, album.fullPath, bufferDir);
        if (moveRc) {
          timeWarn("moveImageByNumber error");
          break;
        }
      }
      const savedIds = await insertManyAlbumPictures(newPictureItems);
      if (moveRc) {
        return moveRc;
      }
      if (savedIds.length !== newPictureItems.length) {
        timeLog("Save pictures in DB error: savedIds.length !== newPictureItems.length");
        return 4;
      }
    } else {
      // Delete redundant images in DB
      if (albumPicturesToDelete.length) {
        await deletePicturesByIds(albumPicturesToDelete);
      }
      for (let i = 0; i < sortedAlbumPictures.length; i++) {
        const correctFileName = getCorrectFileName(i, sortedAlbumPictures[i].fileFormat);
        if (!imageHasWrongName(sortedAlbumPictures[i], i, correctFileName)) {
          continue;
        }
        const rc = await moveImageByNumber(sortedAlbumPictures[i], i, album.fullPath);
        if (rc) {
          timeWarn(`Error move ${sortedAlbumPictures[i].fileName} -> ${correctFileName}`);
          return 10;
        }
      }
    }
    await updateAlbumSizeById(albumId, newAlbumImageIds.length);
  } catch (localErr) {
    timeLog(localErr);
    return 3;
  }
  return 0;
}
