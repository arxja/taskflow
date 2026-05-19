import { Hono } from "hono";
import TaskClass from "../controllers/task.controller";
import { AuthMiddleware } from "../middlewares/auth.middleware";
import { UserRepository } from "../models/user.model";
import { getDatabase } from "../database";

export const taskRoutes = new Hono();
const taskController = new TaskClass();

// Apply auth middleware to ALL task routes
const db = getDatabase();
const userRepo = new UserRepository(db);
const authMiddleware = new AuthMiddleware(userRepo);

// Protect all task routes
taskRoutes.use("*", authMiddleware.authenticate);

// Routes (your existing ones)
taskRoutes.get("/", (c) => taskController.getAllTasks(c));
taskRoutes.get("/:id", (c) => taskController.getTaskById(c));
taskRoutes.post("/", (c) => taskController.createTask(c));
taskRoutes.put("/:id", (c) => taskController.updateTask(c));
taskRoutes.delete("/:id", (c) => taskController.deleteTask(c));
