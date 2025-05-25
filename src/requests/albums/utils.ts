import express from "express";
import { isValidStringPhrase, isValidStringTag } from "../../string.js";
import { AlbumHeadersBody, GetAlbumQuery } from "./types.js";

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
