import express from "express";
import qs from "qs";
import { timeLog, timeWarn } from "../../log.js";
import { getValidString, isValidStringPhrase, isValidStringTag } from "../../string.js";
import { deleteAlbumById, selectAlbumById, selectAlbumByName, selectAlbumPathById, selectAlbumsDataList } from "../../database/albums/albumsCollection.js";
import { handleError } from "../commonRequests.js";
import {
  insertAlbumWithTags,
  selectAlbumData,
  selectAlbumHeaders,
  updateAlbumName,
  updateAlbumTags
} from "../../database/utils.js";
import { generateNewAlbumPath, removePath } from "../../fileSystem.js";
import { AlbumsListItem } from "../../database/albums/types.js";
import { GetAlbumQuery, GetAlbumsListQuery } from "./types.js";
import { isValidAlbumHeadersBody, isValidAlbumIdObject } from "./utils.js";

export async function getAlbumsListRequest(
  req: express.Request<unknown, unknown, unknown, GetAlbumsListQuery>,
  res: express.Response
): Promise<void> {
  timeLog(`GET | ${req.path}?${qs.stringify(req.query, { format: "RFC3986" })}`);

  let pageNumber = Number(req.query?.page);
  let pageSize = Number(req.query?.size);
  const tagsString = req.query?.tags;
  const searchName = getValidString(req.query?.name);
  let tagsList: string[] = [];
  if (typeof tagsString === "string") {
    tagsList = tagsString.split(",").map(getValidString);
  }

  if (Number.isNaN(pageNumber) || pageNumber < 1) {
    pageNumber = 1;
  }
  if (Number.isNaN(pageSize) || pageSize < 10 || pageSize > 50) {
    pageSize = 30;
  }
  const albumsListStart = (pageNumber - 1) * pageSize;
  // const albumsListEnd = albumsListStart + pageSize;

  try {
    const albumsList = await selectAlbumsDataList(tagsList, searchName, albumsListStart, pageSize);
    res.json(albumsList);
  } catch (error) {
    handleError(error, res);
    return;
  }
}

export async function getAlbumRequest(
  req: express.Request<unknown, unknown, unknown, GetAlbumQuery>,
  res: express.Response
): Promise<void> {
  timeLog(`GET | ${req.path}`);

  if (!isValidAlbumIdObject(req.query, res)) {
    return;
  }

  try {
    const album = await selectAlbumData(req.query.id);
    if (!album) {
      res.sendStatus(404);
      return;
    }
    res.json(album);
  } catch (error) {
    handleError(error, res);
    return;
  }
}

export async function putAlbumHeadersRequest(
  req: express.Request<unknown, unknown, unknown>,
  res: express.Response
): Promise<void> {
  // const endpoint = baseEndPoint + req.params.endpoint;
  timeLog(`PUT | ${req.path}`);

  try {
    const reqBody = req.body;
    if (!isValidAlbumHeadersBody(reqBody, res, true)) {
      return;
    }
    const album = await selectAlbumById(reqBody?.id);
    let oldAlbumName = "";
    if (album) {
      oldAlbumName = album.albumName;
    }
    if (!oldAlbumName) {
      res.status(404).json({
        title: "Data error!",
        message: "No album found."
      });
    }
    if (reqBody.albumName !== oldAlbumName) {
      const rcUpdateAlbumName = await updateAlbumName(reqBody.id, reqBody.albumName);
      if (rcUpdateAlbumName) {
        res.status(rcUpdateAlbumName.rc).json({
          title: rcUpdateAlbumName.message,
          message: rcUpdateAlbumName.message
        });
        return;
      }
    }
    const rcUpdateTags = await updateAlbumTags(oldAlbumName, reqBody.albumName, reqBody.tags);
    if (rcUpdateTags) {
      res.status(rcUpdateTags.rc).json({
        title: rcUpdateTags.message,
        message: rcUpdateTags.message
      });
      return;
    }
    res.sendStatus(200);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getAlbumHeadersRequest(req: express.Request, res: express.Response): Promise<void> {
  timeLog(`GET | ${req.path}`);

  try {
    const albumId = req.query?.id;
    if (!albumId || typeof albumId !== "string") {
      timeWarn("No album ID!");
      res.sendStatus(400);
      return;
    }
    const album = await selectAlbumHeaders(albumId);
    if (!album) {
      res.sendStatus(404);
      return;
    }
    res.json({
      _id: album._id,
      albumName: album.albumName,
      albumSize: album.albumSize,
      changedDate: album.changedDate,
      tags: album.tags
    });
  } catch (error) {
    handleError(error, res);
  }
}

export async function postAlbumRequest(
  req: express.Request<unknown, unknown, unknown>,
  res: express.Response
): Promise<void> {
  timeLog(`POST | ${req.path}`);

  try {
    const reqBody = req.body;
    if (!isValidAlbumHeadersBody(reqBody, res)) {
      return;
    }
    const foundDuplicate = await selectAlbumByName(reqBody.albumName);
    if (foundDuplicate) {
      res.status(400).json({
        title: "Album already exists!",
        message: "Album name is already in use."
      });
      return;
    }
    const fullPath = await generateNewAlbumPath(reqBody.tags, reqBody.albumName);
    if (!fullPath) {
      res.status(400).json({
        title: "Error saving album!",
        message: "Could not generate directory."
      });
      return;
    }
    const albumInfo: AlbumsListItem = {
      albumName: reqBody.albumName,
      fullPath,
      changedDate: (new Date()).toISOString(),
      albumSize: 0
    };
    const objectID = await insertAlbumWithTags(albumInfo, reqBody.tags);

    res.status(200).json({ id: String(objectID) });
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteAlbumRequest(
  req: express.Request<unknown, unknown, unknown>,
  res: express.Response
): Promise<void> {
  timeLog(`DELETE | ${req.path}?${qs.stringify(req.query, { format: "RFC3986" })}`);

  try {
    const reqData = req.query;
    if (!isValidAlbumIdObject(reqData, res)) {
      return;
    }
    const albumPath = await selectAlbumPathById(reqData.id);
    if (!albumPath) {
      res.status(404).json({
        title: "No album found by ID",
        message: "No album found by ID!"
      });
      return;
    }
    const rmRC = await removePath(albumPath);
    if (rmRC) {
      res.status(400).json({
        title: "Files delete error",
        message: "Album could not be removed due to system error!"
      });
      return;
    }
    const dbDeleteRC = await deleteAlbumById(reqData.id);
    if (dbDeleteRC) {
      res.status(400).json({
        title: "Album delete error",
        message: "Album could not be removed from DB!"
      });
      return;
    }

    res.sendStatus(200);
  } catch (error) {
    handleError(error, res);
  }
}
