import { removeS3Dir } from "./api/s3storage.js";
import { getEnvGalleryCashLocation, getEnvGallerySrcLocation, getEnvS3BaseUrl } from "./env.js";
import { getJoindedPath, getRenameFilePath, getWebpAlbumDir, getWebpFilePath, removePath } from "./fileSystem.js";
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

export function clearAlbumCache(albumPath: string): Promise<number> {
  if (getEnvS3BaseUrl()) {
    const s3AlbumCashLocation = getWebpAlbumDirCommon(albumPath, PictureSizing.Snap);
    return removeS3Dir(s3AlbumCashLocation);
  }
  const gallerySrcLocation = getEnvGallerySrcLocation();
  const galleryCashLocation = getEnvGalleryCashLocation();
  return removePath(albumPath.replace(gallerySrcLocation, galleryCashLocation), {
    recursive: true,
    force: true
  });
}
