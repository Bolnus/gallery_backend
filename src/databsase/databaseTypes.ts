import mongoose from "mongoose";
import { AlbumsListItemExport } from "./albumsCollection.js";

export interface AlbumsListItemTest
{
  albumName: string;
  albumSize: number;
  tags: string[];
  changedDate: string;
}

export type AlbumsDataListItem = AlbumsListItemExport & { tags: string[]; pictureIds: string[] };

export interface DocumentObjectId 
{
  _id: mongoose.Types.ObjectId;
};