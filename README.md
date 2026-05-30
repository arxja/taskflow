# TaskFlow

> Task management system with CLI, REST API, real‑time WebSockets, and offline support — built with Bun and Hono.


<div align="center"> 
  <img src="https://img.shields.io/badge/Bun-1.2+-black?logo=bun" alt="bun logo" />
  <img src="https://img.shields.io/badge/Hono-4.6+-orange" alt="hono logo"/>
  <img src="https://img.shields.io/badge/SQLite-3-blue alt="sqlite logo"/>
</div>

> [!WARNING]
> please keep in mind that this is made for **personal task management** for **Internet shutdowns in Iran**

## Overview

TaskFlow Pro is a complete task management system that works from your terminal and from the browser. It solves the problem of scattered tasks across different tools by providing a unified system that works online, offline, and syncs seamlessly.

**Key capabilities:**

- Add and manage tasks from the command line (fast)
- Visual dashboard for task management (coming soon)
- Work offline — tasks sync when you reconnect
- Real‑time updates via WebSockets
- User‑isolated data (no one sees your tasks)

## Tech Stack

| Component | Technology | Why |
|---|---|---|
| Runtime | **Bun** | Fast TypeScript execution, built‑in tools |
| Framework | **Hono** | Lightweight, fast, excellent Bun support |
| Database | **SQLite (bun:sqlite)** | Zero‑config, embedded, fast |
| Auth | **API keys** + `Bun.password` | Simple, secure, built‑in hashing |
| CLI |  | **TypeScript** + `parseArgs` | No external dependencies | 
| Testing | `bun:test` | Built‑in test runner |

## Data Flow:

1. User authenticates with API key
2. All requests go through rate limiting and logging middleware
3. Database operations use prepared statements (SQL injection safe)
4. Task changes broadcast via WebSocket to connected clients
5. CLI works offline, syncs when network available

