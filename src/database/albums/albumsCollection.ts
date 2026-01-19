import mongoose from "mongoose";
import { handleDataBaseError } from "../database.js";
import {
  AlbumsDataWithTotal,
  AlbumsDataWithTotalObject,
  AlbumsListItem,
  AlbumsListItemExport,
  AlbumsListSchema,
  AlbumsListWithTotal
} from "./types.js";
import { AlbumsListSorting } from "../../requests/albums/types.js";

const AlbumsListModel = mongoose.model("album", AlbumsListSchema);

export async function selectAlbumsList(start: number, end: number): Promise<AlbumsListWithTotal> {
  try {
    const albumListItems = await AlbumsListModel.find({}, ["_id", "albumName", "albumSize", "changedDate"])
      .sort({ changedDate: -1 })
      .skip(start)
      .limit(end);

    const totalCount = await AlbumsListModel.countDocuments();
    return {
      albumsList: albumListItems,
      totalCount
    };
  } catch (localErr: unknown) {
    handleDataBaseError(localErr, "selectAlbumsList");
    return {
      albumsList: [],
      totalCount: 0
    };
  }
}

function getAggregationQuerySearchName(searchName: string): mongoose.PipelineStage[] {
  const aggregationQuerySearchName: mongoose.PipelineStage[] = [];
  if (searchName) {
    const searchTerms = searchName.split(" ");
    for (const word of searchTerms) {
      if (word) {
        aggregationQuerySearchName.push({
          $match: {
            albumName: {
              $regex: word,
              $options: "i"
            }
          }
        });
      }
    }
  }
  return aggregationQuerySearchName;
}

function getAggregationQueryTags(tagsList: string[]): mongoose.PipelineStage[] {
  const aggregationQueryTags: mongoose.PipelineStage[] = [
    {
      $lookup: {
        from: "albumtags",
        let: { client_id: "$albumName" },
        pipeline: [{ $match: { $expr: { $eq: ["$albumName", "$$client_id"] } } }, { $project: { _id: 1, tagName: 1 } }],
        as: "tags"
      }
    }
  ];
  if (tagsList.length) {
    for (const tagName of tagsList) {
      aggregationQueryTags.push({
        $match: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          "tags.tagName": {
            $in: [tagName]
          }
        }
      });
    }
  }
  return aggregationQueryTags;
}

function getLocaleFilter(locale?: string): mongoose.PipelineStage[] {
  if (!locale) {
    return [];
  }

  return [
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
  ];
}

export async function selectAlbumsDataList({
  tagsList,
  searchName,
  albumsListStart,
  pageSize,
  sortBy,
  locale
}: {
  tagsList: string[];
  searchName: string;
  albumsListStart: number;
  pageSize: number;
  sortBy?: AlbumsListSorting;
  locale?: string;
}): Promise<AlbumsDataWithTotal> {
  try {
    const albumsList: mongoose.PipelineStage.FacetPipelineStage[] = [
      {
        $lookup: {
          from: "albumpictures",
          let: {
            client_id: "$_id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$album", "$$client_id"]
                }
              }
            },
            {
              $limit: 6
            }
          ],
          as: "pictureObjects"
        }
      },
      {
        $addFields: {
          pictureIds: "$pictureObjects._id"
        }
      },
      {
        $project: {
          _id: 1,
          albumName: 1,
          albumSize: 1,
          changedDate: 1,
          tags: 1,
          pictureIds: 1,
          locale: 1
        }
      }
    ];

    if (!sortBy || sortBy === AlbumsListSorting.changedDate) {
      albumsList.unshift(
        {
          $sort: { changedDate: -1 }
        },
        {
          $skip: albumsListStart
        },
        {
          $limit: pageSize
        }
      );
    } else {
      albumsList.unshift({
        $sample: { size: pageSize }
      });
    }

    const aggregationQueryMain: mongoose.PipelineStage[] = [
      {
        $facet: {
          totalCount: [
            {
              $count: "count"
            }
          ],
          albumsList
        }
      }
    ];

    const albumsListWithTotal = await AlbumsListModel.aggregate<AlbumsDataWithTotalObject>([
      ...getLocaleFilter(locale),
      ...getAggregationQuerySearchName(searchName),
      ...getAggregationQueryTags(tagsList),
      ...aggregationQueryMain
    ]);

    let totalCount = 0;
    if (albumsListWithTotal?.[0]?.totalCount?.[0]?.count) {
      if (!sortBy || sortBy === AlbumsListSorting.changedDate) {
        totalCount = albumsListWithTotal[0].totalCount[0].count;
      } else if (sortBy === AlbumsListSorting.sample) {
        totalCount =
          albumsListWithTotal[0].totalCount[0].count > pageSize ? pageSize : albumsListWithTotal[0].totalCount[0].count;
      }
    }

    return {
      albumsList: albumsListWithTotal?.[0]?.albumsList,
      totalCount
    };
  } catch (localErr: unknown) {
    handleDataBaseError(localErr, "selectAlbumsDataList");
    return {
      albumsList: [],
      totalCount: 0
    };
  }
}

export async function selectAlbumById(albumId: string): Promise<AlbumsListItem | null> {
  try {
    const album = await AlbumsListModel.findById(albumId);
    return album;
  } catch (localErr) {
    handleDataBaseError(localErr, "selectAlbumById");
    return null;
  }
}

export async function insertAlbum(albumListItem: AlbumsListItem): Promise<mongoose.Types.ObjectId | null> {
  try {
    const createdAlbum = await AlbumsListModel.create(albumListItem);
    return createdAlbum?._id;
  } catch (localErr) {
    handleDataBaseError(localErr, "insertAlbum");
    return null;
  }
}

export async function deleteAllAlbums(): Promise<number> {
  try {
    await AlbumsListModel.deleteMany({});
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteAllAlbums");
  }
}

export async function updateAlbumById(
  albumId: string,
  albumName: string,
  fullPath: string,
  description?: string,
  locale?: string
): Promise<number> {
  try {
    await AlbumsListModel.findByIdAndUpdate(albumId, {
      albumName,
      fullPath,
      changedDate: new Date().toISOString(),
      description,
      locale
    });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "updateAlbumById");
  }
}

export async function updateAlbumSizeById(albumId: string, albumSize: number): Promise<number> {
  try {
    await AlbumsListModel.findByIdAndUpdate(albumId, { albumSize, changedDate: new Date().toISOString() });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "updateAlbumSizeById");
  }
}

export async function selectAlbumPathById(albumId: string): Promise<string> {
  try {
    const album = await AlbumsListModel.findById(albumId, ["fullPath"]);
    return album?.fullPath || "";
  } catch (localErr) {
    handleDataBaseError(localErr, "selectAlbumPathById");
    return "";
  }
}

export async function selectAlbumByName(albumName: string): Promise<AlbumsListItemExport | null> {
  try {
    const album = await AlbumsListModel.findOne({ albumName });
    return album;
  } catch (localErr) {
    handleDataBaseError(localErr, "selectAlbumByName");
    return null;
  }
}

export async function deleteAlbumById(albumId: string): Promise<number> {
  try {
    await AlbumsListModel.deleteOne({ _id: albumId });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteAlbumById");
  }
}

export async function updateAlbumDescriptionById(
  albumId: string,
  description?: string,
  locale?: string
): Promise<number> {
  try {
    await AlbumsListModel.findByIdAndUpdate(albumId, {
      changedDate: new Date().toISOString(),
      description,
      locale: locale || null
    });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "updateAlbumDescriptionById");
  }
}
