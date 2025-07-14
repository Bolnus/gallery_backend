import { removeS3Dir } from "./api/s3storage.js";
import { getEnvGalleryCashLocation, getEnvGallerySrcLocation, getEnvS3BaseUrl } from "./env.js";
import { getJoindedPath, getRenameFilePath, getWebpAlbumDir, getWebpFilePath, removePath } from "./fileSystem.js";
import { timeLog, timeWarn } from "./log.js";
import { PictureSizing } from "./types.js";

export function getCommonJoindedPath(...paths: string[]): string {
  if (getEnvS3BaseUrl()) {
    const newPaths = getJoindedPath(...paths);
    return newPaths.replaceAll("\\", "/");
  }
  return getJoindedPath(...paths);
}

export function getWebpFilePathCommon(fullPath: string, sizing: PictureSizing): string {
  if (getEnvS3BaseUrl()) {
    return getWebpFilePath(fullPath, sizing).replaceAll("\\", "/");
  }
  const gallerySrcLocation = getEnvGallerySrcLocation();
  const galleryCashLocation = getEnvGalleryCashLocation();
  return getWebpFilePath(fullPath, sizing).replace(gallerySrcLocation, galleryCashLocation);
}

export function getWebpAlbumDirCommon(fullPath: string, sizing: PictureSizing): string {
  const localAlbumDir = getWebpAlbumDir(fullPath, sizing);
  return localAlbumDir.replaceAll("\\", "/");
}

export function getRenameFilePathCommon(oldPath: string, newFileName: string): string {
  const renamedLocal = getRenameFilePath(oldPath, newFileName);
  if (getEnvS3BaseUrl()) {
    return renamedLocal.replaceAll("\\", "/");
  }
  return renamedLocal;
}

export async function clearAlbumCache(albumPath: string): Promise<number> {
  if (getEnvS3BaseUrl()) {
    const s3AlbumCashLocation = getWebpAlbumDirCommon(albumPath, PictureSizing.Snap);
    timeLog(`s3AlbumCashLocation=${s3AlbumCashLocation}`);
    return removeS3Dir(s3AlbumCashLocation);
  }
  const gallerySrcLocation = getEnvGallerySrcLocation();
  const galleryCashLocation = getEnvGalleryCashLocation();
  const cashAlbumPath = albumPath.replace(gallerySrcLocation, galleryCashLocation);
  return removePath(cashAlbumPath, {
    recursive: true,
    force: true
  });
}
