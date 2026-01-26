import mongoose from "mongoose";
import { handleDataBaseError } from "../database.js";
import { TagItem, TagItemExport, TagItemWithCover, TagsSchema } from "./types.js";

const TagsModel = mongoose.model("tag", TagsSchema);

export async function selectTags(): Promise<TagItemExport[]> {
  try {
    const resObj = await TagsModel.find({ albumsCount: { $gt: 0 } }, null).sort({ albumsCount: -1 });
    return resObj;
  } catch (localErr) {
    handleDataBaseError(localErr, "selectTags");
    return [];
  }
}

export async function insertNewTag(tagName: string): Promise<number> {
  try {
    await TagsModel.create({ tagName, albumsCount: 1 });
    return 0;
  } catch (localErr) {
    if (localErr instanceof mongoose.mongo.MongoError && localErr?.code === 11000) {
      const rc = await updateAlbumsCount(tagName);
      return rc;
    }
    return handleDataBaseError(localErr, "insertNewTag");
  }
}

function mapTagNameToNewTag(tagName: string): TagItem {
  return {
    tagName,
    albumsCount: 1
  };
}

export async function insertNewTags(tagNames: string[]): Promise<number> {
  try {
    const tags: TagItem[] = tagNames.map(mapTagNameToNewTag);
    await TagsModel.insertMany(tags, { ordered: false });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "insertNewTags");
  }
}

export async function updateAlbumsCount(tagName: string, addCount: number = 1): Promise<number> {
  try {
    const updatedTag = await TagsModel.findOneAndUpdate(
      { tagName },
      { $inc: { albumsCount: addCount } },
      { new: true } // return doc after update
    );
    if (!updatedTag?.albumsCount) {
      await TagsModel.deleteOne({ tagName });
    }
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "updateAlbumsCount");
  }
}

export async function deleteAllTags(): Promise<number> {
  try {
    await TagsModel.deleteMany({});
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteAllTags");
  }
}

export async function setAllTags(tagItems: TagItem[]): Promise<number> {
  try {
    await TagsModel.deleteMany({});
    await TagsModel.insertMany(tagItems);
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "setAllTags");
  }
}

export async function deleteTagByName(tagName: string): Promise<number> {
  try {
    await TagsModel.deleteOne({ tagName });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteTagByName");
  }
}

export async function getTagsWithCover(): Promise<TagItemWithCover[]> {
  try {
    const result = await TagsModel.aggregate([
      // Could add filtering here if needed
      // {
      //   $match: {}
      // },
      // Step 1: Get all albums for each tag
      {
        $lookup: {
          from: "albumtags",
          localField: "tagName",
          foreignField: "tagName",
          as: "albumTags"
        }
      },
      // Step 2: Filter out tags with no albums
      {
        $match: {
          albumTags: { $ne: [] }
        }
      },
      // Step 3: Find the first album with pictureNumber=1
      {
        $lookup: {
          from: "albums",
          let: { albumTags: "$albumTags" },
          pipeline: [
            // Find all albums associated with this tag
            {
              $match: {
                $expr: {
                  $in: ["$albumName", "$$albumTags.albumName"]
                }
              }
            },
            // For each album, check if it has pictureNumber=1
            {
              $lookup: {
                from: "albumpictures",
                let: { albumId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$album", "$$albumId"] }, { $eq: ["$pictureNumber", 1] }]
                      }
                    }
                  },
                  { $limit: 1 },
                  { $project: { _id: 1 } }
                ],
                as: "coverPicture"
              }
            },
            // Keep only albums with cover pictures
            {
              $match: {
                coverPicture: { $ne: [] }
              }
            },
            // Sort albums (optional - could sort by albumName or date)
            // {
            //   $sort: { albumName: 1 }
            // },
            // Take the first album with pictureNumber=1
            { $limit: 1 },
            // Get the cover picture ID
            {
              $unwind: "$coverPicture"
            },
            {
              $project: {
                coverId: "$coverPicture._id"
              }
            }
          ],
          as: "albumWithCover"
        }
      },
      // Step 4: Filter out tags without any album having pictureNumber=1
      {
        $match: {
          albumWithCover: { $ne: [] }
        }
      },
      // Step 5: Get the cover ID
      {
        $unwind: "$albumWithCover"
      },
      // Step 6: Project final result
      {
        $project: {
          _id: 1,
          tagName: 1,
          albumsCount: 1,
          coverId: "$albumWithCover.coverId"
        }
      },
      // Optional: Sort results
      {
        $sort: { albumsCount: -1 }
      }
    ]);

    return result as TagItemWithCover[];
  } catch (localErr) {
    handleDataBaseError(localErr, "getTagsWithCover");
    return [];
  }
}

export async function getTagsWithCoverLocale(locale?: string): Promise<TagItemWithCover[]> {
  try {
    const result = await TagsModel.aggregate([
      // Stage 1: Get all tag-album relationships with locale filtering
      {
        $lookup: {
          from: "albumtags",
          localField: "tagName",
          foreignField: "tagName",
          as: "tagAlbums"
        }
      },
      // Stage 2: Get albums with locale filtering in a single pipeline
      {
        $lookup: {
          from: "albums",
          let: { tagAlbums: "$tagAlbums" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$albumName", "$$tagAlbums.albumName"]
                }
              }
            },
            // Apply locale filter if provided
            ...(locale
              ? [
                  {
                    $match: {
                      $or: [
                        { locale: { $exists: false } }, // No locale field at all
                        { locale: null }, // Null locale
                        { locale: "" }, // Empty string locale
                        { locale } // Exact locale match
                      ]
                    }
                  }
                ]
              : []),
            {
              $lookup: {
                from: "albumpictures",
                let: { albumId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [{ $eq: ["$album", "$$albumId"] }, { $eq: ["$pictureNumber", 1] }]
                      }
                    }
                  },
                  { $limit: 1 },
                  { $project: { _id: 1 } }
                ],
                as: "coverPicture"
              }
            },
            {
              $addFields: {
                hasCover: { $gt: [{ $size: "$coverPicture" }, 0] }
              }
            }
          ],
          as: "albumWithCover"
        }
      },
      // Stage 3: Calculate counts and find first album with cover
      {
        $addFields: {
          // Total albums after locale filtering
          filteredAlbumsCount: { $size: "$albumWithCover" },
          // Albums with cover pictures
          albumsWithCover: {
            $filter: {
              input: "$albumWithCover",
              as: "album",
              cond: "$$album.hasCover"
            }
          },
          // First album with cover for the cover image
          firstAlbumWithCover: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$albumWithCover",
                  as: "album",
                  cond: "$$album.hasCover"
                }
              },
              0
            ]
          }
        }
      },
      // Stage 4: Filter out tags with no albums or no covers
      {
        $match: {
          filteredAlbumsCount: { $gt: 0 },
          firstAlbumWithCover: { $ne: null }
        }
      },
      // Stage 5: Get the cover picture ID
      {
        $addFields: {
          coverPicture: {
            $arrayElemAt: ["$firstAlbumWithCover.coverPicture", 0]
          }
        }
      },
      // Stage 6: Project final result
      {
        $project: {
          _id: 1,
          tagName: 1,
          albumsCount: "$filteredAlbumsCount", // Updated count
          coverId: "$coverPicture._id"
        }
      },
      // Optional sorting
      {
        $sort: { albumsCount: -1 }
      }
    ]);

    return result as TagItemWithCover[];
  } catch (localErr) {
    handleDataBaseError(localErr, "getTagsWithCover");
    return [];
  }
}
