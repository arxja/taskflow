import type { Context } from "hono";
import { UserRepository } from "../models/user.model";
import { Database } from "bun:sqlite";
import { getDatabase } from "../database";

interface authReq {
  username: string;
  password: string;
}

class AuthController {
  private db = getDatabase();
  private userRepo = new UserRepository(this.db);
  register = async (c: Context) => {
    try {
      const { username, password } = await c.req.json<authReq>();
      if (!username || username.length < 3) {
        return c.json({ error: "Username must be at least 3 characters" }, 400);
      }
      if (!password || password.length < 6) {
        return c.json({ error: "Password must be at least 6 characters" }, 400);
      }
      const existing = await this.userRepo.findByUsername(username);
      if (existing) {
        return c.json({ error: "Username already exist" }, 409);
      }
      const passwordHash = await Bun.password.hash(password);
      const user = await this.userRepo.create(username, passwordHash);

      return c.json(
        {
          message: "User created",
          user: { id: user.id, username: user.username, api_key: user.api_key },
        },
        201,
      );
    } catch (error) {
      console.error("Registration error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  };
  login = async (c: Context) => {
    const { username, password } = await c.req.json<authReq>();
    const user = await this.userRepo.findByUsername(username);
    if (!user) {
      return c.json(
        {
          error: "Invalid credentials",
        },
        401,
      );
    }
    const ok = await Bun.password.verify(password, user.password_hash);
    if (!ok) {
      return c.json(
        {
          error: "Invalid credentials",
        },
        401,
      );
    }
    return c.json(
      {
        message: "Login successful",
        user: { id: user.id, username: user.username, api_key: user.api_key },
      },
      200,
    );
  };
}

export default AuthController;
