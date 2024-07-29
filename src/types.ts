
export enum PictureSizing
{
  Snap = "snap",
  ExtraReduced = "extra-reduced"
}

export interface HttpError
{
  rc: number;
  message: string;
}

export const SnapFileSize = 16000;