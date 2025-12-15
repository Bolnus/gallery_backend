import { CorsOptions } from "cors";
import { getEnvFrontendUrls } from "./env.js";
import { timeWarn } from "./log.js";

let allowedOrigins: string[];

function isValidOrigin(
  requestOrigin: string | undefined,
  callback: (err: Error | null, origin?: string | boolean) => void
): void {
  if (!allowedOrigins) {
    allowedOrigins = getEnvFrontendUrls();
  }
  if (!requestOrigin) {
    callback(null, allowedOrigins[0] || true);
    return;
  }

  if (allowedOrigins.indexOf(requestOrigin) === -1) {
    timeWarn(`CORS error ${requestOrigin}`);
    const msg = "The CORS policy for this site does not allow access from the specified Origin.";
    callback(new Error(msg), false);
    return;
  }
  callback(null, requestOrigin);
}

export function getCorsOptions(): CorsOptions {
  return {
    origin: isValidOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  };
}
