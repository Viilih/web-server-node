import * as net from "net";
import { Router } from "../router";
import { SERVER_DEFAULTS } from "../utils/consts";
import { HTTPParser } from "./parsers/http";
import { ResponseBuilder } from "./response-builder";
import { RequestBuffer } from "./buffer/request-buffer";
import { serverLogger } from "../utils/logger";
import type { Connection, ServerConfig } from "../core/types";

export class TCPServer {
  private port: number;
  private host: string;
  private timeout: number;
  private server: net.Server | null = null;
  private connections: Map<string, Connection> = new Map();
  private connectionCount: number = 0;
  private router: Router;

  constructor(config: Partial<ServerConfig> = {}) {
    this.port = config.port || SERVER_DEFAULTS.PORT;
    this.host = config.host || SERVER_DEFAULTS.HOST;
    this.timeout = config.timeout || SERVER_DEFAULTS.TIMEOUT;
    this.router = new Router();
  }

  getRouter(): Router {
    return this.router;
  }

  start(): void {
    serverLogger.info("━".repeat(60));
    serverLogger.info("🚀 Starting HTTP server...");
    serverLogger.info("━".repeat(60));

    this.server = net.createServer((socket: net.Socket) => {
      this.handleConnection(socket);
    });

    this.server.listen(this.port, this.host, () => {
      serverLogger.info({
        port: this.port,
        host: this.host,
        msg: "✅ Listening for connections",
      });

      const routes = this.router.listRoutes();
      if (routes.length > 0) {
        serverLogger.info(`📋 Registered routes: ${routes.length}`);
        routes.forEach((route) => {
          serverLogger.debug(`   ${route.method} ${route.path}`);
        });
      }

      serverLogger.info("━".repeat(60));
    });

    this.server.on("error", (err: Error) => {
      serverLogger.error({ err }, "❌ Erro no servidor");
    });

    this.setupShutdownHandlers();
  }

  private handleConnection(socket: net.Socket): void {
    const connectionId = `${socket.remoteAddress}:${socket.remotePort}`;
    const connection: Connection = {
      id: connectionId,
      socket,
      buffer: new RequestBuffer(),
      createdAt: new Date(),
    };

    this.connections.set(connectionId, connection);
    this.connectionCount++;

    serverLogger.info({
      connectionId,
      totalActive: this.connections.size,
      totalProcessed: this.connectionCount,
      msg: "🔗 Nova conexão",
    });

    socket.on("data", (chunk: Buffer) => {
      this.handleData(connection, chunk);
    });

    socket.on("error", (err: Error) => {
      serverLogger.error({
        connectionId,
        err: err.message,
        msg: "⚠️ Erro no socket",
      });
    });

    socket.on("close", () => {
      this.connections.delete(connectionId);
      serverLogger.info({
        connectionId,
        totalActive: this.connections.size,
        msg: "👋 Conexão fechada",
      });
    });

    socket.setTimeout(this.timeout);
    socket.on("timeout", () => {
      serverLogger.warn({
        connectionId,
        msg: "⏱️ Timeout - fechando",
      });
      socket.end();
    });
  }

  private handleData(connection: Connection, chunk: Buffer): void {
    serverLogger.debug({
      connectionId: connection.id,
      chunkSize: chunk.length,
      msg: "📨 Chunk recebido",
    });

    const rawRequest = connection.buffer.feedBuffer(chunk);

    if (rawRequest !== null) {
      serverLogger.info({
        connectionId: connection.id,
        msg: "✨ Request HTTP completa",
      });

      const parseResult = HTTPParser.parse(rawRequest);

      if (parseResult.success && parseResult.data) {
        this.handleHTTPRequest(connection, parseResult.data);
      } else {
        this.sendErrorResponse(
          connection.socket,
          parseResult.error?.statusCode || 400,
          parseResult.error?.message || "Bad Request"
        );
      }

      connection.buffer.reset();
    }
  }

  private handleHTTPRequest(connection: Connection, request: any): void {
    serverLogger.info({
      connectionId: connection.id,
      method: request.method,
      path: request.path,
      msg: "🔄 Processando request",
    });

    const routeMatch = this.router.match(request);

    if (!routeMatch) {
      this.sendErrorResponse(
        connection.socket,
        404,
        `Route not found: ${request.method} ${request.path}`
      );
      return;
    }

    const res = new ResponseBuilder();

    const ctx = {
      req: request,
      res,
      params: routeMatch.params,
      query: request.query,
    };

    try {
      const result = routeMatch.handler(ctx);

      if (result instanceof Promise) {
        result
          .then(() => this.sendResponse(connection.socket, res))
          .catch((err) => {
            serverLogger.error({
              connectionId: connection.id,
              err,
              msg: "❌ Erro no handler",
            });
            this.sendErrorResponse(
              connection.socket,
              500,
              "Internal Server Error"
            );
          });
      } else {
        this.sendResponse(connection.socket, res);
      }
    } catch (err) {
      serverLogger.error({
        connectionId: connection.id,
        err,
        msg: "❌ Erro ao executar handler",
      });
      this.sendErrorResponse(connection.socket, 500, "Internal Server Error");
    }
  }

  private sendResponse(socket: net.Socket, res: ResponseBuilder): void {
    const response = res.build();
    socket.write(response);
    socket.end();

    serverLogger.debug({
      responseLength: response.length,
      msg: "✅ Resposta enviada",
    });
  }

  private sendErrorResponse(
    socket: net.Socket,
    statusCode: number,
    message: string
  ): void {
    const res = new ResponseBuilder().error(statusCode, message);
    this.sendResponse(socket, res);

    serverLogger.warn({
      statusCode,
      message,
      msg: "⚠️ Erro enviado",
    });
  }

  private setupShutdownHandlers(): void {
    const shutdown = () => {
      serverLogger.warn("\n" + "━".repeat(60));
      serverLogger.warn("🛑 Shutdown iniciado");

      if (this.server) {
        this.server.close(() => {
          serverLogger.info(`📊 Total conexões: ${this.connectionCount}`);
          process.exit(0);
        });
      }

      this.connections.forEach((conn) => {
        conn.socket.end();
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
}
