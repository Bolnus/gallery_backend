import mongoose from "mongoose";
import { Tootle, TootleExport, TootlesSchema } from "./types.js";
import { handleDataBaseError } from "../database.js";
import { hashPassword, passwordMatchesWithHash } from "../../encrypt.js";
import { timeLog } from "../../log.js";

const TootlesModel = mongoose.model("tootles", TootlesSchema);

export async function insertTootle(tootle: Tootle): Promise<number> {
  try {
    const passwordHash = await hashPassword(tootle.password);
    await TootlesModel.create({ ...tootle, password: passwordHash });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "insertTootle");
  }
}

export async function insertManyTootles(tootles: Tootle[]): Promise<number> {
  try {
    let insertedCount = 0;
    for (const tootle of tootles) {
      const encryptedTootle = {
        ...tootle,
        password: await hashPassword(tootle.password)
      };
      const foundTootle = await TootlesModel.findOne({ name: tootle.name });
      if (foundTootle) {
        await TootlesModel.replaceOne({ _id: foundTootle._id }, encryptedTootle);
      } else {
        insertedCount++;
        await TootlesModel.insertOne(encryptedTootle);
      }
    }
    if (insertedCount) {
      timeLog(`Inserted ${insertedCount} tootles`);
    }
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "insertManyTootles");
  }
}

export async function getTootleById(tootleId: string | mongoose.Types.ObjectId): Promise<TootleExport | null> {
  try {
    const tootle = await TootlesModel.findById(tootleId);
    return tootle;
  } catch (localErr) {
    handleDataBaseError(localErr, "getTootleById");
    return null;
  }
}

export async function getTootleByName(name: string): Promise<TootleExport | null> {
  try {
    const tootle = await TootlesModel.findOne({ name });
    return tootle;
  } catch (localErr) {
    handleDataBaseError(localErr, "getTootleByName");
    return null;
  }
}

export async function getTootlesByIds(tootleIds: (string | mongoose.Types.ObjectId)[]): Promise<TootleExport[]> {
  try {
    const objectIds = tootleIds.map((id) => (typeof id === "string" ? new mongoose.Types.ObjectId(id) : id));
    const tootles: TootleExport[] = await TootlesModel.find({
      _id: { $in: objectIds }
    });
    return tootles.sort((a, b) => tootleIds.indexOf(a._id.toString()) - tootleIds.indexOf(b._id.toString()));
  } catch (localErr) {
    handleDataBaseError(localErr, "getTootlesByIds");
    return [];
  }
}

export async function getAllTootles(): Promise<TootleExport[]> {
  try {
    const tootles: TootleExport[] = await TootlesModel.find({});
    return tootles;
  } catch (localErr) {
    handleDataBaseError(localErr, "getAllTootles");
    return [];
  }
}

export async function updateTootleById(
  tootleId: string | mongoose.Types.ObjectId,
  updates: Partial<Tootle>
): Promise<number> {
  try {
    await TootlesModel.findByIdAndUpdate(tootleId, updates, { new: true, runValidators: true });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "updateTootleById");
  }
}

export async function updateTootleByName(name: string, updates: Partial<Tootle>): Promise<number> {
  try {
    await TootlesModel.findOneAndUpdate({ name }, updates, { new: true, runValidators: true });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "updateTootleByName");
  }
}

export async function updateLastLogin(tootleId: string | mongoose.Types.ObjectId, timestamp: string): Promise<number> {
  try {
    await TootlesModel.findByIdAndUpdate(tootleId, { lastLogin: timestamp }, { new: true });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "updateLastLogin");
  }
}

export async function updateLastAuth(tootleId: string | mongoose.Types.ObjectId, timestamp: string): Promise<number> {
  try {
    await TootlesModel.findByIdAndUpdate(tootleId, { lastAuth: timestamp }, { new: true });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "updateLastAuth");
  }
}

export async function deleteTootleById(tootleId: string | mongoose.Types.ObjectId): Promise<number> {
  try {
    await TootlesModel.findByIdAndDelete(tootleId);
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteTootleById");
  }
}

export async function deleteTootleByName(name: string): Promise<number> {
  try {
    await TootlesModel.findOneAndDelete({ name });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteTootleByName");
  }
}

export async function deleteTootlesByIds(tootleIds: (string | mongoose.Types.ObjectId)[]): Promise<number> {
  try {
    const objectIds = tootleIds.map((id) => (typeof id === "string" ? new mongoose.Types.ObjectId(id) : id));
    await TootlesModel.deleteMany({
      _id: { $in: objectIds }
    });
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteTootlesByIds");
  }
}

export async function deleteAllTootles(): Promise<number> {
  try {
    await TootlesModel.deleteMany({});
    return 0;
  } catch (localErr) {
    return handleDataBaseError(localErr, "deleteAllTootles");
  }
}

export async function tootleExistsByNameAndPass(name: string, password: string): Promise<TootleExport | null> {
  try {
    const tootle = await getTootleByName(name);
    if (!tootle) {
      return null;
    }
    const isValidPassword = await passwordMatchesWithHash(password, tootle.password);
    if (!isValidPassword) {
      return null;
    }
    return tootle;
  } catch (localErr) {
    handleDataBaseError(localErr, "tootleExistsByName");
    return null;
  }
}

export async function tootleExistsById(tootleId: string | mongoose.Types.ObjectId): Promise<boolean> {
  try {
    const count = await TootlesModel.countDocuments({
      _id: typeof tootleId === "string" ? new mongoose.Types.ObjectId(tootleId) : tootleId
    });
    return count > 0;
  } catch (localErr) {
    handleDataBaseError(localErr, "tootleExistsById");
    return false;
  }
}
