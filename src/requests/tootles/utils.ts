import express from "express";
import { AuthenticatedRequest, LoginBody } from "./types.js";
import { NoAuthMessage } from "./consts.js";
import { handleError } from "../commonRequests.js";
import { getTootleById } from "../../database/tootles/tootlesCollection.js";
import { TootleExport } from "../../database/tootles/types.js";

export function parseLoginBody(body: Record<string, unknown>, res: express.Response): LoginBody | null {
  if (!body?.login || typeof body?.login !== "string") {
    res.status(400).json({
      title: "Invalid login",
      message: "Login can't be empty."
    });
    return null;
  }

  if (!body?.password || typeof body?.password !== "string") {
    res.status(400).json({
      title: "Invalid password",
      message: "Password can't be empty."
    });
    return null;
  }

  return {
    login: body.login,
    password: body.password
  };
}

export function regenerateSession(req: AuthenticatedRequest): Promise<void> {
  return new Promise((res, rej) => req.session.regenerate((localErr: Error) => (localErr ? rej(localErr) : res())));
}

export function destroySession(req: AuthenticatedRequest): Promise<void> {
  return new Promise((res, rej) => req.session.destroy((localErr: Error) => (localErr ? rej(localErr) : res())));
}

export async function authSessionIsValid(
  req: AuthenticatedRequest,
  res: express.Response
): Promise<TootleExport | null> {
  try {
    if (!req.session.tootleId) {
      res.status(401).json(NoAuthMessage);
      return null;
    }
    const tootle = await getTootleById(req.session.tootleId);
    if (!tootle) {
      await destroySession(req);
      res.status(401).json(NoAuthMessage);
      return null;
    }
    return tootle;
  } catch (localErr) {
    handleError(localErr, res);
    return null;
  }
}
