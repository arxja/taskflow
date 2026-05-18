import { Database } from "bun:sqlite";

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "complete";
  priority: 1 | 2 | 3;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TaskFilters {
  status?: string;
  priority?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export class TaskRepository {
  constructor(private db: Database) {}

  findAllByUser(userId: number, filters: TaskFilters = {}) {
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

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  findById(id: number, userId: number): Task | null {
    return this.db
      .query("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
      .get(id, userId) as Task | null;
  }

  create(
    userId: number,
    title: string,
    description: string = "",
    priority: number = 1,
  ): Task {
    const insert = this.db.prepare(`
      INSERT INTO tasks (user_id, title, description, priority) 
      VALUES (?, ?, ?, ?)
    `);
    const result = insert.run(userId, title, description, priority);
    return this.findById(Number(result.lastInsertRowid), userId) as Task;
  }

  update(
    id: number,
    userId: number,
    data: Partial<
      Pick<Task, "title" | "description" | "status" | "priority" | "due_date">
    >,
  ): Task | null {
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
      fields.push("status = ?");
      values.push(data.status);
    }
    if (data.priority !== undefined) {
      fields.push("priority = ?");
      values.push(data.priority);
    }
    if (data.due_date !== undefined) {
      fields.push("due_date = ?");
      values.push(data.due_date ? data.due_date.toISOString() : null);
    }

    if (fields.length === 0) return this.findById(id, userId);

    fields.push("updated_at = CURRENT_TIMESTAMP");

    const sql = `UPDATE tasks SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`;

    const stmt = this.db.prepare(sql);
    stmt.run(...values, id, userId);

    return this.findById(id, userId);
  }

  delete(id: number, userId: number): boolean {
    const result = this.db.run(
      "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      [id, userId],
    );
    return result.changes > 0;
  }
}
