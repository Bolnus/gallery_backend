import multer from "multer";
import { getEnvRootCashLocation } from "../env.js";

export function getUploadMiddleware(): multer.Multer {
  return multer({
    dest: getEnvRootCashLocation(),
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 50
    }
  });
}
