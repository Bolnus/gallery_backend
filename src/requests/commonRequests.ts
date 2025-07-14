import express from "express";
import { timeLog, timeWarn } from "../log.js";
import { deleteAllAlbums } from "../database/albums/albumsCollection.js";
import { deleteAllPictures } from "../database/pictures/albumPicturesCollection.js";
import { getAllTagsFromDeps } from "../database/tags/tagAlbumsCollection.js";
import { setAllTags } from "../database/tags/tagsCollection.js";
import { getEnvGalleryName, getEnvGallerySrcLocation, getEnvS3BaseUrl } from "../env.js";
import { initAllAlbums } from "./commonUtils.js";

export function handleError(error: unknown, res: express.Response): void {
  timeWarn(`Error | ${(error as Error)?.message}`);
  console.log(error);
  res.sendStatus(400);
}

export function getStatus(req: express.Request, res: express.Response): void {
  timeLog("GET | /");
  res.send(
    `<body style="margin: 0;">
      <div
      id="rootDiv"
      style="background: #36383F;
      display: flex;
      align-items: center;
      justify-content:
      center; width: 100%;
      height: 100%;
      font-size: 3em;
      color: white;"
      >Backend online</div>
      <script>setInterval(() => {
        const rootDiv = document.querySelector("#rootDiv");
        let text = "Backend online";
        switch(rootDiv.textContent) {
          case text:
            rootDiv.textContent = text + ".";
            break;
          case text + ".":
            rootDiv.textContent = text + "..";
            break;
          case text + "..":
            rootDiv.textContent = text + "...";
            break;
          case text + "...":
            location.reload();
            break;
        }
      }, 2000)</script>
      </body>`
  );
}

export function notFoundRequest(req: express.Request, res: express.Response): void {
  timeLog(`GET | ${req.params.endpoint}`);

  try {
    res.status(404).send(
      `<div 
        style='background: #36383F; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        width: 100%; height: 100%; 
        font-size: 3em; color: white;'
        >
        404: ${req.params.endpoint}
        </div>`
    );
  } catch (error) {
    handleError(error, res);
  }
}

export async function initAlbumsRequest(req: express.Request, res: express.Response): Promise<void> {
  timeLog(`POST | ${req.path}`);

  try {
    if (getEnvS3BaseUrl()) {
      timeLog("Init unsupported with s3");
      res.sendStatus(400);
      return;
    }
    await deleteAllAlbums();
    // await deleteAllTags();
    await deleteAllPictures();
    const rc = await initAllAlbums(getEnvGallerySrcLocation());
    const countedTags = await getAllTagsFromDeps();
    await setAllTags(countedTags);
    timeLog("INIT FINISHED");
    if (rc === -1) {
      res.sendStatus(400);
      return;
    }
    res.sendStatus(200);
    return;
  } catch (localErr) {
    timeWarn("Error dropping collections:");
    console.log(localErr);
    res.sendStatus(400);
  }
}
