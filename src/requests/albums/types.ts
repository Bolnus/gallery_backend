export enum AlbumsListSorting {
  changedDate = "changedDate",
  sample = "sample"
}

export interface GetAlbumsListQuery {
  page: string;
  size: string;
  tags: string;
  name: string;
  sort?: AlbumsListSorting;
}

export interface GetAlbumQuery {
  id: string;
}

export interface AlbumHeadersBody {
  albumName: string;
  id: string;
  tags: string[];
  description: string;
}
