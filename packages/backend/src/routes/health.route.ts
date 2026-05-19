import { Hono, type Context } from "hono";

export const healthRoute = new Hono();

healthRoute.get("/", async (c) => {
  return c.json(
    {
      status: "healthy",
      timestamp: Date.now(),
      uptime: Math.floor(process.uptime()),
    },
    200,
  );
});
