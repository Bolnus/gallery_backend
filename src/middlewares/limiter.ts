import rateLimit, { RateLimitRequestHandler } from "express-rate-limit";
import { MongoDBStore as RateLimitMongoStore } from "@iroomit/rate-limit-mongodb";
import { getEnvConnectionString, getEnvGalleryName } from "../env.js";
import { timeLog } from "../log.js";

export function getLimiterMiddleware(): RateLimitRequestHandler {
  const connectionString = `${getEnvConnectionString()}${getEnvGalleryName()}`;
  timeLog(`Limiter connect: ${connectionString}`);
  return rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 6,
    legacyHeaders: false,
    message: {
      title: "Login timeout",
      message: "Too many requests, banned by login service for 5 minutes."
    },
    store: new RateLimitMongoStore({
      uri: connectionString
      // authSource: getEnvGalleryName()
      // connectionOptions: {  }
    })
  });
}
