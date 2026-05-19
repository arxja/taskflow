import { Database } from "bun:sqlite";

let dbInstance: Database | null = null;

export function getDatabase(): Database {
  if (!dbInstance) {
    dbInstance = new Database(Bun.env.DATABASE_URL || "taskflow.db");
    dbInstance.exec("PRAGMA foreign_keys = ON");
  }
  return dbInstance;
}
