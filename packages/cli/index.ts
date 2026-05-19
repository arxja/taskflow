#!/usr/bin/env bun

import { Database } from "bun:sqlite";
import { parseArgs } from "util";
import chalk from "chalk";

const args = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    api: { type: "string", short: "a" },
    sync: { type: "boolean", short: "s" },
  },
  allowPositionals: true,
});

const command = args.positionals[0];
const apiUrl =
  args.values.api || Bun.env.TASKFLOW_API_URL || "http://localhost:5500";

const localDb = new Database("taskflow-local.db");
localDb.run(`
  CREATE TABLE IF NOT EXISTS local_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remote_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 1,
    synced INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

function getPrioritySymbol(priority: number): string {
  if (priority === 1) return chalk.red("!");
  if (priority === 2) return chalk.yellow("-");
  return chalk.green("↓");
}

function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return chalk.yellow(status);
    case "in_progress":
      return chalk.blue(status);
    case "complete":
      return chalk.green(status);
    default:
      return status;
  }
}

async function syncWithServer(apiKey: string) {
  console.log(chalk.blue("Syncing with server..."));

  const unsynced = localDb
    .query("SELECT * FROM local_tasks WHERE synced = 0 AND remote_id IS NULL")
    .all();

  for (const task of unsynced) {
    const res = await fetch(`${apiUrl}/task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        title: task.title,
        description: task.description,
        priority: task.priority,
      }),
    });

    if (res.ok) {
      const created = await res.json();
      localDb.run(
        "UPDATE local_tasks SET synced = 1, remote_id = ? WHERE id = ?",
        [created.id, task.id],
      );
      console.log(chalk.green(`  Synced: ${task.title}`));
    } else {
      console.log(chalk.red(`  Failed to sync: ${task.title}`));
    }
  }

  const res = await fetch(`${apiUrl}/task`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (res.ok) {
    const { tasks } = await res.json();
    for (const task of tasks) {
      const exists = localDb
        .query("SELECT id FROM local_tasks WHERE remote_id = ?")
        .get(task.id);
      if (!exists) {
        localDb.run(
          `
          INSERT INTO local_tasks (remote_id, title, description, status, priority, synced) 
          VALUES (?, ?, ?, ?, ?, 1)
        `,
          [task.id, task.title, task.description, task.status, task.priority],
        );
        console.log(chalk.blue(`  Pulled: ${task.title}`));
      }
    }
    console.log(chalk.green("Sync completed"));
  } else {
    console.log(chalk.red("Failed to pull tasks from server"));
  }
}

async function addTask(
  apiKey: string | undefined,
  title: string,
  description: string,
  priority: number = 1,
) {
  if (apiKey && !args.values.sync) {
    const res = await fetch(`${apiUrl}/task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ title, description, priority }),
    });

    if (res.ok) {
      const task = await res.json();
      console.log(chalk.green(`Task created: ${task.title} (ID: ${task.id})`));
    } else {
      console.log(chalk.red("Failed to create task online, saving locally"));
      localDb.run(
        "INSERT INTO local_tasks (title, description, priority, synced) VALUES (?, ?, ?, 0)",
        [title, description, priority],
      );
    }
  } else {
    localDb.run(
      "INSERT INTO local_tasks (title, description, priority, synced) VALUES (?, ?, ?, 0)",
      [title, description, priority],
    );
    console.log(chalk.yellow(`Task saved locally: ${title}`));
    if (!apiKey) {
      console.log(chalk.gray("  Set TASKFLOW_API_KEY to sync with server"));
    } else {
      console.log(chalk.gray("  Run with --sync to push to server"));
    }
  }
}

async function listTasks(apiKey: string | undefined) {
  if (apiKey && !args.values.sync) {
    const res = await fetch(`${apiUrl}/task`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.ok) {
      const { tasks } = await res.json();
      if (tasks && tasks.length > 0) {
        console.log(chalk.bold("\nTasks from server:"));
        for (const task of tasks) {
          const prioritySymbol = getPrioritySymbol(task.priority);
          const priorityText =
            task.priority === 1 ? "High" : task.priority === 2 ? "Med" : "Low";
          console.log(
            `  ${prioritySymbol} #${task.id}. ${chalk.bold(task.title)} [${getStatusColor(task.status)}] (${priorityText})`,
          );
          if (task.description) {
            console.log(chalk.gray(`      ${task.description}`));
          }
        }
      } else {
        console.log(chalk.yellow("\nNo tasks on server"));
      }
    } else if (res.status === 401) {
      console.log(
        chalk.red("Invalid API key. Please check your TASKFLOW_API_KEY"),
      );
    } else {
      console.log(chalk.red("Failed to fetch tasks from server"));
    }
  } else {
    console.log(chalk.gray("\nRun with TASKFLOW_API_KEY to see server tasks"));
  }

  const unsynced = localDb
    .query("SELECT * FROM local_tasks WHERE synced = 0")
    .all();

  if (unsynced.length > 0) {
    console.log(chalk.yellow.bold("\nLocal unsynced tasks:"));
    for (const task of unsynced) {
      const prioritySymbol = getPrioritySymbol(task.priority);
      const statusText = task.remote_id
        ? chalk.yellow("needs update")
        : chalk.cyan("new");
      console.log(
        `  ${prioritySymbol} ${chalk.bold(task.title)} [${statusText}]`,
      );
      if (task.description) {
        console.log(chalk.gray(`      ${task.description}`));
      }
    }
  }
}

async function deleteTask(apiKey: string | undefined, taskId: number) {
  if (apiKey && !args.values.sync) {
    const res = await fetch(`${apiUrl}/task/${taskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.ok) {
      console.log(chalk.green(`Task ${taskId} deleted from server`));
    } else if (res.status === 404) {
      console.log(chalk.red(`Task ${taskId} not found on server`));
    } else if (res.status === 401) {
      console.log(chalk.red("Invalid API key"));
    } else {
      console.log(chalk.red(`Failed to delete task ${taskId}`));
    }
  } else {
    console.log(chalk.yellow(`Local task ${taskId} marked for deletion`));
    localDb.run("DELETE FROM local_tasks WHERE id = ?", [taskId]);
  }
}

async function updateTask(
  apiKey: string | undefined,
  taskId: number,
  status: string,
) {
  const validStatuses = ["pending", "in_progress", "complete"];
  if (!validStatuses.includes(status)) {
    console.log(chalk.red(`Invalid status. Use: ${validStatuses.join(", ")}`));
    return;
  }

  if (apiKey && !args.values.sync) {
    const res = await fetch(`${apiUrl}/task/${taskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      const task = await res.json();
      console.log(
        chalk.green(`Task ${taskId} updated to "${task.status}" on server`),
      );
    } else if (res.status === 404) {
      console.log(chalk.red(`Task ${taskId} not found on server`));
    } else if (res.status === 401) {
      console.log(chalk.red("Invalid API key"));
    } else {
      console.log(chalk.red(`Failed to update task ${taskId}`));
    }
  } else {
    console.log(
      chalk.yellow(
        `Local task ${taskId} marked for status update to "${status}"`,
      ),
    );
    localDb.run("UPDATE local_tasks SET status = ?, synced = 0 WHERE id = ?", [
      status,
      taskId,
    ]);
  }
}

async function main() {
  const apiKey = Bun.env.TASKFLOW_API_KEY;

  if (args.values.sync) {
    if (!apiKey) {
      console.log(
        chalk.red("TASKFLOW_API_KEY environment variable required for sync"),
      );
      console.log(
        chalk.gray(
          "  Export your API key: export TASKFLOW_API_KEY=tf_xxxxxxxxxxxxx",
        ),
      );
      process.exit(1);
    }
    await syncWithServer(apiKey);
    return;
  }

  switch (command) {
    case "add":
      const title = args.positionals[1];
      const description = args.positionals[2] || "";
      const priority = parseInt(args.positionals[3]) || 1;
      if (!title) {
        console.log(
          chalk.red("Usage: taskflow add <title> [description] [priority]"),
        );
        console.log(
          chalk.gray("  priority: 1=High, 2=Medium, 3=Low (default: 1)"),
        );
        process.exit(1);
      }
      await addTask(apiKey, title, description, priority);
      break;

    case "list":
      await listTasks(apiKey);
      break;

    case "delete":
      const taskId = parseInt(args.positionals[1]);
      if (isNaN(taskId)) {
        console.log(chalk.red("Usage: taskflow delete <task_id>"));
        process.exit(1);
      }
      await deleteTask(apiKey, taskId);
      break;

    case "update":
      const updateId = parseInt(args.positionals[1]);
      const status = args.positionals[2];
      if (isNaN(updateId) || !status) {
        console.log(chalk.red("Usage: taskflow update <task_id> <status>"));
        console.log(chalk.gray("  status: pending, in_progress, complete"));
        process.exit(1);
      }
      await updateTask(apiKey, updateId, status);
      break;

    case "sync":
      if (!apiKey) {
        console.log(
          chalk.red("TASKFLOW_API_KEY environment variable required"),
        );
        console.log(
          chalk.gray(
            "  Export your API key: export TASKFLOW_API_KEY=tf_xxxxxxxxxxxxx",
          ),
        );
        process.exit(1);
      }
      await syncWithServer(apiKey);
      break;

    default:
      console.log(
        chalk.bold(`
TaskFlow CLI - Offline-first Task Management

Commands:
`),
      );
      console.log(
        chalk.cyan("  add") +
          chalk.gray(" <title> [description] [priority]  ") +
          "Add a new task",
      );
      console.log(
        chalk.cyan("  list") +
          chalk.gray("                                   ") +
          "List all tasks",
      );
      console.log(
        chalk.cyan("  update") +
          chalk.gray(" <task_id> <status>             ") +
          "Update task status",
      );
      console.log(
        chalk.cyan("  delete") +
          chalk.gray(" <task_id>                       ") +
          "Delete a task",
      );
      console.log(
        chalk.cyan("  sync") +
          chalk.gray("                                   ") +
          "Sync with server",
      );
      console.log(
        chalk.bold(`
Options:
`),
      );
      console.log(
        chalk.cyan("  --api, -a") +
          chalk.gray(" <url>      ") +
          "API server URL (default: http://localhost:5500)",
      );
      console.log(
        chalk.cyan("  --sync, -s") +
          chalk.gray("           ") +
          "Force sync mode",
      );
      console.log(
        chalk.bold(`
Environment Variables:
`),
      );
      console.log(
        chalk.cyan("  TASKFLOW_API_URL") +
          chalk.gray("     ") +
          "API server URL (default: http://localhost:5500)",
      );
      console.log(
        chalk.cyan("  TASKFLOW_API_KEY") +
          chalk.gray("     ") +
          "Your API key for authentication",
      );
      console.log(
        chalk.bold(`
Examples:
`),
      );
      console.log(chalk.gray("  # Set your API key"));
      console.log(`  export TASKFLOW_API_KEY=tf_a5781e7d1a5641949daf9170eac0d72b
`);
      console.log(chalk.gray("  # Add a task"));
      console.log(`  taskflow add "Complete WebSocket" "Implement real-time updates" 1
`);
      console.log(chalk.gray("  # List tasks"));
      console.log(`  taskflow list
`);
      console.log(chalk.gray("  # Update task status"));
      console.log(`  taskflow update 2 complete
`);
      console.log(chalk.gray("  # Delete a task"));
      console.log(`  taskflow delete 3
`);
      console.log(chalk.gray("  # Sync offline changes"));
      console.log(`  taskflow sync`);
  }
}

main().catch(console.error);
