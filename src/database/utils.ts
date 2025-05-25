import mongoose from "mongoose";
import { getRenameFilePath, renameFile } from "../fileSystem.js";
import { HttpError } from "../types.js";
import { timeWarn } from "../log.js";
import { selectPictureIdsByAlbumId, updateAlbumPicturesLocation } from "./pictures/albumPicturesCollection.js";
import { insertAlbum, selectAlbumById, selectAlbumPathById, updateAlbumNameById } from "./albums/albumsCollection.js";
import {
  deleteAllTagsForAlbum,
  insertAlbumTagDependency,
  selectAlbumTags,
  setAllAlbumTags
} from "./tags/tagAlbumsCollection.js";
import { AlbumsDataListItem, AlbumsListItem } from "./albums/types.js";
import { insertNewTag, updateAlbumsCount } from "./tags/tagsCollection.js";

// export async function selectAlbumsDataListLegacy(
//   albumsListStart: number = 0,
//   albumsListEnd: number = 50
// ): Promise<AlbumsDataWithTotal> {
//   const albumsListWithTotal = await selectAlbumsList(albumsListStart, albumsListEnd);
//   const exportAlbumListItems: AlbumsDataListItem[] = [];
//   for (const albumListItem of albumsListWithTotal.albumsList) {
//     const albumTags = await selectAlbumTags(albumListItem.albumName);
//     const albumPictures = await selectPicturesByAlbumId(albumListItem._id.toString(), 6);
//     exportAlbumListItems.push({
//       _id: albumListItem._id,
//       albumName: albumListItem.albumName,
//       albumSize: albumListItem.albumSize,
//       changedDate: albumListItem.changedDate,
//       tags: albumTags,
//       pictureIds: albumPictures
//     });
//   }
//   return {
//     albumsList: exportAlbumListItems,
//     totalCount: albumsListWithTotal.totalCount
//   };
// }

export async function selectAlbumData(albumId: string): Promise<AlbumsDataListItem | null> {
  const album = await selectAlbumById(albumId);
  if (!album) {
    return null;
  }
  const albumTags = await selectAlbumTags(album.albumName);
  const albumPictures = await selectPictureIdsByAlbumId(albumId);
  const exportAlbumData: AlbumsDataListItem = {
    _id: album._id,
    albumName: album.albumName,
    albumSize: album.albumSize,
    changedDate: album.changedDate,
    tags: albumTags,
    pictureIds: albumPictures
  };
  return exportAlbumData;
}

export async function selectAlbumHeaders(albumId: string): Promise<AlbumsDataListItem | null> {
  const album = await selectAlbumById(albumId);
  if (!album) {
    return null;
  }
  const albumTags = await selectAlbumTags(album.albumName);
  const exportAlbumData: AlbumsDataListItem = {
    _id: album._id,
    albumName: album.albumName,
    albumSize: album.albumSize,
    changedDate: album.changedDate,
    tags: albumTags,
    pictureIds: []
  };
  return exportAlbumData;
}

export function mapTagNames(tagObject: { tagName: string }): string {
  return tagObject.tagName;
}

export async function updateAlbumName(albumId: string, albumName: string): Promise<HttpError | null> {
  const oldAlbumPath = await selectAlbumPathById(albumId);
  const newAlbumPath = getRenameFilePath(oldAlbumPath, albumName);
  if (!oldAlbumPath) {
    return {
      rc: 404,
      message: "No album found for id!"
    };
  }
  const rcAlbumUpdate = await updateAlbumNameById(albumId, albumName, newAlbumPath);
  if (rcAlbumUpdate) {
    return {
      rc: 400,
      message: "Album name is not unique!"
    };
  }
  const rcFolderRename = await renameFile(oldAlbumPath, newAlbumPath);
  if (rcFolderRename) {
    return {
      rc: 500,
      message: "Internal rename error! Fix may be required!"
    };
  }
  const rcPicturesUpdate = await updateAlbumPicturesLocation(albumId, oldAlbumPath, newAlbumPath);
  if (rcPicturesUpdate) {
    return {
      rc: 500,
      message: "Album pictures update error!"
    };
  }

  return null;
}

export async function updateAlbumTags(
  oldAlbumName: string,
  newAlbumName: string,
  tags: string[]
): Promise<HttpError | null> {
  const oldTags = (await selectAlbumTags(oldAlbumName)).map(mapTagNames);
  for (const tagName of oldTags) {
    await updateAlbumsCount(tagName, -1);
  }
  await deleteAllTagsForAlbum(oldAlbumName);
  const rcSetAlbumTags = await setAllAlbumTags(newAlbumName, tags);
  if (rcSetAlbumTags) {
    timeWarn("Error setting tags!");
  }
  for (const tagName of tags) {
    // await updateAlbumsCount(tagName, 1);
    await insertNewTag(tagName);
  }
  return null;
}

export async function insertAlbumWithTags(
  albumInfo: AlbumsListItem,
  tags: string[],
  withTagsCreation?: boolean
): Promise<mongoose.Types.ObjectId | null> {
  const newAlbumId = await insertAlbum(albumInfo);
  if (newAlbumId && tags.length) {
    for (const tag of tags) {
      if (withTagsCreation) {
        await insertNewTag(tag);
      }
      await insertAlbumTagDependency(albumInfo.albumName, tag);
    }
  }
  return newAlbumId;
}
