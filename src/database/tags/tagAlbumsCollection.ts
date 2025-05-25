import mongoose, { InferSchemaType } from "mongoose";
import { timeLog, timeWarn } from "../../log.js";
import { handleDataBaseError } from "../database.js";
import { DocumentObjectId } from "../databaseTypes.js";
import { AlbumTagsItem, AlbumTagsSchema, CountedId, TagItem, TagWithId } from "./types.js";

// export type AlbumTagsItemExport = AlbumTagsItem & DocumentObjectId;

const AlbumTagsModel = mongoose.model("albumTag", AlbumTagsSchema);

export async function insertAlbumTagDependency(albumName: string, tagName: string): Promise<number> {
  try {
    await AlbumTagsModel.create({ tagName, albumName });
    return 0;
  } catch (localErr) {
    if (localErr?.code === 11000) {
      return 0;
    }
    return handleDataBaseError(localErr, "insertAlbumTagDependency");
  }
}

export async function setAllAlbumTags(albumName: string, tags: string[]): Promise<number> {
  try {
    // await AlbumTagsModel.deleteMany({ albumName });
    const albumDeps: AlbumTagsItem[] = [];
    for (const tag of tags) {
      albumDeps.push({
        albumName,
        tagName: tag
      });
    }
    await AlbumTagsModel.insertMany(albumDeps);
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "setAllAlbumTags");
  }
}

export async function deleteAllTagsForAlbum(albumName: string): Promise<number> {
  try {
    await AlbumTagsModel.deleteMany({ albumName });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteAllTagsForAlbum");
  }
}

export async function selectAlbumTags(albumName: string): Promise<TagWithId[]> {
  try {
    const resObj = await AlbumTagsModel.find({ albumName }, ["_id", "tagName"]);
    return resObj;
  } catch (localErr) {
    handleDataBaseError(localErr, "selectTags");
    return [];
  }
}

function mapCountedIdToTag(countedId: CountedId): TagItem {
  return {
    tagName: countedId._id,
    albumsCount: countedId.albumsCount
  };
}

export async function getAllTagsFromDeps(): Promise<TagItem[]> {
  try {
    const countedIds = await AlbumTagsModel.aggregate<CountedId>([
      {
        $group: {
          _id: "$tagName",
          albumsCount: { $sum: 1 }
        }
      }
    ]);
    return countedIds.map(mapCountedIdToTag);
  } catch (localErr) {
    handleDataBaseError(localErr, "initAllTagsFromDeps");
    return [];
  }
}

export async function deleteTagDependencies(tagName: string): Promise<number> {
  try {
    await AlbumTagsModel.deleteMany({ tagName });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteTagByName");
  }
}
