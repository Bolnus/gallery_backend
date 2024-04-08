import mongoose, { InferSchemaType } from "mongoose";
import { DocumentObjectId } from "../databaseTypes.js";

export const AlbumPicturesSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    fileFormat: { type: String, required: true },
    fullPath: { type: String, required: true, unique: true },
    pictureNumber: { type: Number, required: true },
    album: { type: mongoose.Schema.Types.ObjectId, ref: "album", required: true }
  });
  
  export type AlbumPicturesItem = InferSchemaType<typeof AlbumPicturesSchema>;
  export type AlbumPicturesItemExport = AlbumPicturesItem & DocumentObjectId;