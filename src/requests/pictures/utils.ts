import express from "express";
import mongoose from "mongoose";
import { AlbumPicturesItemExport } from "../../database/pictures/types.js";
import {
  copyPath,
  fixJpegFileRotation,
  getCorrectFileName,
  getJoindedPath,
  imageHasWrongName,
  imageNeedsBufferToRename,
  moveFile,
  removePath
} from "../../fileSystem.js";
import { timeLog } from "../../log.js";
import {
  deletePicturesByIds,
  selectPicturesByAlbumId,
  updateAlbumPictureById
} from "../../database/pictures/albumPicturesCollection.js";
import { selectAlbumById, updateAlbumSizeById } from "../../database/albums/albumsCollection.js";
import { getEnvGalleryCashLocation, getEnvGallerySrcLocation, getEnvRootCashLocation } from "../../env.js";
import { PostPicturesBody, PutPicturesBody } from "./types.js";

function mapImageData(el: [unknown, unknown]): [string, number] {
  return [String(el?.[0]) || "", Number(el?.[1])];
}

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

    const fileType = file.mimetype.split("/")?.[1];
    const fileName = `${file.filename}.${fileType}`;
    const savePath = getJoindedPath(albumDir, fileName);

    const rc = await moveFile(file.path, savePath);
    if (fileType === "jpeg" || fileType === "jpg") {
      await fixJpegFileRotation(savePath);
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

async function moveImageByNumber(
  albumPic: AlbumPicturesItemExport,
  imageNumber: number,
  oldDir?: string
): Promise<number> {
  const correctFileName = getCorrectFileName(imageNumber, albumPic?.fileFormat);
  const oldPath = oldDir ? getJoindedPath(oldDir, albumPic.fileName) : albumPic.fullPath;
  const newPath = albumPic.fullPath.replace(albumPic.fileName, correctFileName);
  const rc = await moveFile(oldPath, newPath);
  if (rc) {
    return rc;
  }
  return updateAlbumPictureById(albumPic._id, newPath, correctFileName, imageNumber);
}

export async function arrangeImageFiles(albumImageIds: string[], albumId: string): Promise<number> {
  try {
    // Album and pictures select
    const albumPictures = await selectPicturesByAlbumId(albumId);
    const album = await selectAlbumById(albumId);
    if (!album || (!albumPictures.length && albumImageIds.length)) {
      timeLog(album);
      return 404;
    }

    // Remove cash images
    const gallerySrcLocation = getEnvGallerySrcLocation();
    const galleryCashLocation = getEnvGalleryCashLocation();
    await removePath(album.fullPath.replace(gallerySrcLocation, galleryCashLocation), { recursive: true, force: true });

    // Array of image objects in the order of input ids array
    const sortedAlbumPictures: AlbumPicturesItemExport[] = [];
    for (const albumImageId of albumImageIds) {
      const foundAlbumPic = albumPictures.find((albimPic) => albimPic._id.toString() === albumImageId);
      if (!foundAlbumPic) {
        timeLog(albumImageId);
        return 404;
      }
      sortedAlbumPictures.push(foundAlbumPic);
    }

    // Delete redundant image files
    const albumPicturesToDelete: mongoose.Types.ObjectId[] = [];
    for (const albumPicture of albumPictures) {
      const foundAlbumPic = albumImageIds.find((albumImageId) => albumPicture._id.toString() === albumImageId);
      if (!foundAlbumPic) {
        await removePath(albumPicture.fullPath, { force: true });
        albumPicturesToDelete.push(albumPicture._id);
      }
    }
    // Delete redundant images in DB
    if (albumPicturesToDelete.length) {
      await deletePicturesByIds(albumPicturesToDelete);
    }

    // Whether images need to be removed first
    let bufferNeeded = false;
    for (let i = 0; i < sortedAlbumPictures.length; i++) {
      bufferNeeded = await imageNeedsBufferToRename(sortedAlbumPictures[i], i);
      if (bufferNeeded) {
        break;
      }
    }
    timeLog(`bufferNeeded=${bufferNeeded}`);

    if (bufferNeeded) {
      const bufferDir = getJoindedPath(getEnvRootCashLocation(), ".buffer");
      await copyPath(album.fullPath, bufferDir, { force: true, recursive: true });
      for (let i = 0; i < sortedAlbumPictures.length; i++) {
        const correctFileName = getCorrectFileName(i, sortedAlbumPictures[i].fileFormat);
        if (!imageHasWrongName(sortedAlbumPictures[i], i, correctFileName)) {
          continue;
        }
        await removePath(sortedAlbumPictures[i].fullPath);
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
    await updateAlbumSizeById(albumId, albumImageIds.length);
  } catch (localErr) {
    timeLog(localErr);
    return 3;
  }
  return 0;
}
