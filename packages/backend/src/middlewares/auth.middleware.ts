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
  }
}

export class AuthMiddleware {
  constructor(private userRepo: UserRepository) {}

  authenticate = async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const apiKey = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    const user = await this.userRepo.findByApiKey(apiKey);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("user", {
      userId: user.id,
      userApiKey: user.api_key,
      username: user.username,
    });

    await next();
  };
}
