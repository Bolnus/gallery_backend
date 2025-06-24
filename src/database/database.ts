import mongoose from "mongoose";
import { timeLog, timeWarn } from "../log.js";

// let dbClient: Mongoose;

export async function connectToDB(connectionString: string): Promise<void> {
  try {
    await mongoose.connect(connectionString);
    timeLog(`Connected to DB: ${connectionString}`);
  } catch (localErr: unknown) {
    handleDataBaseError(localErr, "Mongoose connection error");
    process.exit(1);
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
