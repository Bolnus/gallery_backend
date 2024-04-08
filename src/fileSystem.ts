import fileSystem, { promises } from "fs";
import path from "path";
import mongoose from "mongoose";
import imagemin from "imagemin";
// import imageminJpegtran from "imagemin-jpegtran";
// import imageminPngquant from "imagemin-pngquant";
import imageminWebp, { Options } from "imagemin-webp";
import { timeLog, timeWarn } from "./log.js";
import { insertAlbum } from "./database/albums/albumsCollection.js";
import { insertNewTag } from "./database/tags/tagsCollection.js";
import { insertAlbumTagDependency } from "./database/tags/tagAlbumsCollection.js";
import { insertAlbumPicture } from "./database/pictures/albumPicturesCollection.js";
import { PictureSizing } from "./types.js";
import { AlbumsListItem } from "./database/albums/types.js";
import { AlbumPicturesItem } from "./database/pictures/types.js";

const DIR_WEBP_FULL = ".webpFull";
const DIR_WEBP_SNAP = ".webpSnap";

export function getEnvLocation(dirPath: string, galleryName = ""): string
{
  if (!dirPath)
  {
    timeWarn("No .env location provided!");
    process.exit(1);
  }
  else if (dirPath[0] === "~")
  {
    return path.join(`${process.env.HOME}${dirPath.slice(1)}`, galleryName);
  }
  return path.join(dirPath, galleryName);
}

export function fileNameToWebp(filePath: string): string
{
  const dirPath = path.dirname(filePath);
  const baseFileName = path.basename(filePath, path.extname(filePath));
  return path.join(dirPath, `${baseFileName}.webp`);
}

export function getFullWebpFilePath(filePath: string): string
{
  const dirPath = path.dirname(filePath);
  const webpDirPath = path.join(dirPath, DIR_WEBP_FULL);
  const baseFileName = path.basename(filePath, path.extname(filePath));
  return path.join(webpDirPath, `${baseFileName}.webp`);
}

export function getSnapWebpFilePath(filePath: string): string
{
  const dirPath = path.dirname(filePath);
  const webpDirPath = path.join(dirPath, DIR_WEBP_SNAP);
  const baseFileName = path.basename(filePath, path.extname(filePath));
  return path.join(webpDirPath, `${baseFileName}.webp`);
}

export async function imageToWebpData(
  srcFilePath: string,
  desctinationFilePath: string,
  sizing: PictureSizing
): Promise<Buffer>
{
  let wepbConfig: Options = {};
  let distanationPath: string;
  if (sizing && sizing === PictureSizing.Snap)
  {
    wepbConfig = {
      // resize: {
      //   width: 300,
      //   height: 300
      // }
      size: 16000,
    };
    distanationPath = path.dirname(desctinationFilePath);
    // distanationPath = path.join(dirPath, DIR_WEBP_SNAP);
  }
  else
  {
    distanationPath = path.dirname(desctinationFilePath);
    // distanationPath = path.join(dirPath, DIR_WEBP_FULL);
  }

  const resultsArray = await imagemin([srcFilePath.replace(/\\/g, "/")], {
    destination: distanationPath.replace(/\\/g, "/"),
    plugins: [
      imageminWebp(wepbConfig)
    ]
  });

  return resultsArray?.[0]?.data;
}

export function writeBase64DecodedFile(
  base64str: string,
  fileName: string,
  dirName: string
): Promise<void>
{
  const fileContents = base64str.split(";base64,").pop() || "";
  // const bitmap = Buffer.alloc(base64str, 'base64')
  return promises.writeFile(`${dirName}/photo/${fileName}`, fileContents, {
    encoding: "base64",
  });
}

function fileNameIsImage(filePath: string): boolean
{
  const fileFormat = path.extname(filePath).toLowerCase();
  return (
    fileFormat === ".png" ||
    fileFormat === ".jpeg" ||
    fileFormat === ".jpg" ||
    fileFormat === ".webp" ||
    fileFormat === ".gif"
  );
}

export async function fileExists(fullPath: string): Promise<boolean>
{
  try
  {
    await promises.access(fullPath);
    return true;
  }
  catch (localErr)
  {
    return false;
  }
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
      if (stats.isFile() && fileNameIsImage(filePath))
      {
        filesCount++;
        if (file.includes("(") || file.includes(")"))
        {
          const fixedFileName = file.replace(/\(/g, "").replace(/\)/g, "");
          await promises.rename(filePath, path.join(directoryPath, fixedFileName));
        }
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
        if (file.startsWith("."))
        {
          continue;
        }
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
        if (
          parentAlbumId &&
          fileNameIsImage(file)
        )
        {
          // timeLog(parentAlbumId)
          const albumPicture: AlbumPicturesItem = {
            fileName: file,
            fileFormat: path.extname(file).toLowerCase(),
            fullPath: filePath,
            pictureNumber: i + 1,
            album: parentAlbumId,
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
  