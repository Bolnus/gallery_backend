import mongoose, { InferSchemaType } from "mongoose";
import { DocumentObjectId } from "../databaseTypes.js";

export const AlbumTagsSchema = new mongoose.Schema({
  tagName: { type: String, required: true },
  albumName: { type: String, required: true }
});
AlbumTagsSchema.index({ tagName: 1, albumName: 1 }, { unique: true });

export type AlbumTagsItem = InferSchemaType<typeof AlbumTagsSchema>;

export const TagsSchema = new mongoose.Schema({
  tagName: { type: String, required: true, unique: true },
  albumsCount: { type: Number, required: true }
});

export type TagItem = InferSchemaType<typeof TagsSchema>;
export type TagItemExport = TagItem & DocumentObjectId;
export type TagWithId = Omit<TagItem & DocumentObjectId, "albumsCount">;

export interface CountedId {
  _id: string;
  albumsCount: number;
}
