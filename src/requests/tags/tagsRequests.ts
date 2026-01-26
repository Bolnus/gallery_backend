import express from "express";
import qs from "qs";
import { timeLog, timeWarn } from "../../log.js";
import { deleteTagByName, getTagsWithCover, getTagsWithCoverLocale, selectTags } from "../../database/tags/tagsCollection.js";
import { deleteTagDependencies } from "../../database/tags/tagAlbumsCollection.js";
import { handleError } from "../commonRequests.js";
import { isValidDeleteTagBody } from "./utils.js";

export async function deleteTagRequest(
  req: express.Request<unknown, unknown, unknown>,
  res: express.Response
): Promise<void> {
  timeLog(`DELETE | ${req.path}`);

  try {
    const reqBody = req.body;
    if (!isValidDeleteTagBody(reqBody, res)) {
      return;
    }
    await deleteTagByName(reqBody.tag);
    await deleteTagDependencies(reqBody.tag);
    res.sendStatus(200);
    return;
  } catch (localErr) {
    timeWarn("Error dropping collections:");
    console.log(localErr);
    res.sendStatus(400);
  }
}

export async function getTagsRequest(req: express.Request, res: express.Response): Promise<void> {
  // const endpoint = baseEndPoint + req.params.endpoint;
  timeLog(`GET | ${req.path}?${qs.stringify(req.query, { format: "RFC3986" })}`);
  const withCovers = req.query?.withCovers ? Number(req.query?.withCovers) : 0;
  let locale: string | undefined;
  if (req.query?.locale && typeof req.query.locale === "string") {
    locale = req.query.locale;
  }

  try {
    if (withCovers) {
      const tagsWithCovers = await getTagsWithCover(); // Locale(locale);
      res.json(tagsWithCovers);
      return;
    }
    const tagsList = await selectTags();
    res.json(tagsList);
  } catch (error) {
    handleError(error, res);
    return;
  }
}
