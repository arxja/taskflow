interface WebSocketWithMetadata extends WebSocket {
  userId?: number;
  subscribedTaskIds?: Set<number>;
}

export class WebSocketManager {
  private connections = new Map<number, Set<WebSocketWithMetadata>>(); // userId -> Set of connections
  private taskSubscribers = new Map<number, Set<WebSocketWithMetadata>>(); // taskId -> Set of connections

  addConnection(userId: number, ws: WebSocketWithMetadata) {
    ws.userId = userId;
    ws.subscribedTaskIds = new Set();

    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(ws);
  }

  removeConnection(ws: WebSocketWithMetadata) {
    if (ws.userId && this.connections.has(ws.userId)) {
      this.connections.get(ws.userId)!.delete(ws);
      if (this.connections.get(ws.userId)!.size === 0) {
        this.connections.delete(ws.userId);
      }
    }

    // Clean up task subscriptions
    if (ws.subscribedTaskIds) {
      for (const taskId of ws.subscribedTaskIds) {
        this.taskSubscribers.get(taskId)?.delete(ws);
      }
    }
  }

  subscribeToTask(ws: WebSocketWithMetadata, taskId: number) {
    if (!ws.subscribedTaskIds) return;

    ws.subscribedTaskIds.add(taskId);
    if (!this.taskSubscribers.has(taskId)) {
      this.taskSubscribers.set(taskId, new Set());
    }
    this.taskSubscribers.get(taskId)!.add(ws);
  }

  broadcastToUser(userId: number, event: string, data: any) {
    const message = JSON.stringify({ event, data });
    const connections = this.connections.get(userId);
    if (connections) {
      for (const ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }

  broadcastToTaskSubscribers(taskId: number, event: string, data: any) {
    const message = JSON.stringify({ event, data });
    const subscribers = this.taskSubscribers.get(taskId);
    if (subscribers) {
      for (const ws of subscribers) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }

  broadcastToAll(event: string, data: any) {
    const message = JSON.stringify({ event, data });
    for (const connections of this.connections.values()) {
      for (const ws of connections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      }
    }
  }
}
