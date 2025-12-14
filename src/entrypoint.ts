import { TCPServer } from "./http/tcp-server";
import { logger } from "./utils/logger";

const server = new TCPServer({
  host: "127.0.0.1",
  port: 3000,
  timeout: 30000,
});

const router = server.getRouter();

router.get("/", (ctx) => {
  ctx.res.json({
    message: "Welcome to Custom HTTP Server!",
    version: "1.0.0",
    endpoints: [
      "GET /",
      "GET /api/users",
      "GET /api/users/:id",
      "POST /api/users",
      "GET /api/health",
    ],
  });
});

router.get("/api/health", (ctx) => {
  ctx.res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

router.get("/api/users", (ctx) => {
  ctx.res.json({
    users: [
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ],
  });
});

router.get("/api/users/:id", (ctx) => {
  const userId = ctx.params.id;

  ctx.res.json({
    user: {
      id: parseInt(userId),
      name: `User ${userId}`,
    },
  });
});

router.post("/api/users", (ctx) => {
  const body = ctx.req.body?.parsed || {};

  ctx.res.status(201).json({
    message: "User created",
    user: {
      id: 3,
      ...body,
    },
  });
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled Rejection");
  process.exit(1);
});

server.start();
