import mongoose, { InferSchemaType } from "mongoose";
import { DocumentObjectId } from "../databaseTypes.js";

export const TootlesSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  lastLogin: { type: String, required: false },
  lastAuth: { type: String, required: false }
});

export type Tootle = InferSchemaType<typeof TootlesSchema>;
export type TootleExport = Tootle & DocumentObjectId;
