import session from "express-session";
import { RequestHandler } from "express";
import SessionMongoStore from "connect-mongo";
import mongoose from "mongoose";
import { SESSION_ID_KEY } from "../requests/tootles/consts.js";
import { getEnvGalleryName, getEnvSessionSecret, getNodeEnv } from "../env.js";

export function getSessionMiddleware(dbClient: typeof mongoose): RequestHandler {
  return session({
    secret: getEnvSessionSecret(),
    name: SESSION_ID_KEY,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    store: SessionMongoStore.create({
      client: dbClient?.connection.getClient(),
      dbName: getEnvGalleryName(),
      stringify: false,
      autoRemove: "native"
    }),
    cookie: {
      secure: getNodeEnv() === "production",
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax" // "none"
    }
  });
}
