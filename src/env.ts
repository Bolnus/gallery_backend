import { AwsCredentialIdentity } from "@smithy/types";
import { getEnvLocation } from "./fileSystem.js";
import { Tootle } from "./database/tootles/types.js";
import { timeWarn } from "./log.js";

export function getEnvPortNumber(): string {
  return process.env.PORT_NUMBER || "";
}

export function getEnvGalleryName(): string {
  return process.env.GALLERY_NAME || "";
}

export function getEnvConnectionString(): string {
  return process.env.DB_CONNECTION_STRING || "";
}

export function getEnvGallerySrcLocation(): string {
  return getEnvLocation(process.env.GALLERY_SRC_LOCATION || "");
}

export function getEnvBaseEndpoint(): string {
  return process.env.BASE_END_POINT || "";
}

export function getEnvRootCashLocation(): string {
  return getEnvLocation(process.env.GALLERY_CASH_LOCATION || "");
}

export function getEnvGalleryCashLocation(): string {
  return getEnvLocation(process.env.GALLERY_CASH_LOCATION || "", getEnvGalleryName());
}

export function getEnvIsHTTPS(): boolean {
  return process.env.HTTPS === "true";
}

export function getEnvCertFilePath(): string {
  return process.env.SSL_CRT_FILE || "";
}

export function getEnvKeyFilePath(): string {
  return process.env.SSL_KEY_FILE || "";
}

export function getEnvS3BaseUrl(): string {
  return process.env.S3_BASE_URL || "";
}

export function getEnvS3Credentials(): AwsCredentialIdentity {
  return {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ""
  };
}

export function getEnvSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("No secret");
  }
  return secret;
}

export function getEnvDefaultTootles(): Tootle[] {
  const resultTootles: Tootle[] = [];
  try {
    const data = JSON.parse(process.env.DEFAULT_TOOTLES || "") as unknown;
    const defaultTootlesUnparsed = (data as { d?: unknown[] })?.d;

    if (Array.isArray(defaultTootlesUnparsed)) {
      for (const tootleUnparsed of defaultTootlesUnparsed) {
        const tootle = tootleUnparsed as Tootle;
        if (
          tootle?.name &&
          typeof tootle?.name === "string" &&
          tootle?.password &&
          typeof tootle?.password === "string"
        ) {
          resultTootles.push({
            name: tootle.name,
            password: tootle.password
          });
        }
      }
    }
  } catch (localErr) {
    timeWarn(localErr);
  }

  return resultTootles;
}

export function getEnvFrontendUrls(): string[] {
  try {
    const data = JSON.parse(process.env.FRONTEND_URLS || "") as unknown;
    const urls = (data as { urls?: unknown[] })?.urls;
    if (Array.isArray(urls)) {
      return urls.map(String);
    }
  } catch (localErr) {
    timeWarn(localErr);
  }
  return [];
}

export function getNodeEnv(): string {
  console.log("isProduction=", process.env.NODE_ENV === "production");
  return process.env.NODE_ENV || "";
}
