import { AwsCredentialIdentity } from "@smithy/types";
import { getEnvLocation } from "./fileSystem.js";

export function getEnvPortNumber(): string {
  return process.env.PORT_NUMBER || "";
}

export function getEnvGalleryName(): string {
  return process.env.GALLERY_NAME || "";
}

export function getEnvConnectionString(): string {
  return `${process.env.DB_CONNECTION_STRING || ""}${getEnvGalleryName()}`;
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
