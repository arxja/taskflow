import type { Context } from "hono";
import { getDatabase } from "../database";
import type { Task, TaskFilters } from "../models/task.model";

class TaskClass {
  private db = getDatabase();

  getAllTasks = async (c: Context) => {
    try {
      const userId = c.get("userId");
      const filters: TaskFilters = {
        status: c.req.query("status"),
        priority: c.req.query("priority")
          ? parseInt(c.req.query("priority")!)
          : undefined,
        search: c.req.query("search"),
        page: c.req.query("page") ? parseInt(c.req.query("page")!) : undefined,
        limit: c.req.query("limit")
          ? parseInt(c.req.query("limit")!)
          : undefined,
      };

      let sql = "SELECT * FROM tasks WHERE user_id = ?";
      const params: any[] = [userId];

      if (filters.status) {
        sql += " AND status = ?";
        params.push(filters.status);
      }

      if (filters.priority) {
        sql += " AND priority = ?";
        params.push(filters.priority);
      }

      if (filters.search) {
        sql += " AND (title LIKE ? OR description LIKE ?)";
        const pattern = `%${filters.search}%`;
        params.push(pattern, pattern);
      }

      sql += " ORDER BY priority DESC, created_at DESC";

      const page = Math.max(1, filters.page || 1);
      const limit = Math.min(100, filters.limit || 20);
      const offset = (page - 1) * limit;
      sql += " LIMIT ? OFFSET ?";
      params.push(limit, offset);

      const tasks = this.db.query(sql).all(...params) as Task[];

      // Get total count for pagination
      let countSql = "SELECT COUNT(*) as total FROM tasks WHERE user_id = ?";
      const countParams: any[] = [userId];
      if (filters.status) {
        countSql += " AND status = ?";
        countParams.push(filters.status);
      }
      if (filters.priority) {
        countSql += " AND priority = ?";
        countParams.push(filters.priority);
      }
      if (filters.search) {
        countSql += " AND (title LIKE ? OR description LIKE ?)";
        countParams.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      const { total } = this.db.query(countSql).get(...countParams) as {
        total: number;
      };

      return c.json({
        tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  };

  getTaskById = async (c: Context) => {
    try {
      const userId = c.get("userId");
      const id = parseInt(c.req.param("id"));

      if (isNaN(id)) {
        return c.json({ error: "Invalid task ID" }, 400);
      }

      const task = this.db
        .query("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
        .get(id, userId) as Task | null;

      if (!task) {
        return c.json({ error: "Task not found" }, 404);
      }

      return c.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  };

  createTask = async (c: Context) => {
    try {
      const userId = c.get("userId");
      const { title, description = "", priority = 1 } = await c.req.json();

      if (!title || title.length < 3) {
        return c.json({ error: "Title must be at least 3 characters" }, 400);
      }

      if (priority < 1 || priority > 3) {
        return c.json({ error: "Priority must be 1, 2, or 3" }, 400);
      }

      const insert = this.db.prepare(`
        INSERT INTO tasks (user_id, title, description, priority)
        VALUES (?, ?, ?, ?)
      `);
      const result = insert.run(userId, title, description, priority);

      const task = this.db
        .query("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
        .get(Number(result.lastInsertRowid), userId) as Task | null;

      return c.json(task, 201);
    } catch (error) {
      console.error("Error creating task:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  };

  updateTask = async (c: Context) => {
    try {
      const userId = c.get("userId");
      const id = parseInt(c.req.param("id"));

      if (isNaN(id)) {
        return c.json({ error: "Invalid task ID" }, 400);
      }

      const data = await c.req.json();

      const fields: string[] = [];
      const values: (string | number | null)[] = [];

      if (data.title !== undefined) {
        fields.push("title = ?");
        values.push(data.title);
      }
      if (data.description !== undefined) {
        fields.push("description = ?");
        values.push(data.description);
      }
      if (data.status !== undefined) {
        if (!["pending", "in_progress", "complete"].includes(data.status)) {
          return c.json({ error: "Invalid status" }, 400);
        }
        fields.push("status = ?");
        values.push(data.status);
      }
      if (data.priority !== undefined) {
        if (data.priority < 1 || data.priority > 3) {
          return c.json({ error: "Priority must be 1, 2, or 3" }, 400);
        }
        fields.push("priority = ?");
        values.push(data.priority);
      }
      if (data.due_date !== undefined) {
        fields.push("due_date = ?");
        if (data.due_date === null) {
          values.push(null);
        } else if (
          data.due_date instanceof Date ||
          !isNaN(Date.parse(data.due_date))
        ) {
          const date = new Date(data.due_date);
          values.push(date.toISOString());
        } else {
          values.push(data.due_date);
        }
      }

      if (fields.length === 0) {
        const task = this.db
          .query("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
          .get(id, userId) as Task | null;

        if (!task) {
          return c.json({ error: "Task not found" }, 404);
        }
        return c.json(task);
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id, userId);

      const sql = `UPDATE tasks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`;
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values);

      if (result.changes === 0) {
        return c.json({ error: "Task not found" }, 404);
      }

      const updatedTask = this.db
        .query("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
        .get(id, userId) as Task | null;

      return c.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  };

  deleteTask = async (c: Context) => {
    try {
      const userId = c.get("userId");
      const id = parseInt(c.req.param("id"));

      if (isNaN(id)) {
        return c.json({ error: "Invalid task ID" }, 400);
      }

      const result = this.db.run(
        "DELETE FROM tasks WHERE id = ? AND user_id = ?",
        [id, userId],
      );

      if (result.changes === 0) {
        return c.json({ error: "Task not found" }, 404);
      }

      return c.json({ message: "Task deleted successfully" }, 200);
    } catch (error) {
      console.error("Error deleting task:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  };
}

export default TaskClass;
