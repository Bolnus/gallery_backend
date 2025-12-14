import express from "express";

export interface LoginBody {
  login: string;
  password: string;
}

export interface TootleSession {
  name?: string;
  tootleId?: string;
}

export interface AuthenticatedRequest extends express.Request<unknown, unknown, Record<string, unknown>> {
  session: express.Request["session"] & TootleSession;
}
