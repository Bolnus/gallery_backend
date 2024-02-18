import mongoose, { InferSchemaType } from "mongoose";
import { timeLog, timeWarn } from "../log.js";
import { handleDataBaseError } from "./database.js";
import { DocumentObjectId } from "./databaseTypes.js";

const AlbumTagsSchema = new mongoose.Schema({
  tagName: { type: String, required: true },
  albumName: { type: String, required: true }
});
AlbumTagsSchema.index({ tagName: 1, albumName: 1}, { unique: true });

export type AlbumTagsItem = InferSchemaType<typeof AlbumTagsSchema>;
// export type AlbumTagsItemExport = AlbumTagsItem & DocumentObjectId;

const AlbumTagsModel = mongoose.model("albumTags", AlbumTagsSchema);

export async function insertAlbumTagDependency(albumName: string, tagName: string): Promise<number>
{
  try
  {
    await AlbumTagsModel.create({ tagName, albumName });
    return 0;
  }
  catch (localErr: any)
  {
    if (localErr?.code === 11000)
    {
      return 0;
    }
    return handleDataBaseError(localErr, "insertAlbumTagDependency");
  }
}

function mapTagNames(tagObject: { tagName: string }): string
{
  return tagObject.tagName;
}

export async function selectAlbumTags(albumName: string): Promise<string[]>
{
  try
  {
    const resObj = await AlbumTagsModel.find({ albumName }).distinct("tagName");
    return resObj;
  }
  catch (localErr: any)
  {
    handleDataBaseError(localErr, "selectTags");
    return [];
  }
}