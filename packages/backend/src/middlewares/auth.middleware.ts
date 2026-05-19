import type { Context, Next } from "hono";
import { UserRepository } from "../models/user.model";

export interface AuthenticatedRequest {
  userId: number;
  userApiKey: string;
  username: string;
}

declare module "hono" {
  interface ContextVariableMap {
    user: AuthenticatedRequest;
    userId: number;
  }
}

export class AuthMiddleware {
  constructor(private userRepo: UserRepository) {}

  authenticate = async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");

    if (!authHeader) {
      return c.json({ error: "Unauthorized - No authorization header" }, 401);
    }

    if (!authHeader.startsWith("Bearer ")) {
      return c.json(
        { error: "Unauthorized - Use 'Bearer <api_key>' format" },
        401,
      );
    }

    const apiKey = authHeader.slice(7);

    if (!apiKey || apiKey.trim() === "") {
      return c.json({ error: "Unauthorized - Empty API key" }, 401);
    }

    const user = await this.userRepo.findByApiKey(apiKey);

    if (!user) {
      return c.json({ error: "Unauthorized - Invalid API key" }, 401);
    }

    c.set("user", {
      userId: user.id,
      userApiKey: user.api_key,
      username: user.username,
    });
    c.set("userId", user.id);

    await next();
  };
}
