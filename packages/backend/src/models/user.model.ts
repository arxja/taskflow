import { Database } from "bun:sqlite";
import { randomUUID } from "crypto";

export interface User {
  id: number;
  username: string;
  password_hash: string;
  api_key: string;
  created_at: Date;
}

export class UserRepository {
  constructor(private db: Database) {}

  async findByApiKey(apiKey: string): Promise<User | null> {
    return this.db
      .query("SELECT * FROM users WHERE api_key = ?")
      .get(apiKey) as User | null;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.db
      .query("SELECT * FROM users WHERE username = ?")
      .get(username) as User | null;
  }

  async create(username: string, passwordHash: string): Promise<User> {
    const apiKey = `tf_${randomUUID().replace(/-/g, "")}`;
    const insert = this.db.prepare(`
      INSERT INTO users (username, password_hash, api_key) 
      VALUES (?, ?, ?)
    `);
    const result = insert.run(username, passwordHash, apiKey);
    const user = await this.findByApiKey(apiKey);
    if (!user) {
      throw new Error("Failed to create user");
    }
    return user;
  }

  async regenerateApiKey(userId: number): Promise<string> {
    const newApiKey = `tf_${randomUUID().replace(/-/g, "")}`;
    this.db.run("UPDATE users SET api_key = ? WHERE id = ?", [
      newApiKey,
      userId,
    ]);
    return newApiKey;
  }
}
