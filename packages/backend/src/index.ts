import { createApp } from "./app";
import { runMigrations } from "./database/migrate";

const app = createApp();

// Run migrate
runMigrations().catch(console.error);

export default {
  port: 5500,
  fetch: app.fetch,
};
