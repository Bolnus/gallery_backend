import { dirname } from "path";
import { fileURLToPath } from "url";
import express, { RequestHandler } from "express";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import cors from "cors";
import { connectToDB } from "./database/database.js";
import { timeLog } from "./log.js";
import { getStatus, initAlbumsRequest, notFoundRequest } from "./requests/commonRequests.js";
import {
  deleteAlbumRequest,
  getAlbumHeadersRequest,
  getAlbumRequest,
  getAlbumsListRequest,
  postAlbumRequest,
  putAlbumHeadersRequest
} from "./requests/albums/albumsRequests.js";
import { getEnvBaseEndpoint, getEnvIsHTTPS, getEnvPortNumber } from "./env.js";
import { deleteTagRequest, getTagsRequest } from "./requests/tags/tagsRequests.js";
import { getPictureRequest, postPicturesRequest, putPicturesRequest } from "./requests/pictures/picturesRequests.js";
import { GetAlbumQuery, GetAlbumsListQuery } from "./requests/albums/types.js";
import { QueryRequestHandler } from "./types.js";
import { initS3Client } from "./api/s3storage.js";
import {
  authMiddleware,
  generateDefaultTootlesRequest,
  getTootleRequest,
  tootleLoginRequest,
  tootleLogoutRequest
} from "./requests/tootles/tootlesRequests.js";
import { getCorsOptions } from "./corsUtils.js";
import { getUploadMiddleware } from "./middlewares/upload.js";
import { getLimiterMiddleware } from "./middlewares/limiter.js";
import { getSessionMiddleware } from "./middlewares/session.js";
import { getHelmetMiddleware } from "./middlewares/helmet.js";

console.time("log");
console.time("WARN");
const fileName = fileURLToPath(import.meta.url);
const dirName = dirname(fileName);

dotenv.config();
process.chdir(dirName);

// ------------------
const dbClient = await connectToDB();
if (!dbClient) {
  process.exit(1);
}
initS3Client();
const baseEndPoint = getEnvBaseEndpoint();

const app = express().disable("x-powered-by");
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(getSessionMiddleware(dbClient));
app.use(getHelmetMiddleware());
app.use(cors(getCorsOptions()));
app.set("trust proxy", 1);

app.options("*", cors(getCorsOptions()));
app.get("/", getStatus);
app.post(`${baseEndPoint}/init`, authMiddleware as RequestHandler, initAlbumsRequest as RequestHandler);
app.get(`${baseEndPoint}/tags`, getTagsRequest as RequestHandler);
app.get(`${baseEndPoint}/albums_list`, getAlbumsListRequest as QueryRequestHandler<GetAlbumsListQuery>);
app.get(`${baseEndPoint}/albums_list/album`, getAlbumRequest as QueryRequestHandler<GetAlbumQuery>);
app.post(`${baseEndPoint}/albums_list/album`, authMiddleware as RequestHandler, postAlbumRequest as RequestHandler);
app.delete(`${baseEndPoint}/albums_list/album`, authMiddleware as RequestHandler, deleteAlbumRequest as RequestHandler);
app.put(
  `${baseEndPoint}/albums_list/album/headers`,
  authMiddleware as RequestHandler,
  putAlbumHeadersRequest as RequestHandler
);
app.get(`${baseEndPoint}/albums_list/album/headers`, getAlbumHeadersRequest as RequestHandler);
app.get(`${baseEndPoint}/albums_list/album/picture/:id`, getPictureRequest as RequestHandler);
app.post(
  `${baseEndPoint}/albums_list/album/picture`,
  authMiddleware as RequestHandler,
  getUploadMiddleware().array("images"),
  postPicturesRequest as RequestHandler
);
app.put(
  `${baseEndPoint}/albums_list/album/picture`,
  authMiddleware as RequestHandler,
  putPicturesRequest as RequestHandler
);
app.delete(`${baseEndPoint}/tags`, authMiddleware as RequestHandler, deleteTagRequest as RequestHandler);
app.post(`${baseEndPoint}/auth/init`, generateDefaultTootlesRequest as RequestHandler);
app.post(`${baseEndPoint}/auth/login`, getLimiterMiddleware(dbClient), tootleLoginRequest as RequestHandler);
app.post(`${baseEndPoint}/auth/logout`, tootleLogoutRequest as RequestHandler);
app.get(`${baseEndPoint}/auth/get_user`, getTootleRequest as RequestHandler);
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
  timeLog(`HTTP Listening to port: ${portNumber}, ${process.env.NODE_ENV}`);
  app.listen(portNumber);
}

// console.log(new URL('//Test10%20Server/.webpSnap/pic_0002.webp', 'https://127.0.0.1'))

export default app;
