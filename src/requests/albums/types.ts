export interface GetAlbumsListQuery {
  page: string;
  size: string;
  tags: string;
  name: string;
}

export interface GetAlbumQuery {
  id: string;
}

export interface AlbumHeadersBody {
  albumName: string;
  id: string;
  tags: string[];
}
