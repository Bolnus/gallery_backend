import mongoose from "mongoose";
import { handleDataBaseError, mapObjectIdsToString } from "../database.js";
import { AlbumPicturesItem, AlbumPicturesItemExport, AlbumPicturesSchema } from "./types.js";
import { timeLog } from "../../log.js";

const AlbumPicturesModel = mongoose.model("albumPicture", AlbumPicturesSchema);

export async function insertAlbumPicture(albumPicture: AlbumPicturesItem): Promise<number> {
  try {
    await AlbumPicturesModel.create(albumPicture);
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "insertAlbumPicture");
  }
}

export async function insertManyAlbumPictures(albumPictures: AlbumPicturesItem[]): Promise<mongoose.Types.ObjectId[]> {
  try {
    const results = await AlbumPicturesModel.insertMany(albumPictures);
    return results.map((savedItem) => savedItem._id);
  } catch (localErr) {
    handleDataBaseError(localErr, "insertManyAlbumPictures");
    return [];
  }
}

export async function deleteAllPictures(): Promise<number> {
  try {
    await AlbumPicturesModel.deleteMany({});
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteAllPictures");
  }
}

export async function deletePicturesByAlbumId(albumId: string | mongoose.Types.ObjectId): Promise<number> {
  try {
    await AlbumPicturesModel.deleteMany({
      album: typeof albumId === "string" ? new mongoose.Types.ObjectId(albumId) : albumId
    });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deletePicturesByAlbumId");
  }
}

export async function deletePicturesByIds(pictureIds: (string | mongoose.Types.ObjectId)[]): Promise<number> {
  try {
    await AlbumPicturesModel.deleteMany({
      _id: { $in: pictureIds }
    });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deletePicturesByIds");
  }
}

export async function selectAlbumPictureById(pictureId: string): Promise<AlbumPicturesItemExport | null> {
  try {
    const pictureItem = await AlbumPicturesModel.findById(pictureId);
    return pictureItem;
  } catch (localErr) {
    handleDataBaseError(localErr, "selectAlbumPictureById");
    return null;
  }
}

export async function selectAlbumPicturesGroupByIds(pictureIds: string[]): Promise<AlbumPicturesItemExport[]> {
  try {
    const pictureItems: AlbumPicturesItemExport[] = await AlbumPicturesModel.find({ _id: { $in: pictureIds } });
    return pictureItems.sort((a, b) => pictureIds.indexOf(a._id.toString()) - pictureIds.indexOf(b._id.toString()));
  } catch (localErr) {
    handleDataBaseError(localErr, "selectAlbumPictureById");
    return [];
  }
}

export async function selectPicturesByAlbumId(albumId: string): Promise<AlbumPicturesItemExport[]> {
  try {
    const pictures: AlbumPicturesItemExport[] = await AlbumPicturesModel.find({
      album: new mongoose.Types.ObjectId(albumId)
    }).sort({ pictureNumber: 1 });
    return pictures; // selectIds ? pictures.map(mapObjectIdsToString) : ;
  } catch (localErr) {
    handleDataBaseError(localErr, "selectPicturesByAlbumId");
    return [];
  }
}

export async function selectPictureIdsByAlbumId(albumId: string): Promise<string[]> {
  const pictures = await selectPicturesByAlbumId(albumId);
  return pictures.map(mapObjectIdsToString);
}

export async function updateAlbumPicturesLocation(
  albumId: string,
  oldAlbumPath: string,
  newAlbumPath: string
): Promise<number> {
  try {
    const renameAggregation: mongoose.PipelineStage[] = [
      {
        $set: {
          fullPath: {
            $replaceOne: {
              input: "$fullPath",
              find: oldAlbumPath,
              replacement: newAlbumPath
            }
          }
        }
      }
    ];
    await AlbumPicturesModel.updateMany({ album: albumId }, renameAggregation);
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "updateAlbumPicturesLocation");
  }
}

export async function updateAlbumPictureById(
  pictureId: string | mongoose.Types.ObjectId,
  newPicturePath: string,
  newPictureName: string,
  newPictureNumber: number
): Promise<number> {
  try {
    await AlbumPicturesModel.updateOne(
      { _id: pictureId },
      {
        fullPath: newPicturePath,
        fileName: newPictureName,
        pictureNumber: newPictureNumber
      }
    );
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "updateAlbumPictureById");
  }
}

export async function createAlbumPicturesIndexes(): Promise<number> {
  try {
    await Promise.all([
      AlbumPicturesModel.collection.createIndex({ album: 1, pictureNumber: 1 }),
      AlbumPicturesModel.collection.createIndex({ pictureNumber: 1 }),
      AlbumPicturesModel.collection.createIndex({ album: 1 })
    ]);
    timeLog("AlbumPicturesModel indexes created");
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "createAlbumPicturesIndexes");
  }
}
