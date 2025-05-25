import express from "express";
import { PostPicturesBody, PutPicturesBody, UploadImageData } from "./types.js";

function mapImageData(el: [unknown, unknown]): [string, number] {
  return [String(el?.[0]) || "", Number(el?.[1])];
}

export function parsePostPicturesBody(body: Record<string, unknown>, res: express.Response): PostPicturesBody | null {
  if (!body?.albumId || typeof body?.albumId !== "string") {
    res.status(400).json({
      title: "Invalid album id!",
      message: "Invalid album id."
    });
    return null;
  }
  
  // const imagesData = JSON.parse(body.imagesData) as [unknown, unknown][];
  // if (!Array.isArray(imagesData)) {
  //   res.status(400).json({
  //     title: "Error parsing images data!",
  //     message: "Invalid image ids."
  //   });
  //   return null;
  // }
  return {
    albumId: body.albumId
    // imagesData: new Map(imagesData.map(mapImageData))
  };
}

export function parsePutPicturesBody(body: Record<string, unknown>, res: express.Response): PutPicturesBody | null {
  if (!body?.albumId || typeof body?.albumId !== "string") {
    res.status(400).json({
      title: "Invalid album id!",
      message: "Invalid album id."
    });
    return null;
  }
  if (!body?.imageIds || !Array.isArray(body.imageIds)) {
    res.status(400).json({
      title: "No image ids!",
      message: "No image ids provided."
    });
    return null;
  }
  if ((body.imageIds as string[]).find((imageId) => typeof imageId !== "string")) {
    res.status(400).json({
      title: "No image ids!",
      message: "No image ids provided."
    });
    return null;
  }
  return {
    albumId: body.albumId,
    imageIds: body.imageIds as string[]
  };
}
