import mongoose from "mongoose";

export interface DocumentObjectId 
{
  _id: mongoose.Types.ObjectId;
};

export const countStage: mongoose.PipelineStage = {
  $count: "totalCount",
};

export interface CountResult {
  totalCount: number;
}