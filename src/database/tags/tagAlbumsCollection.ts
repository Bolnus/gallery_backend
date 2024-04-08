import mongoose, { InferSchemaType } from "mongoose";
import { timeLog, timeWarn } from "../../log.js";
import { handleDataBaseError } from "../database.js";
import { DocumentObjectId } from "../databaseTypes.js";
import { AlbumTagsSchema, TagWithId } from "./types.js";


// export type AlbumTagsItemExport = AlbumTagsItem & DocumentObjectId;

const AlbumTagsModel = mongoose.model("albumTag", AlbumTagsSchema);

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

export async function selectAlbumTags(albumName: string): Promise<TagWithId[]>
{
  try
  {
    const resObj = await AlbumTagsModel.find({ albumName });
    return resObj;
  }
  catch (localErr: any)
  {
    handleDataBaseError(localErr, "selectTags");
    return [];
  }
}