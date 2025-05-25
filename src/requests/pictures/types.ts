export interface UploadImageData {
  id: string;
  pictureNumber: number;
}

export interface PostPicturesResp {
  imageIds: [string, string][];
}

export interface PostPicturesBody {
  albumId: string;
}

export interface PutPicturesBody {
  albumId: string;
  imageIds: string[];
}
