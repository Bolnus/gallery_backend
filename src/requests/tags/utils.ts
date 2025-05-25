import express from "express";
import { isValidStringPhrase } from "../../string.js";
import { DeleteTagBody } from "./types.js";

export function isValidDeleteTagBody(body: unknown, res: express.Response): body is DeleteTagBody {
  if (!isValidStringPhrase((body as DeleteTagBody)?.tag)) {
    res.status(400).json({
      title: "Invalid tag name!",
      message: "Invalid characters found in tag."
    });
    return false;
  }
  return true;
}
