import { dirname } from "path";
import { fileURLToPath } from "url";
import express, { RequestHandler } from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import bodyParser from "body-parser";
import * as dotenv from "dotenv";
import multer from "multer";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
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
import {
  getEnvBaseEndpoint,
  getEnvFrontendUrls,
  getEnvGalleryName,
  getEnvIsHTTPS,
  getEnvPortNumber,
  getEnvRootCashLocation,
  getEnvSessionSecret,
  getNodeEnv
} from "./env.js";
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
import { SESSION_ID_KEY } from "./requests/tootles/consts.js";
import { getCorsOptions } from "./corsUtils.js";

console.time("log");
console.time("WARN");
const fileName = fileURLToPath(import.meta.url);
const dirName = dirname(fileName);

dotenv.config();
process.chdir(dirName);

// ------------------
const dbClient = await connectToDB();
initS3Client();
const baseEndPoint = getEnvBaseEndpoint();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  legacyHeaders: false,
  message: {
    title: "Login timeout",
    message: "Too many requests, banned by login service for 5 minutes."
  }
});

// const jsonParser = bodyParser.json();
const app = express().disable("x-powered-by");
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  session({
    secret: getEnvSessionSecret(),
    name: SESSION_ID_KEY,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: MongoStore.create({
      client: dbClient?.connection.getClient(),
      dbName: getEnvGalleryName(),
      stringify: false,
      autoRemove: "disabled"
    }),
    cookie: {
      secure: getNodeEnv() === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "none" // "lax"
    }
  })
);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", ...getEnvFrontendUrls()],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  })
);
app.use(cors(getCorsOptions()));
app.set("trust proxy", 1);

app.options("*", cors(getCorsOptions()));

const upload = multer({
  dest: getEnvRootCashLocation(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 50
  }
});

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
  upload.array("images"),
  postPicturesRequest as RequestHandler
);
app.put(
  `${baseEndPoint}/albums_list/album/picture`,
  authMiddleware as RequestHandler,
  putPicturesRequest as RequestHandler
);
app.delete(`${baseEndPoint}/tags`, authMiddleware as RequestHandler, deleteTagRequest as RequestHandler);
app.post(`${baseEndPoint}/auth/init`, generateDefaultTootlesRequest as RequestHandler);
app.post(`${baseEndPoint}/auth/login`, authLimiter, tootleLoginRequest as RequestHandler);
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
