import { CopyOptions, createWriteStream, promises, RmOptions, Stats } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import imagemin from "imagemin";
import imageminWebp, { Options } from "imagemin-webp";
import jpegRotator from "jpeg-autorotate";
import { timeLog, timeWarn } from "./log.js";
import { PictureSizing, SnapFileSize } from "./types.js";
import { getEnvGallerySrcLocation } from "./env.js";

const DIR_WEBP_FULL = ".webpFull";
const DIR_WEBP_SNAP = ".webpSnap";

export function getLowerCaseExtensionName(filePath: string): string {
  return path.extname(filePath).replace(".", "").toLowerCase();
}

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
  const baseFileName = path.basename(filePath, getLowerCaseExtensionName(filePath));
  return path.join(dirPath, `${baseFileName}webp`);
}

export function getWebpFilePath(filePath: string, sizing: PictureSizing): string {
  const dirPath = path.dirname(filePath);
  const webpDirPath = path.join(dirPath, sizing === PictureSizing.Snap ? DIR_WEBP_SNAP : DIR_WEBP_FULL);
  const baseFileName = path.basename(filePath, getLowerCaseExtensionName(filePath));
  return path.join(webpDirPath, `${baseFileName}webp`);
}

export function getWebpAlbumDir(dirPath: string, sizing: PictureSizing): string {
  const webpDirPath = path.join(dirPath, sizing === PictureSizing.Snap ? DIR_WEBP_SNAP : DIR_WEBP_FULL);
  return webpDirPath;
}

function calculateScale(fileSize: number): number {
  if (fileSize < 70000) {
    return 1;
  }
  if (fileSize < 100000) {
    return 0.9;
  }
  if (fileSize < 140000) {
    return 0.75;
  }
  if (fileSize < 260000) {
    return 0.6;
  }
  if (fileSize < 350000) {
    return 0.5;
  }
  if (fileSize < 500000) {
    return 0.2;
  }
  return 0.1;
}

export async function imageToWebpData(
  srcFilePath: string,
  desctinationFilePath: string,
  sizing: PictureSizing
): Promise<Buffer> {
  let wepbConfig: Options = {};
  if (sizing === PictureSizing.Snap) {
    const fileSize = await getFileSize(srcFilePath);
    wepbConfig = {
      quality: calculateScale(fileSize),
      method: 3
    };
  } else if (sizing === PictureSizing.ExtraReduced) {
    wepbConfig = {
      resize: {
        width: 0,
        height: 200
      },
      size: SnapFileSize,
      // quality: 1,
      method: 3
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

export function fileNameIsImage(filePath: string): boolean {
  const fileFormat = getLowerCaseExtensionName(filePath);
  return (
    fileFormat === "png" ||
    fileFormat === "jpeg" ||
    fileFormat === "jpg" ||
    fileFormat === "webp" ||
    fileFormat === "gif"
  );
}

export async function fileExists(fullPath: string): Promise<boolean> {
  try {
    await promises.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

export async function getFileSize(fullPath: string): Promise<number> {
  try {
    const fileStats = await promises.stat(fullPath);
    return fileStats.size;
  } catch {
    return 0;
  }
}

export async function getDirectoryImagesCount(directoryPath: string): Promise<number> {
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
    await promises.cp(oldPath, newPath, { force: true });
    await promises.rm(oldPath);
    return 0;
  } catch (localErr) {
    timeWarn(`File move error: ${oldPath} -> ${newPath}`);
    console.log(localErr);
    return 1;
  }
}

export async function copyPath(source: string, destination: string, opts?: CopyOptions): Promise<number> {
  try {
    await promises.cp(source, destination, opts);
    return 0;
  } catch (localErr) {
    timeWarn(`File copy error: ${source} -> ${destination}`);
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

export async function removePath(fullPath: string, options?: RmOptions): Promise<number> {
  try {
    await promises.rm(fullPath, options);
    return 0;
  } catch (localErr) {
    timeWarn(`Direcory or file remove error: ${fullPath}`);
    console.log(localErr);
    return 1;
  }
}

export function getJoindedPath(...paths: string[]): string {
  return path.join(...paths);
}

export async function fixJpegFileRotation(filePath: string): Promise<void> {
  try {
    const { buffer } = await jpegRotator.rotate(filePath, {});
    await promises.writeFile(filePath, buffer);
  } catch {
    timeLog(`Error rotating file: ${filePath}`);
  }
}

export function readDir(dirPath: string): Promise<string[]> {
  return promises.readdir(dirPath);
}

export function getFileMetadata(filePath: string): Promise<Stats> {
  return promises.stat(filePath);
}

export async function streamToFile(stream: NodeJS.ReadableStream, localFilePath: string): Promise<number> {
  try {
    await promises.mkdir(path.dirname(localFilePath), { recursive: true });
    await pipeline(stream, createWriteStream(localFilePath));
    return 0;
  } catch (localErr) {
    timeWarn("streamToFile error");
    timeLog(localErr);
    return 1;
  }
}

export async function readLocalFile(filePath: string): Promise<Buffer | null> {
  try {
    const fileBuffer = await promises.readFile(filePath);
    return fileBuffer;
  } catch (localErr) {
    timeWarn(`Error reading local file: ${filePath}`);
    timeLog(localErr);
    return null;
  }
}
