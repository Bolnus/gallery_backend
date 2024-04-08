// const express = require("express");
// const axios = require("axios");
// const cors = require("cors");
// const bodyParser = require("body-parser");
// const qs = require("qs");
// const https = require("https");
// const fileSystem = require("fs");
// const aFileHandler = require("fs").promises;
// const Blob = require("buffer").Blob;

import { dirname } from "path";
import { fileURLToPath } from "url";
import Blob from "buffer";
import express, { RequestHandler, Response } from "express";
import bodyParser from "body-parser";
import qs from "qs";
import * as dotenv from "dotenv";
import { connectToDB } from "./database/database.js";
import { deleteAllAlbums, selectAlbumsList, selectAlbumsDataList } from "./database/albums/albumsCollection.js";
import { timeLog, timeWarn } from "./log.js";
import {
  imageToWebpData,
  initAllAlbums,
  fileNameToWebp,
  writeBase64DecodedFile,
  getSnapWebpFilePath,
  getFullWebpFilePath,
  fileExists,
  getEnvLocation,
} from "./fileSystem.js";
import { deleteAllTags, selectTags } from "./database/tags/tagsCollection.js";
import { deleteAllAlbumPictures, selectAlbumPictureById } from "./database/pictures/albumPicturesCollection.js";
import { selectAlbumData } from "./database/utils.js";
import { PictureSizing } from "./types.js";
import { getValidString } from "./string.js";

console.time("log");
console.time("WARN");
const fileName = fileURLToPath(import.meta.url);
const dirName = dirname(fileName);

dotenv.config();
process.chdir(dirName);
// -----CONFIG!------
const portNumber = process.env.PORT_NUMBER;
const galleryName = process.env.GALLERY_NAME || "";
const connectionString = `${process.env.DB_CONNECTION_STRING || ""}${galleryName}`;
const gallerySrcLocation = getEnvLocation(process.env.GALLERY_SRC_LOCATION || "");
const galleryCashLocation = getEnvLocation(process.env.GALLERY_CASH_LOCATION || "", galleryName);
const baseEndPoint = process.env.BASE_END_POINT || "";
const isBasicAuth = process.env.IS_BASIC_AUTH === "true";
const isHTTPS = process.env.HTTPS === "true";
const certFilePath = process.env.SSL_CRT_FILE;
const keyFilePath = process.env.SSL_KEY_FILE;
// ------------------
await connectToDB(connectionString);

// const jsonParser = bodyParser.json();
const app = express();
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
// app.use(
//   cors({
//     origin: "*",
//   })
// );

// let axiosClient = axios.create({
//   baseURL: backendAddr,
// });

function getFullTime() 
{
  const date = new Date();
  return (
    String("00" + date.getHours()).slice(-2) +
    ":" +
    String("00" + date.getMinutes()).slice(-2) +
    ":" +
    String("00" + date.getSeconds()).slice(-2)
  );
}

function handleError(error: any, res: Response) 
{
  timeWarn(`Error | ${error?.code} | ${error?.status}`);
  console.log(error)
  return res.sendStatus(400);
}

app.get("/", function (req, res) 
{
  timeLog("GET | /");
  res.send(
    `<div 
    style='background: #36383F; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    width: 100%; 
    height: 100%; 
    font-size: 3em; 
    color: white;'
    >
    Reverse proxy working...
    </div>`
  );
});

app.get(`${baseEndPoint}/albums_list`, (async function (
  req: express.Request,
  res: express.Response
): Promise<void> 
{
  timeLog(`GET | ${req.path}?${qs.stringify(req.query, { format : "RFC3986" })}`);

  let pageNumber = Number(req.query?.page);
  let pageSize = Number(req.query?.size);
  const tagsString = req.query?.tags;
  const searchName = getValidString(req.query?.name);
  let tagsList: string[] = [];
  if (typeof tagsString === "string")
  {
    tagsList = tagsString.split(",").map(getValidString);
  }

  if (Number.isNaN(pageNumber) || pageNumber < 1)
  {
    pageNumber = 1;
  }
  if (Number.isNaN(pageSize) || pageSize < 10 || pageSize > 100)
  {
    pageSize = 30;
  }
  const albumsListStart = (pageNumber - 1) * pageSize;
  // const albumsListEnd = albumsListStart + pageSize;

  try
  {
    const albumsList = await selectAlbumsDataList(tagsList,  searchName, albumsListStart, pageSize);
    res.json(albumsList);
  }
  catch (error)
  {
    handleError(error, res);
    return;
  }
}) as RequestHandler);

app.get(`${baseEndPoint}/albums_list/album`, (async function (
  req: express.Request,
  res: express.Response
): Promise<void> 
{
  timeLog(`GET | ${req.path}`);

  const albumId = req.query?.id;
  if (!albumId || typeof albumId !== "string")
  {
    timeWarn("No album ID!");
    res.sendStatus(400);
    return;
  }

  try
  {
    const album = await selectAlbumData(albumId);
    if (!album)
    {
      res.sendStatus(400);
      return;
    }
    res.json(album);
  }
  catch (error)
  {
    handleError(error, res);
    return;
  }
}) as RequestHandler);

app.get(`${baseEndPoint}/tags`, (async function (
  req: express.Request,
  res: express.Response
): Promise<void> 
{
  // const endpoint = baseEndPoint + req.params.endpoint;
  timeLog(`GET | ${req.path}`);

  try
  {
    const tagsList = await selectTags();
    res.json(tagsList);
  }
  catch (error)
  {
    handleError(error, res);
    return;
  }
}) as RequestHandler);

app.get(`${baseEndPoint}/albums_list/album/picture`, (async function (
  req: express.Request,
  res: express.Response
): Promise<void> 
{
  timeLog(`GET | ${req.path}${qs.stringify(req.query, { format : "RFC3986" })}`);

  const pictureId = req.query?.id;
  const sizing = req.query?.sizing as PictureSizing;
  if (!pictureId || typeof pictureId !== "string")
  {
    timeWarn("No picture ID!");
    res.sendStatus(400);
    return;
  }

  try
  {
    const albumPicture = await selectAlbumPictureById(pictureId);
    if (albumPicture?.fileFormat === ".webp" && !sizing)
    {
      res.sendFile(albumPicture.fullPath);
    }
    else if (albumPicture?.fileFormat)
    {
      let webpFilePath: string;
      if (sizing && sizing === PictureSizing.Snap)
      {
        webpFilePath = getSnapWebpFilePath(albumPicture.fullPath).replace(gallerySrcLocation, galleryCashLocation);
      }
      else
      {
        webpFilePath = getFullWebpFilePath(albumPicture.fullPath).replace(gallerySrcLocation, galleryCashLocation);
      }
      const webpExists = await fileExists(webpFilePath);
      if (!webpExists)
      {
        const webpImageData = await imageToWebpData(albumPicture.fullPath, webpFilePath, sizing); // 
        if (!webpImageData)
        {
          res.status(400).send("Imagemin conversion error");
          return;
        }
      }
      
      res.sendFile(webpFilePath);
      // res.set("Content-Type", "image/webp");
      // res.set("Content-Disposition", `attachment; filename=${encodeURI(fileNameToWebp(albumPicture.fileName))}`);
      // res.send(webpImageData);
    }
    else
    {
      timeWarn(`No picture found for id=${pictureId}`);
      res.sendStatus(400);
    }
  }
  catch (error)
  {
    handleError(error, res);
    return;
  }
}) as RequestHandler);

app.post(
  `${baseEndPoint}/albums_list/album`,
  (async function (
    req: express.Request,
    res: express.Response
  ): Promise<void> 
  {
    // const endpoint = baseEndPoint + req.params.endpoint;
    timeLog(`POST | ${req.path}`);

    try
    {
      await writeBase64DecodedFile(
        req.body?.params?.Data,
        req.body?.params?.Name,
        dirName
      );
      res.sendStatus(200);
    }
    catch (error)
    {
      handleError(error, res);
    }
  }
) as RequestHandler);

app.post(
  `${baseEndPoint}/init`,
  (async function (
    req: express.Request,
    res: express.Response
  ): Promise<void> 
  {
    timeLog(`POST | ${req.path}`);

    try
    {
      await deleteAllAlbums();
      await deleteAllTags();
      await deleteAllAlbumPictures();
      const rc = await initAllAlbums(gallerySrcLocation);
      timeLog("INIT FINISHED");
      if (rc === -1)
      {
        res.sendStatus(400);
        return;
      }
      res.sendStatus(200);
      return;
    }
    catch (localErr)
    {
      timeWarn("Error dropping collections:");
      console.log(localErr);
      res.sendStatus(400);
    }
  }
) as RequestHandler);

app.get(":endpoint([\\/\\w\\.-\\?\\=]*)", (function (req, res): void 
{
  timeLog(`GET | ${req.params.endpoint}`);

  try
  {
    res.status(404).send(
      `<div 
      style='background: #36383F; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      width: 100%; height: 100%; 
      font-size: 3em; color: white;'
      >
      404: ${req.params.endpoint}
      </div>`
    );
    return;
  }
  catch (error)
  {
    handleError(error, res);
    return;
  }
}) as RequestHandler);

// app.post(":endpoint([\\/\\w\\.-\\?\\=]*)", async function (req, res) {
//   let endpoint = backendAddr + baseEndPoint + req.params.endpoint;
//   console.log("POST | " + getFullTime() + " | " + endpoint);

//   const httpConfig = getHTTPConfig(req);
//   const queryParams = getQueryString(req);

//   try {
//     const backendResponse = await axiosClient.post(
//       baseEndPoint + req.params.endpoint + queryParams,
//       req.body,
//       httpConfig
//     );
//     //console.log(backendResponse.body);
//     res.json(backendResponse.data);
//   } catch (error) {
//     return handleError(error, res);
//   }
// });

if (isHTTPS)
{
  // const serverOptions = {
  //   key: String(fileSystem.readFileSync(keyFilePath)),
  //   cert: String(fileSystem.readFileSync(certFilePath)),
  // };
  // const httpsServer = https.createServer(serverOptions, app);
  // httpsServer.listen(portNumber, function () {
  //   console.log("HTTPS Listening to port:" + portNumber);
  // });
}
else
{
  timeLog("HTTP Listening to port:" + portNumber);
  app.listen(portNumber);
}
