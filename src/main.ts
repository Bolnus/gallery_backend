import { dirname } from "path";
import { fileURLToPath } from "url";
import express, { RequestHandler, Response } from "express";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import multer from "multer";
import { connectToDB } from "./database/database.js";
import { timeLog, timeWarn } from "./log.js";
import { getStatus, initAlbumsRequest, notFoundRequest } from "./requests/commonRequests.js";
import {
  deleteAlbumRequest,
  getAlbumHeadersRequest,
  getAlbumRequest,
  getAlbumsListRequest,
  postAlbumRequest,
  putAlbumHeadersRequest
} from "./requests/albums/albumsRequests.js";
import {
  getEnvBaseEndpoint,
  getEnvConnectionString,
  getEnvIsHTTPS,
  getEnvPortNumber,
  getEnvRootCashLocation
} from "./env.js";
import { deleteTagRequest, getTagsRequest } from "./requests/tags/tagsRequests.js";
import { getPictureRequest, postPicturesRequest, putPicturesRequest } from "./requests/pictures/picturesRequests.js";
import { GetAlbumQuery, GetAlbumsListQuery } from "./requests/albums/types.js";
import { QueryRequestHandler } from "./types.js";
import { copyS3File, fileExistsInS3, initS3Client, listObjectsInS3Dir } from "./api/s3storage.js";
import { getCommonJoindedPath } from "./fileRouter.js";

console.time("log");
console.time("WARN");
const fileName = fileURLToPath(import.meta.url);
const dirName = dirname(fileName);

dotenv.config();
process.chdir(dirName);

// ------------------
await connectToDB(getEnvConnectionString());
initS3Client();
const baseEndPoint = getEnvBaseEndpoint();

// const jsonParser = bodyParser.json();
const app = express();
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));

const upload = multer({
  dest: getEnvRootCashLocation(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 50
  }
});

app.get("/", getStatus);
app.post(`${baseEndPoint}/init`, initAlbumsRequest as RequestHandler);
app.get(`${baseEndPoint}/tags`, getTagsRequest as RequestHandler);
app.get(`${baseEndPoint}/albums_list`, getAlbumsListRequest as QueryRequestHandler<GetAlbumsListQuery>);
app.get(`${baseEndPoint}/albums_list/album`, getAlbumRequest as QueryRequestHandler<GetAlbumQuery>);
app.post(`${baseEndPoint}/albums_list/album`, postAlbumRequest as RequestHandler);
app.delete(`${baseEndPoint}/albums_list/album`, deleteAlbumRequest as RequestHandler);
app.put(`${baseEndPoint}/albums_list/album/headers`, putAlbumHeadersRequest as RequestHandler);
app.get(`${baseEndPoint}/albums_list/album/headers`, getAlbumHeadersRequest as RequestHandler);
app.get(`${baseEndPoint}/albums_list/album/picture`, getPictureRequest as RequestHandler);
app.post(`${baseEndPoint}/albums_list/album/picture`, upload.array("images"), postPicturesRequest as RequestHandler);
app.put(`${baseEndPoint}/albums_list/album/picture`, putPicturesRequest as RequestHandler);
app.delete(`${baseEndPoint}/tags`, deleteTagRequest as RequestHandler);
app.get(":endpoint([\\/\\w\\.-\\?\\=]*)", notFoundRequest);

if (getEnvIsHTTPS()) {
  // const serverOptions = {
  //   key: String(fileSystem.readFileSync(keyFilePath)),
  //   cert: String(fileSystem.readFileSync(certFilePath)),
  // };
  // const httpsServer = https.createServer(serverOptions, app);
  // httpsServer.listen(portNumber, function () {
  //   console.log("HTTPS Listening to port:" + portNumber);
  // });
} else {
  const portNumber = getEnvPortNumber();
  timeLog(`HTTP Listening to port: ${portNumber}`);
  app.listen(portNumber);
}

// console.log(new URL('//Test10%20Server/.webpSnap/pic_0002.webp', 'https://127.0.0.1'))

export default app;
