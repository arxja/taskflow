import type { ServerWebSocket } from "bun";
import { wsManager, type WebSocketWithMetadata } from "./manager";

export function setupWebSocket(ws: ServerWebSocket<unknown>) {
  // Cast to our extended type
  const wsWithMeta = ws as WebSocketWithMetadata;

  console.log(`[WS] Client connected`);
  wsWithMeta.send(
    JSON.stringify({
      event: "connected",
      data: { message: "WebSocket connected" },
    }),
  );
}

export function handleWebSocketMessage(
  ws: ServerWebSocket<unknown>,
  message: string | Buffer,
) {
  // Cast to our extended type
  const wsWithMeta = ws as WebSocketWithMetadata;

  try {
    const data = JSON.parse(message.toString());

    switch (data.type) {
      case "auth":
        if (data.userId) {
          wsManager.addConnection(data.userId, wsWithMeta);
          wsWithMeta.send(
            JSON.stringify({
              event: "authenticated",
              data: { success: true, userId: data.userId },
            }),
          );
          console.log(`[WS] User ${data.userId} authenticated`);
        }
        break;

      case "subscribe_task":
        if (data.taskId && wsWithMeta.userId) {
          wsManager.subscribeToTask(wsWithMeta, data.taskId);
          wsWithMeta.send(
            JSON.stringify({
              event: "subscribed",
              data: { taskId: data.taskId },
            }),
          );
          console.log(
            `[WS] User ${wsWithMeta.userId} subscribed to task ${data.taskId}`,
          );
        }
        break;

      case "unsubscribe_task":
        if (data.taskId && wsWithMeta.userId) {
          wsManager.unsubscribeFromTask(wsWithMeta, data.taskId);
          wsWithMeta.send(
            JSON.stringify({
              event: "unsubscribed",
              data: { taskId: data.taskId },
            }),
          );
        }
        break;

      case "ping":
        wsWithMeta.send(
          JSON.stringify({ event: "pong", data: { timestamp: Date.now() } }),
        );
        break;

      default:
        console.log(`[WS] Unknown message type:`, data.type);
    }
  } catch (error) {
    console.error("[WS] Error handling message:", error);
    wsWithMeta.send(
      JSON.stringify({
        event: "error",
        data: { message: "Invalid message format" },
      }),
    );
  }
}

export function cleanupWebSocket(ws: ServerWebSocket<unknown>) {
  const wsWithMeta = ws as WebSocketWithMetadata;
  wsManager.removeConnection(wsWithMeta);
  console.log(`[WS] Client disconnected`);
}
