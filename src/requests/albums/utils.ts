import express from "express";
import { isValidStringPhrase, isValidStringTag } from "../../string.js";
import { HttpError } from "../../types.js";
import { selectAlbumPathById, updateAlbumById } from "../../database/albums/albumsCollection.js";
import { getRenameFilePath, renameFile } from "../../fileSystem.js";
import { getEnvS3BaseUrl } from "../../env.js";
import {
  selectPicturesByAlbumId,
  updateAlbumPicturesLocation
} from "../../database/pictures/albumPicturesCollection.js";
import { AlbumHeadersBody, GetAlbumQuery } from "./types.js";
import { moveS3File } from "../../api/s3storage.js";
import { getCommonJoindedPath, getRenameFilePathCommon } from "../../fileRouter.js";

export function isValidAlbumHeadersBody(
  body: unknown,
  res: express.Response,
  requireId?: boolean
): body is AlbumHeadersBody {
  const reqBody = body as AlbumHeadersBody;
  if (!reqBody?.albumName) {
    res.status(400).json({
      title: "Empty album name!",
      message: "Album name can't be empty!"
    });
    return false;
  }
  if (!isValidStringPhrase(reqBody?.albumName)) {
    res.status(400).json({
      title: "Invalid album name!",
      message: "Invalid characters found in album name!"
    });
    return false;
  }
  if (requireId && !isValidStringTag(reqBody?.id)) {
    res.status(400).json({
      title: "Invalid album id!",
      message: "Invalid characters found in album id!"
    });
    return false;
  }
  if (!Array.isArray(reqBody?.tags)) {
    res.status(400).json({
      title: "Data error!",
      message: "No tags array provided!"
    });
    return false;
  }
  for (const tag of reqBody.tags) {
    if (!isValidStringTag(tag)) {
      res.status(400).json({
        title: "Invalid tag provided!",
        message: `Invalid characters found in tag: ${tag}.`
      });
      return false;
    }
  }
  if (reqBody?.description !== undefined && typeof reqBody?.description !== "string") {
    res.status(400).json({
      title: "Data error!",
      message: "Wrong description type!"
    });
    return false;
  }
  return true;
}

export function isValidAlbumIdObject(body: unknown, res: express.Response): body is GetAlbumQuery {
  const reqBody = body as GetAlbumQuery;
  if (!reqBody?.id || typeof reqBody?.id !== "string") {
    res.status(400).json({
      title: "No album ID!",
      message: "Album ID can't be empty!"
    });
    return false;
  }
  return true;
}

export async function updateAlbumName(
  albumId: string,
  albumName: string,
  description?: string
): Promise<HttpError | null> {
  const oldAlbumPath = await selectAlbumPathById(albumId);
  const newAlbumPath = getRenameFilePathCommon(oldAlbumPath, albumName);
  if (!oldAlbumPath) {
    return {
      rc: 404,
      message: "No album found for id!"
    };
  }
  const rcAlbumUpdate = await updateAlbumById(albumId, albumName, newAlbumPath, description);
  if (rcAlbumUpdate) {
    return {
      rc: 400,
      message: "Album name is not unique!"
    };
  }
  if (getEnvS3BaseUrl()) {
    const albumPictures = await selectPicturesByAlbumId(albumId);
    for (const albumPic of albumPictures) {
      const movePicRc = await moveS3File(albumPic.fullPath, getCommonJoindedPath(newAlbumPath, albumPic.fileName));
      if (movePicRc) {
        return {
          rc: 500,
          message: "Internal rename error! Error renaming files!"
        };
      }
    }
  } else {
    const rcFolderRename = await renameFile(oldAlbumPath, newAlbumPath);
    if (rcFolderRename) {
      return {
        rc: 500,
        message: "Internal rename error! Fix may be required!"
      };
    }
  }
  const rcPicturesUpdate = await updateAlbumPicturesLocation(albumId, oldAlbumPath, newAlbumPath);
  if (rcPicturesUpdate) {
    return {
      rc: 500,
      message: "Album pictures update error!"
    };
  }

  return null;
}
