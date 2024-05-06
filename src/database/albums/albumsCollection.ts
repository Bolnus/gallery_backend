import mongoose from "mongoose";
import { handleDataBaseError } from "../database.js";
import {
  AlbumsDataWithTotal,
  AlbumsDataWithTotalObject,
  AlbumsListItem,
  AlbumsListItemExport,
  AlbumsListSchema,
  AlbumsListWithTotal,
} from "./types.js";

const AlbumsListModel = mongoose.model("album", AlbumsListSchema);

export async function selectAlbumsList(
  start: number = 0,
  end: number = 50
): Promise<AlbumsListWithTotal>
{
  // if (start >= end)
  // {
  //   timeWarn(`start ${start} >= end ${end}`);
  //   return {
  //     albumsList: [],
  //     totalCount: 0
  //   };
  // }
  try
  {
    const albumListItems = await AlbumsListModel.find({}, [
      "_id",
      "albumName",
      "albumSize",
      "changedDate"
    ]).sort({changedDate: -1}).skip(start).limit(end); // 
    // timeLog(`${end} - ${start} = ${albumListItems.length}`)
    const totalCount = await AlbumsListModel.countDocuments();
    return {
      albumsList: albumListItems,
      totalCount
    };
  }
  catch (localErr: any)
  {
    handleDataBaseError(localErr, "selectAlbumsList");
    return {
      albumsList: [],
      totalCount: 0
    };
  }
}

export async function selectAlbumsDataList(
  tagsList: string[],
  searchName: string,
  albumsListStart: number,
  albumsListEnd: number
): Promise<AlbumsDataWithTotal> 
{
  try
  {
    const aggregationQuerySearchName: mongoose.PipelineStage[] = [];
    if (searchName)
    {
      const searchTerms = searchName.split(" ");
      for (const word of searchTerms)
      {
        if (word)
        {
          aggregationQuerySearchName.push({
            $match: {
              albumName: {
                $regex: word,
                $options: "i",
              },
            },
          });
        }
      }
    }
    const aggregationQueryTags: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: "albumtags",
          let: { client_id: "$albumName" },
          pipeline: [
            { $match: { $expr: { $eq: ["$albumName", "$$client_id"] } } },
            { $project: { _id: 1, tagName: 1 } },
          ],
          as: "tags"
        },
      }
    ];
    if (tagsList.length)
    {
      for (const tagName of tagsList)
      {
        aggregationQueryTags.push({
          $match: {
            "tags.tagName": {
              $in: [tagName],
            }
          }
        });
      }
    }

    const aggregationQueryMain: mongoose.PipelineStage[] = [
      {
        $facet: {
          totalCount: [
            {
              $count: "count",
            },
          ],
          albumsList: [
            {
              $sort: { changedDate: -1 },
            },
            {
              $skip: albumsListStart,
            },
            {
              $limit: albumsListEnd,
            },
            {
              $lookup: {
                from: "albumpictures",
                let: {
                  client_id: "$_id",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$album", "$$client_id"],
                      },
                    },
                  },
                  {
                    $limit: 6,
                  },
                ],
                as: "pictureObjects",
              },
            },
            {
              $addFields: {
                pictureIds: "$pictureObjects._id",
              },
            },
            {
              $project: {
                _id: 1,
                albumName: 1,
                albumSize: 1,
                changedDate: 1,
                tags: 1,
                pictureIds: 1,
              },
            },
          ],
        },
      },
    ];
    const albumsListWithTotal = await AlbumsListModel.aggregate<AlbumsDataWithTotalObject>([
      ...aggregationQuerySearchName,
      ...aggregationQueryTags,
      ...aggregationQueryMain,
    ]);
    // {
    //   $lookup: {
    //     from: "albumtags",
    //     localField: "albumName",
    //     foreignField: "albumName",
    //     as: "tags",
    //   },
    // },
    // const totalCount = await AlbumsListModel.countDocuments();
    return {
      albumsList: albumsListWithTotal?.[0]?.albumsList,
      totalCount: albumsListWithTotal?.[0]?.totalCount?.[0]?.count || 0
    };
  }
  catch (localErr: any)
  {
    handleDataBaseError(localErr, "selectAlbumsDataList");
    return {
      albumsList: [],
      totalCount: 0
    };
  }
}

export async function selectAlbumById(albumId: string): Promise<AlbumsListItemExport | null>
{
  try
  {
    const album = await AlbumsListModel.findById(albumId);
    return album;
  }
  catch (localErr)
  {
    handleDataBaseError(localErr, "selectAlbumPictureById");
    return null;
  }
}

export async function insertAlbum(albumListItem: AlbumsListItem): Promise<mongoose.Types.ObjectId | null>
{
  try
  {
    const createdAlbum = await AlbumsListModel.create(albumListItem);
    return createdAlbum?._id;
  }
  catch (localErr)
  {
    handleDataBaseError(localErr, "insertAlbum");
    return null;
  }
}

export async function deleteAllAlbums(): Promise<number>
{
  try
  {
    await AlbumsListModel.deleteMany({});
    return 0;
  }
  catch (localErr)
  {
    return handleDataBaseError(localErr, "deleteAllAlbums");
  }
}

export async function updateAlbumNameById(albumId: string, albumName: string, fullPath: string): Promise<number>
{
  try
  {
    await AlbumsListModel.findByIdAndUpdate(albumId, { albumName, fullPath, changedDate: (new Date).toISOString() });
    return 0;
  }
  catch (localErr)
  {
    return handleDataBaseError(localErr, "updateAlbumNameById");
  }
}

export async function selectAlbumPathById(albumId: string): Promise<string>
{
  try
  {
    const album = await AlbumsListModel.findById(albumId, ["fullPath"]);
    return album?.fullPath || "";
  }
  catch (localErr)
  {
    handleDataBaseError(localErr, "selectAlbumPictureById");
    return "";
  }
}