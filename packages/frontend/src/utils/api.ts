const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5500";

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "complete";
  priority: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskInput {
  title: string;
  description?: string;
  priority?: number;
}

export async function fetchTasks(apiKey: string): Promise<Task[]> {
  const res = await fetch(`${API_URL}/task`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) throw new Error("Failed to fetch tasks");
  const data = await res.json();
  return data.tasks;
}

export async function createTask(
  apiKey: string,
  task: TaskInput,
): Promise<Task> {
  const res = await fetch(`${API_URL}/task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(task),
  });

  if (!res.ok) throw new Error("Failed to create task");
  return res.json();
}

export async function updateTaskStatus(
  apiKey: string,
  taskId: number,
  status: string,
): Promise<Task> {
  const res = await fetch(`${API_URL}/task/${taskId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

export async function deleteTask(
  apiKey: string,
  taskId: number,
): Promise<void> {
  const res = await fetch(`${API_URL}/task/${taskId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) throw new Error("Failed to delete task");
}
