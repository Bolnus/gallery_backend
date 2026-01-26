import mongoose from "mongoose";
import { HttpError } from "../types.js";
import { timeWarn } from "../log.js";
import { selectPictureIdsByAlbumId } from "./pictures/albumPicturesCollection.js";
import { insertAlbum, selectAlbumById } from "./albums/albumsCollection.js";
import {
  deleteAllTagsForAlbum,
  insertAlbumTagDependency,
  selectAlbumTags,
  setAllAlbumTags
} from "./tags/tagAlbumsCollection.js";
import { AlbumsDataListItem, AlbumsListItem } from "./albums/types.js";
import { insertNewTag, updateAlbumsCount } from "./tags/tagsCollection.js";

export async function selectAlbumData(albumId: string, locale?: string): Promise<AlbumsDataListItem | null> {
  const album = await selectAlbumById(albumId);
  if (!album) {
    return null;
  }
  if (locale && album.locale && locale !== album.locale) {
    return null;
  }
  const albumTags = await selectAlbumTags(album.albumName);
  const albumPictures = await selectPictureIdsByAlbumId(albumId);
  const exportAlbumData: AlbumsDataListItem = {
    _id: album._id,
    albumName: album.albumName,
    albumSize: album.albumSize,
    changedDate: album.changedDate,
    description: album.description,
    tags: albumTags,
    pictureIds: albumPictures,
    locale: album.locale || ""
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
    description: album.description,
    locale: album.locale,
    pictureIds: []
  };
  return exportAlbumData;
}

export function mapTagNames(tagObject: { tagName: string }): string {
  return tagObject.tagName;
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
