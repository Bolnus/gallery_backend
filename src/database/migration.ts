import { timeLog } from "../log.js";

export async function pipeMigrationFunctions(migrateFunctions: (() => Promise<number>)[]): Promise<number> {
  for (const fn of migrateFunctions) {
    const rc = await fn();
    if (rc) {
      timeLog("BREAKING MIGRATION...");
      return 1;
    }
  }
  return 0;
}
