import express from "express";
import { timeLog, timeWarn } from "../../log.js";
import { getEnvDefaultTootles } from "../../env.js";
import {
  insertManyTootles,
  tootleExistsByNameAndPass,
  updateLastAuth,
  updateLastLogin
} from "../../database/tootles/tootlesCollection.js";
import { handleError } from "../commonRequests.js";
import { authSessionIsValid, destroySession, parseLoginBody, regenerateSession } from "./utils.js";
import { AuthenticatedRequest } from "./types.js";
import { SESSION_ID_KEY } from "./consts.js";

export async function generateDefaultTootlesRequest(
  req: express.Request<unknown, unknown, unknown>,
  res: express.Response
): Promise<void> {
  timeLog(`POST | ${req.path}`);

  try {
    const defaultTootles = getEnvDefaultTootles();
    if (!defaultTootles) {
      timeWarn("generateDefaultTootlesRequest empty ENV");
      res.sendStatus(400);
      return;
    }
    const rc = await insertManyTootles(defaultTootles);
    if (rc) {
      timeWarn("DB tootles save error");
      res.sendStatus(500);
      return;
    }
    res.sendStatus(200);
  } catch (localErr) {
    handleError(localErr, res);
  }
}

export async function tootleLoginRequest(
  req: AuthenticatedRequest,
  res: express.Response<Record<string, unknown>>
): Promise<void> {
  timeLog(`POST | ${req.path}`);

  try {
    const loginBody = parseLoginBody(req.body, res);
    if (!loginBody) {
      return;
    }
    const validTootle = await tootleExistsByNameAndPass(loginBody.login, loginBody.password);
    if (!validTootle) {
      res.status(403).json({
        title: "Invalid credentials",
        message: "Login or password don't match."
      });
      return;
    }

    await regenerateSession(req);

    req.session.tootleId = validTootle._id.toString();
    req.session.name = validTootle.name;
    res.json({
      user: validTootle.name
    });
    await updateLastLogin(validTootle._id, new Date().toISOString());
  } catch (localErr) {
    handleError(localErr, res);
  }
}

export async function tootleLogoutRequest(req: AuthenticatedRequest, res: express.Response): Promise<void> {
  timeLog(`POST | ${req.path}`);

  try {
    await destroySession(req);
    res.clearCookie(SESSION_ID_KEY);
    res.sendStatus(200);
  } catch (localErr) {
    handleError(localErr, res);
  }
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: express.Response<Record<string, unknown>>,
  next: () => void
): Promise<void> {
  const validTootle = await authSessionIsValid(req, res);
  if (validTootle) {
    next();
    await updateLastAuth(validTootle._id, new Date().toISOString());
  } else {
    timeLog(`invalid session ${JSON.stringify(req.session, null, 2)}`);
  }
}

export async function getTootleRequest(req: AuthenticatedRequest, res: express.Response): Promise<void> {
  timeLog(`GET | ${req.path}, ${req.session.tootleId?.substring(0, 10)}`);

  const validTootle = await authSessionIsValid(req, res);
  if (validTootle) {
    if (validTootle.name !== req.session.name) {
      req.session.name = validTootle.name;
    }
    res.json({ user: validTootle.name });
  }
}
