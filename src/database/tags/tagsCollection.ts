import mongoose, { InferSchemaType } from "mongoose";
import { timeLog, timeWarn } from "../../log.js";
import { handleDataBaseError } from "../database.js";
import { CountedId, TagItem, TagItemExport, TagsSchema } from "./types.js";

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

function mapTagNameToNewTag(tagName: string): TagItem
{
  return {
    tagName,
    albumsCount: 1
  };
}

export async function insertNewTags(tagNames: string[]): Promise<number>
{
  try
  {
    const tags: TagItem[] = tagNames.map(mapTagNameToNewTag);
    await TagsModel.insertMany(tags, { ordered: false });
    return 0;
  }
  catch (localErr: any)
  {
    return handleDataBaseError(localErr, "insertNewTags");
  }
}

export async function updateAlbumsCount(tagName: string, addCount: number = 1): Promise<number>
{
  try
  {
    const updatedTag = await TagsModel.findOneAndUpdate(
      { tagName },
      { $inc: { albumsCount: addCount } },
      { new: true } // return doc after update
    );
    if (!updatedTag?.albumsCount)
    {
      await TagsModel.deleteOne({ tagName });
    }
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

export async function setAllTags(tagItems: TagItem[]): Promise<number>
{
  try
  {
    await TagsModel.deleteMany({});
    await TagsModel.insertMany(tagItems);
    return 0;
  }
  catch (localErr)
  {
    return handleDataBaseError(localErr, "setAllTags");
  }
}

export async function deleteTagByName(tagName: string): Promise<number>
{
  try
  {
    await TagsModel.deleteOne({ tagName });
    return 0;
  }
  catch (localErr)
  {
    return handleDataBaseError(localErr, "deleteTagByName");
  }
}
