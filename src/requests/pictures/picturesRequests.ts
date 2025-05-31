import express from "express";
import qs from "qs";
import { timeLog, timeWarn } from "../../log.js";
import { handleError } from "../commonRequests.js";
import {
  fileExists,
  getFullWebpFilePath,
  getSnapWebpFilePath,
  imageToWebpData
} from "../../fileSystem.js";
import { AlbumPicturesItemExport } from "../../database/pictures/types.js";
import { ImagesClientCacheTime, PictureSizing } from "../../types.js";
import { insertManyAlbumPictures, selectAlbumPictureById } from "../../database/pictures/albumPicturesCollection.js";
import { getEnvGalleryCashLocation, getEnvGallerySrcLocation, getEnvRootCashLocation } from "../../env.js";
import { selectAlbumById, updateAlbumSizeById } from "../../database/albums/albumsCollection.js";
import { arrangeImageFiles, parsePostPicturesBody, parsePutPicturesBody, saveNewImageFiles } from "./utils.js";

export async function getPictureRequest(req: express.Request, res: express.Response): Promise<void> {
  timeLog(`GET | ${req.path}${qs.stringify(req.query, { format: "RFC3986" })}`);

  const pictureId = req.query?.id;
  const sizing = req.query?.sizing as PictureSizing;
  if (!pictureId || typeof pictureId !== "string") {
    timeWarn("No picture ID!");
    res.sendStatus(400);
    return;
  }

  try {
    const albumPicture = await selectAlbumPictureById(pictureId);
    const gallerySrcLocation = getEnvGallerySrcLocation();
    const galleryCashLocation = getEnvGalleryCashLocation();
    if (albumPicture?.fileFormat === ".webp" && !sizing) {
      res.sendFile(albumPicture.fullPath);
    } else if (albumPicture?.fileFormat) {
      let webpFilePath: string;
      if (sizing && sizing === PictureSizing.Snap) {
        webpFilePath = getSnapWebpFilePath(albumPicture.fullPath).replace(gallerySrcLocation, galleryCashLocation);
      } else {
        webpFilePath = getFullWebpFilePath(albumPicture.fullPath).replace(gallerySrcLocation, galleryCashLocation);
      }
      // const webpFileSize = await getFileSize(webpFilePath);
      const webpExists = await fileExists(webpFilePath);
      if (!webpExists) {
        const webpImageData = await imageToWebpData(albumPicture.fullPath, webpFilePath, sizing);
        if (!webpImageData) {
          res.status(500).send("Imagemin conversion error");
          return;
        }
      }
      // else if (sizing === PictureSizing.Snap && webpFileSize > SnapFileSize)
      // {
      //   const webpImageData = await imageToWebpData(webpFilePath, webpFilePath, PictureSizing.ExtraReduced);
      //   if (!webpImageData)
      //   {
      //     res.status(400).send("Imagemin conversion error");
      //     return;
      //   }
      // }

      res.set("Cache-Control", `private, max-age=${ImagesClientCacheTime}`);
      res.sendFile(webpFilePath);
      // res.set("Content-Type", "image/webp");
      // res.set("Content-Disposition", `attachment; filename=${encodeURI(fileNameToWebp(albumPicture.fileName))}`);
      // res.send(webpImageData);
    } else {
      timeWarn(`No picture found for id=${pictureId}`);
      res.sendStatus(404);
    }
  } catch (error) {
    handleError(error, res);
    return;
  }
}

export async function postPicturesRequest(
  req: express.Request<unknown, unknown, Record<string, unknown>>,
  res: express.Response
): Promise<void> {
  timeLog(`POST | ${req.path}`);

  const body = parsePostPicturesBody(req.body, res);
  if (!body) {
    res.status(400).json({
      title: "No album id!",
      message: "No album id."
    });
    return;
  }

  try {
    if (!Array.isArray(req.files)) {
      res.status(400).json({
        title: "No files!",
        message: "No image files found."
      });
      return;
    }
    const album = await selectAlbumById(body.albumId);
    if (!album) {
      res.status(404).json({
        title: "No album!",
        message: "No album found by id."
      });
      return;
    }
    const savedPictureItems: Map<string, AlbumPicturesItemExport> = await saveNewImageFiles(
      album.fullPath,
      req.files,
      album.albumSize,
      body.albumId
    );
    if (!savedPictureItems.size) {
      res.status(400).json({
        title: "Save error",
        message: "File system save error"
      });
      return;
    }
    const savedIds = await insertManyAlbumPictures(Array.from(savedPictureItems.values()));
    const resultIdsMap = new Map<string, string>();
    for (const [fileName, albumPic] of Array.from(savedPictureItems)) {
      if (savedIds.find((savedId) => albumPic._id === savedId)) {
        resultIdsMap.set(fileName, albumPic._id.toString());
      }
    }

    res.status(200).json({ imageIds: Array.from(resultIdsMap) });
  } catch (error) {
    handleError(error, res);
    return;
  }
}

export async function putPicturesRequest(
  req: express.Request<unknown, unknown, Record<string, unknown>>,
  res: express.Response
): Promise<void> {
  timeLog(`PUT | ${req.path}`);

  const body = parsePutPicturesBody(req.body, res);
  if (!body) {
    res.status(400).json({
      title: "No album id!",
      message: "No album id."
    });
    return;
  }

  try {
    const rc = await arrangeImageFiles(body.imageIds, body.albumId);
    if (rc === 404) {
      res.status(404).json({
        title: "Incorrect ids!",
        message: "Incorrect ids for album or pictures."
      });
      return;
    }
    if (rc) {
      timeLog(`Error arranging images = ${rc}`);
      res.status(400).json({
        title: "Error arranging images!",
        message: "Error arranging images."
      });
      return;
    }
    res.sendStatus(200);
  } catch (error) {
    handleError(error, res);
    return;
  }
}
