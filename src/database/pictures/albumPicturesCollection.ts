import mongoose from "mongoose";
import { handleDataBaseError, mapObjectIdsToString } from "../database.js";
import { AlbumPicturesItem, AlbumPicturesItemExport, AlbumPicturesSchema } from "./types.js";

const AlbumPicturesModel = mongoose.model("albumPicture", AlbumPicturesSchema);

export async function insertAlbumPicture(albumPicture: AlbumPicturesItem): Promise<number> 
{
  try 
  {
    await AlbumPicturesModel.create(albumPicture);
    return 0;
  } 
  catch (localErr: any) 
  {
    return handleDataBaseError(localErr, "insertAlbumPicture");
  }
}

export async function deleteAllAlbumPictures(): Promise<number>
{
  try
  {
    await AlbumPicturesModel.deleteMany({});
    return 0;
  }
  catch (localErr)
  {
    return handleDataBaseError(localErr, "deleteAllAlbumPictures");
  }
}

export async function selectAlbumPictureById(pictureId: string): Promise<AlbumPicturesItemExport | null>
{
  try
  {
    const pictureItem = await AlbumPicturesModel.findById(pictureId);
    return pictureItem;
  }
  catch (localErr)
  {
    handleDataBaseError(localErr, "selectAlbumPictureById");
    return null;
  }
}

export async function selectAlbumPicturesByAlbum(albumId: string, limit = 0): Promise<string[]>
{
  try
  {
    if (limit)
    {
      const pictureIds = await AlbumPicturesModel.find({
        album: new mongoose.Types.ObjectId(albumId),
      },["_id"]).sort({ pictureNumber: 1 }).limit(limit);
      return pictureIds.map(mapObjectIdsToString);
    }
    const pictureIds = await AlbumPicturesModel.find({
      album: new mongoose.Types.ObjectId(albumId)
    },["_id"]).sort({ pictureNumber: 1 });
    return pictureIds.map(mapObjectIdsToString);
  }
  catch (localErr)
  {
    handleDataBaseError(localErr, "selectAlbumPictureById");
    return [];
  }
}

export async function updateAlbumPicturesLocation(
  albumId: string,
  oldAlbumPath: string,
  newAlbumPath: string
): Promise<number>
{
  try
  {
    const renameAggregation: mongoose.PipelineStage[] = [
      {
        $set: {
          fullPath: {
            $replaceOne: {
              input: "$fullPath",
              find: oldAlbumPath,
              replacement: newAlbumPath,
            },
          },
        },
      },
    ];
    await AlbumPicturesModel.updateMany({ album: albumId }, renameAggregation);
    return 0;
  }
  catch (localErr)
  {
    return handleDataBaseError(localErr, "updateAlbumPicturesLocation");
  }
}
