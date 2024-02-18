import mongoose, { Document, HydratedDocument, InferSchemaType, Mongoose, Schema } from "mongoose";
// import { AlbumsListItem } from "../databaseTypes.js";
import { timeLog, timeWarn } from "../log.js";
import { handleDataBaseError } from "./database.js";
import { selectAlbumTags } from "./tagAlbumsCollection.js";
import { DocumentObjectId } from "./databaseTypes.js";

const AlbumsListSchema = new mongoose.Schema({
  // _id: { type: Schema.Types.ObjectId, unique: true }, // required: true, 
  albumName: { type: String, required: true, unique: true },
  fullPath: { type: String, required: true, unique: true },
  albumSize: { type: Number, required: true },
  changedDate: { type: String, required: true },
});

export type AlbumsListItem = InferSchemaType<typeof AlbumsListSchema>;
export type AlbumsListItemExport = Omit<AlbumsListItem & DocumentObjectId, "fullPath">

const AlbumsListModel = mongoose.model("album", AlbumsListSchema);

export async function selectAlbumsList(start: number = 0, end: number = 50): Promise<AlbumsListItemExport[]>
{
  if (start >= end)
  {
    timeWarn(`start ${start} >= end ${end}`);
    return [];
  }
  try
  {
    const albumListItems = await AlbumsListModel.find({}, [
      "_id",
      "albumName",
      "albumSize",
      "changedDate"
    ]).sort({changedDate: -1}).skip(start).limit(end);
    return albumListItems;
  }
  catch (localErr: any)
  {
    handleDataBaseError(localErr, "selectAlbumsList");
    return [];
  }
}

export async function selectAlbumById(albumId: string): Promise<AlbumsListItemExport | null>
{
  try
  {
    const album = await AlbumsListModel.findById(albumId);
    return album;
  }
  catch (localErr)
  {
    handleDataBaseError(localErr, "selectAlbumPictureById");
    return null;
  }
}

export async function insertAlbum(albumListItem: AlbumsListItem): Promise<mongoose.Types.ObjectId | null>
{
  try
  {
    const createdAlbum = await AlbumsListModel.create(albumListItem);
    return createdAlbum?._id;
  }
  catch (localErr)
  {
    handleDataBaseError(localErr, "insertAlbum");
    return null;
  }
}

export async function deleteAllAlbums(): Promise<number>
{
  try
  {
    await AlbumsListModel.deleteMany({});
    return 0;
  }
  catch (localErr)
  {
    return handleDataBaseError(localErr, "deleteAllAlbums");
  }
}
