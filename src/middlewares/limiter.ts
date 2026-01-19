import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import mongoose from "mongoose";
import { MongoDBStoreOptions, MongoDBStore as RateLimitMongoStore } from "@iroomit/rate-limit-mongodb";
import { getEnvConnectionString, getEnvGalleryName } from "../env.js";
import { timeLog } from "../log.js";

export function getLimiterMiddleware(dbClient: typeof mongoose): RateLimitRequestHandler {
  const connectionString = `${getEnvConnectionString()}${getEnvGalleryName()}`;
  const collection = dbClient.connection.db?.collection("rate_limits");
  let config: MongoDBStoreOptions;
  if (collection) {
    config = {
      collection
    };
  } else {
    timeLog(`Limiter connect: ${connectionString}`);
    config = {
      uri: connectionString
    };
  }
  return rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 6,
    legacyHeaders: false,
    message: {
      title: "Login timeout",
      message: "Too many requests, banned by login service for 5 minutes."
    },
    store: new RateLimitMongoStore(config)
  });
}
