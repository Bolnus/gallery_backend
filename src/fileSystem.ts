import fileSystem, { promises } from "fs";
import path from "path";
import mongoose from "mongoose";
import { timeLog, timeWarn } from "./log.js";
import { AlbumsListItem, deleteAllAlbums, insertAlbum } from "./databsase/albumsCollection.js";
import { insertNewTag } from "./databsase/tagsCollection.js";
import { insertAlbumTagDependency } from "./databsase/tagAlbumsCollection.js";
import { AlbumPicturesItem, insertAlbumPicture } from "./databsase/albumPicturesCollection.js";

export function writeBase64DecodedFile(
  base64str: string,
  fileName: string,
  dirName: string
): Promise<void> {
  const fileContents = base64str.split(";base64,").pop() || "";
  // const bitmap = Buffer.alloc(base64str, 'base64')
  return promises.writeFile(`${dirName}/photo/${fileName}`, fileContents, {
    encoding: "base64",
  });
}

async function getDirectoryFilesCount(directoryPath: string): Promise<number>
{
  let filesCount = 0;
  try
  {
    const files = await promises.readdir(directoryPath);
    
    for (const file of files)
    {
      const filePath = path.join(directoryPath, file);
      const stats = await promises.stat(filePath);
      if (stats.isFile())
      {
        filesCount++;
      }
    }
    return filesCount;
  }
  catch (localErr)
  {
    timeWarn("getDirectoryFilesCount");
    console.log(localErr);
    return filesCount;
  }
}

export async function initAllAlbums(
  directoryPath: string,
  parentTags: string[] = [],
  parentAlbumId: mongoose.Types.ObjectId | null = null
): Promise<number> 
{
  try 
  {
    const files = await promises.readdir(directoryPath);
    let albumSize = 0;

    for (let i=0;i<files.length;i++) 
    {
      const file = files[i];
      const filePath = path.join(directoryPath, file);
      const stats = await promises.stat(filePath);

      if (stats.isDirectory()) 
      {
        const newTags = [...parentTags, file];
        const subAlbumSize = await getDirectoryFilesCount(filePath);
        
        const albumInfo: AlbumsListItem = {
          albumName: file,
          fullPath: filePath,
          changedDate: stats.mtime.toISOString(),
          albumSize: subAlbumSize
        };
        
        let newAlbumId: mongoose.Types.ObjectId | null = null;
        if (subAlbumSize)
        {
          newAlbumId = await insertAlbum(albumInfo);
          if (newAlbumId && parentTags.length)
          {
            await insertNewTag(parentTags[parentTags.length-1]);
            for (const parentTag of parentTags)
            {
              await insertAlbumTagDependency(file, parentTag);
            }
          }
        }
        await initAllAlbums(filePath, newTags, newAlbumId);
      }
      else
      {
        albumSize++;
        if (parentAlbumId)
        {
          // timeLog(parentAlbumId)
          const albumPicture: AlbumPicturesItem = {
            fileName: file,
            fullPath: filePath,
            pictureNumber: i + 1,
            album: parentAlbumId
          };
          await insertAlbumPicture(albumPicture);
        }
      }
    }
    return albumSize;
  }
  catch (error)
  {
    timeWarn(`Error reading directory: ${directoryPath}`);
    console.log(error);
    return -1;
  }
}
  