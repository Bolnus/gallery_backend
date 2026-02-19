import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import mongoose from "mongoose";
import { MongoDBStoreOptions, MongoDBStore as RateLimitMongoStore } from "@iroomit/rate-limit-mongodb";
import { getEnvConnectionString, getEnvGalleryName } from "../env.js";
import { timeLog, timeWarn } from "../log.js";

export function getLimiterMiddleware(
  collection?: mongoose.mongo.Collection<mongoose.mongo.BSON.Document>
): RateLimitRequestHandler {
  const connectionString = `${getEnvConnectionString()}${getEnvGalleryName()}`;
  let config: MongoDBStoreOptions;
  if (collection) {
    config = {
      collection,
      createTtlIndex: true,
      resetExpireDateOnChange: true
    };
  } else {
    timeLog(`Limiter connect: ${connectionString}`);
    config = {
      uri: connectionString,
      createTtlIndex: true,
      resetExpireDateOnChange: true
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

export async function getRateLimitCollection(
  dbClient: mongoose.Mongoose
): Promise<mongoose.mongo.Collection<mongoose.mongo.BSON.Document> | undefined> {
  try {
    const rateLimitCollection = dbClient.connection.db?.collection("rate_limits");
    if (rateLimitCollection) {
      await rateLimitCollection.createIndex({ expirationDate: 1 }, { expireAfterSeconds: 0 });
    }
    return rateLimitCollection;
  } catch (localError) {
    timeWarn("Error creating rate limit collection");
    console.log(localError);
    return undefined;
  }
}
