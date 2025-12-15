import mongoose from "mongoose";
import { timeLog, timeWarn } from "../log.js";
import { getEnvConnectionString, getEnvGalleryName } from "../env.js";

// let dbClient: Mongoose;

export async function connectToDB(): Promise<typeof mongoose | null> {
  try {
    const connectionString = getEnvConnectionString();
    const client = await mongoose.connect(connectionString, { dbName: getEnvGalleryName() });
    timeLog(`Connected to DB: ${connectionString}`);
    return client;
  } catch (localErr: unknown) {
    handleDataBaseError(localErr, "Mongoose connection error");
    return null;
  }
}

export function handleDataBaseError(localErr: unknown, errorName: string): number {
  timeWarn(`${errorName} error!`);
  console.log(localErr);
  return 1;
}

export function mapObjectIdsToString(document: { _id: mongoose.Types.ObjectId }): string {
  return document._id.toString();
}
