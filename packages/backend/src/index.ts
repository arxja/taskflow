import { createApp } from "./app";
import { runMigrations } from "./database/migrate";
import { cleanupWebSocket, handleWebSocketMessage, setupWebSocket } from "./websocket/handlers";

const PORT = parseInt(process.env.PORT || "5500");

const app = createApp();

// Run migrate
runMigrations().catch(console.error);

const server = Bun.serve({
  port: 5500,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws") {
      const upgraded = server.upgrade(req);
      if (upgraded) {
        return;
      }
      return new Response("WebSocket upgrade failed", { status: 500 });
    }
    return app.fetch(req);
  },
  websocket: {
    open(ws) {
      setupWebSocket(ws);
    },
    message(ws, message) {
      handleWebSocketMessage(ws, message);
    },
    close(ws) {
      cleanupWebSocket(ws);
      console.log(`[WS] Client disconnected`);
    },
  },
});

console.log(`✅ Taskflow Server running at http://localhost:${PORT}`);
console.log(`   REST API: http://localhost:${PORT}/`);
console.log(`   WebSocket: ws://localhost:${PORT}/ws`);
console.log(`   Health: http://localhost:${PORT}/health`);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Shutting down...");
  server.stop();
  process.exit(0);
});
