import mongoose, { InferSchemaType } from "mongoose";
import { DocumentObjectId } from "../databaseTypes.js";
import { TagWithId } from "../tags/types.js";

export const AlbumsListSchema = new mongoose.Schema({
  // _id: { type: Schema.Types.ObjectId, unique: true }, // required: true,
  albumName: { type: String, required: true, unique: true },
  fullPath: { type: String, required: true, unique: true },
  albumSize: { type: Number, required: true },
  changedDate: { type: String, required: true }
});
AlbumsListSchema.index({ albumName: "text" });

export type AlbumsListItem = InferSchemaType<typeof AlbumsListSchema> & Partial<DocumentObjectId>;
export type AlbumsListItemExport = Omit<AlbumsListItem, "fullPath">;

export interface AlbumsListWithTotal {
  albumsList: AlbumsListItemExport[];
  totalCount: number;
}

export type AlbumsDataListItem = AlbumsListItemExport & {
  tags: TagWithId[];
  pictureIds: string[];
};

export interface AlbumsDataWithTotal {
  albumsList: AlbumsDataListItem[];
  totalCount: number;
}

export interface AlbumsDataWithTotalObject {
  albumsList: AlbumsDataListItem[];
  totalCount: {
    count: number;
  }[];
}
