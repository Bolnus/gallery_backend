import mongoose from "mongoose";
import {
  fileNameIsImage,
  getDirectoryImagesCount,
  getFileMetadata,
  getJoindedPath,
  getLowerCaseExtensionName,
  readDir
} from "../fileSystem.js";
import { AlbumsListItem } from "../database/albums/types.js";
import { timeWarn } from "../log.js";
import { insertAlbumPicture } from "../database/pictures/albumPicturesCollection.js";
import { AlbumPicturesItem } from "../database/pictures/types.js";
import { insertAlbumWithTags } from "../database/utils.js";

export async function initAllAlbums(
  directoryPath: string,
  parentTags: string[] = [],
  parentAlbumId: mongoose.Types.ObjectId | null = null
): Promise<number> {
  try {
    const files = await readDir(directoryPath);
    let albumSize = 0;
    console.log(directoryPath);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = getJoindedPath(directoryPath, file);
      const stats = await getFileMetadata(filePath);

      if (stats.isDirectory()) {
        if (file.startsWith(".")) {
          continue;
        }
        const newTags = [...parentTags, file];
        const subAlbumSize = await getDirectoryImagesCount(filePath);

        const albumInfo: AlbumsListItem = {
          albumName: file,
          fullPath: filePath,
          changedDate: stats.mtime.toISOString(),
          albumSize: subAlbumSize,
          locale: ""
        };

        let newAlbumId: mongoose.Types.ObjectId | null = null;
        if (subAlbumSize) {
          newAlbumId = await insertAlbumWithTags(albumInfo, parentTags);
        }
        await initAllAlbums(filePath, newTags, newAlbumId);
      } else {
        albumSize++;
        if (parentAlbumId && fileNameIsImage(file)) {
          // timeLog(parentAlbumId)
          const albumPicture: AlbumPicturesItem = {
            fileName: file,
            fileFormat: getLowerCaseExtensionName(file),
            fullPath: filePath,
            pictureNumber: i + 1,
            album: parentAlbumId
          };
          await insertAlbumPicture(albumPicture);
        }
      }
    }
    return albumSize;
  } catch (localErr) {
    timeWarn(`Error reading directory: ${directoryPath}`);
    console.log(localErr);
    return -1;
  }
}
