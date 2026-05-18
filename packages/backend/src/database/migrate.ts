#!/usr/bin/env bun
import { Database } from "bun:sqlite";
import chalk from "chalk";
import { readdir } from "node:fs/promises";
import path from "node:path";

const db = new Database("taskflow.db");

// Create migrations tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export async function runMigrations() {
  const migrationsDir = path.join(import.meta.dir, "migrations");
  const files = await readdir(migrationsDir);
  const migrationFiles = files.filter((f) => f.endsWith(".ts")).sort();

  const executed = db.query("SELECT name FROM migrations").all() as {
    name: string;
  }[];
  const executedNames = new Set(executed.map((e) => e.name));

  for (const file of migrationFiles) {
    if (!executedNames.has(file)) {
      console.log(`Running migration: ${file}`);
      const { up } = await import(path.join(migrationsDir, file));
      up(db);
      db.run("INSERT INTO migrations (name) VALUES (?)", [file]);
      console.log(`✅ Completed: ${file}`);
    }
  }

  console.log(chalk.green("All migrations completed"));
}