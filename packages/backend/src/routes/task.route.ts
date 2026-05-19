import { Hono } from "hono";
import TaskClass from "../controllers/task.controller";

export const taskRoutes = new Hono();
const taskController = new TaskClass();

taskRoutes.get("/", (c) => taskController.getAllTasks(c));
taskRoutes.get("/:id", (c) => taskController.getTaskById(c));
taskRoutes.post("/", (c) => taskController.createTask(c));
taskRoutes.put("/:id", (c) => taskController.updateTask(c));
taskRoutes.delete("/:id", (c) => taskController.deleteTask(c));
