import { selectAlbumPicturesByAlbum } from "./albumPicturesCollection.js";
import { selectAlbumById, selectAlbumsList } from "./albumsCollection.js";
import { AlbumsDataListItem } from "./databaseTypes.js";
import { selectAlbumTags } from "./tagAlbumsCollection.js";


export async function selectAlbumsDataList(
  albumsListStart: number = 0,
  albumsListEnd: number = 50
): Promise<AlbumsDataListItem[]> 
{
  const albumsList = await selectAlbumsList(albumsListStart, albumsListEnd);
  const exportAlbumListItems: AlbumsDataListItem[] = [];
  for (const albumListItem of albumsList) 
  {
    const albumTags = await selectAlbumTags(albumListItem.albumName);
    const albumPictures = await selectAlbumPicturesByAlbum(albumListItem._id.toString(), 5);
    exportAlbumListItems.push({
      _id: albumListItem._id,
      albumName: albumListItem.albumName,
      albumSize: albumListItem.albumSize,
      changedDate: albumListItem.changedDate,
      tags: albumTags,
      pictureIds: albumPictures
    });
  }
  return exportAlbumListItems;
}

export async function selectAlbumData(albumId: string): Promise<AlbumsDataListItem | null> 
{
  const album = await selectAlbumById(albumId);
  if (!album)
  {
    return null;
  }
  const albumTags = await selectAlbumTags(album.albumName);
  const albumPictures = await selectAlbumPicturesByAlbum(albumId);
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
