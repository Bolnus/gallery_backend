import mongoose, { InferSchemaType } from "mongoose";
import { timeLog, timeWarn } from "../../log.js";
import { handleDataBaseError } from "../database.js";
import { DocumentObjectId } from "../databaseTypes.js";
import { TagItemExport, TagsSchema } from "./types.js";

const TagsModel = mongoose.model("tag", TagsSchema);

export async function selectTags(): Promise<TagItemExport[]>
{
  try
  {
    const resObj = await TagsModel.find({ albumsCount: { $gt: 0 } }, null).sort({albumsCount: -1});
    return resObj;
  }
  catch (localErr: any)
  {
    handleDataBaseError(localErr, "selectTags");
    return [];
  }
}

export async function insertNewTag(tagName: string): Promise<number>
{
  try
  {
    await TagsModel.create({ tagName, albumsCount: 1 });
    return 0;
  }
  catch (localErr: any)
  {
    if (localErr?.code === 11000)
    {
      const rc = await updateAlbumsCount(tagName);
      return rc;
    }
    return handleDataBaseError(localErr, "insertNewTag");
  }
}

export async function updateAlbumsCount(tagName: string, addCount: number = 1): Promise<number>
{
  try
  {
    await TagsModel.findOneAndUpdate({ tagName }, {$inc : { albumsCount : addCount }});
    return 0;
  }
  catch (localErr: any)
  {
    return handleDataBaseError(localErr, "updateAlbumsCount");
  }
}

export async function deleteAllTags(): Promise<number>
{
  try
  {
    await TagsModel.deleteMany({});
    return 0;
  }
  catch (localErr)
  {
    return handleDataBaseError(localErr, "deleteAllTags");
  }
}
