import { RequestHandler } from "express";

export enum PictureSizing {
  Snap = "snap",
  ExtraReduced = "extra-reduced",
  Original = ""
}

export interface HttpError {
  rc: number;
  message: string;
}

export const SnapFileSize = 16000;
export const ImagesClientCacheTime = 60 * 60 * 24 * 10;

export type QueryRequestHandler<T> = RequestHandler<unknown, unknown, unknown, T>;
