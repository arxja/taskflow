import { Hono } from "hono";
import AuthController from "../controllers/auth.controller";

export const authRoutes = new Hono();
const { register, login } = new AuthController();

authRoutes.post("/register", (c) => register(c));
authRoutes.post("/login", (c) => login(c));
