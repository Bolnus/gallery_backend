import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { MongoDBStore as RateLimitMongoStore } from "@iroomit/rate-limit-mongodb";
import { getEnvConnectionString, getEnvGalleryName } from "../env.js";

export function getLimiterMiddleware(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 6,
    legacyHeaders: false,
    message: {
      title: "Login timeout",
      message: "Too many requests, banned by login service for 5 minutes."
    },
    store: new RateLimitMongoStore({
      uri: `${getEnvConnectionString()}${getEnvGalleryName()}`
      // authSource: getEnvGalleryName()
      // connectionOptions: {  }
    })
  });
}
