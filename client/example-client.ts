import * as net from "net";
import { clientLogger as logger } from "../utils/logger";

interface HTTPResponse {
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string>;
  body: string;
}

class HTTPClient {
  private socket: net.Socket;

  constructor(host: string, port: number) {
    this.socket = new net.Socket();
    this.socket.connect(port, host);
  }

  async sendHTTPRequest(
    method: string,
    path: string,
    headers: Record<string, string> = {},
    body: string = ""
  ): Promise<HTTPResponse> {
    return new Promise((resolve, reject) => {
      // Construir request HTTP
      const headerLines = Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\r\n");

      const request =
        `${method} ${path} HTTP/1.1\r\n` +
        `${headerLines}\r\n` +
        `\r\n` +
        `${body}`;

      logger.info({
        method,
        path,
        headersCount: Object.keys(headers).length,
        bodyLength: body.length,
        msg: "📤 Enviando HTTP request",
      });

      // ✅ Mostrar headers enviados em JSON
      logger.info({
        msg: "📋 Headers enviados:",
        headers: JSON.stringify(headers, null, 2),
      });

      logger.debug({
        request: request.replace(/\r\n/g, "↵\n"),
        msg: "Request completa (raw)",
      });

      // Receber resposta
      this.socket.once("data", (response: Buffer) => {
        const responseText = response.toString("utf-8");

        logger.info({
          responseLength: responseText.length,
          msg: "📥 Resposta recebida",
        });

        // ✅ Parsear resposta HTTP
        const parsedResponse = this.parseHTTPResponse(responseText);

        // ✅ Mostrar resposta estruturada
        logger.info({
          msg: "📊 Resposta parseada:",
          statusCode: parsedResponse.statusCode,
          statusMessage: parsedResponse.statusMessage,
        });

        logger.info({
          msg: "📋 Headers recebidos:",
          headers: JSON.stringify(parsedResponse.headers, null, 2),
        });

        if (parsedResponse.body) {
          logger.info({
            msg: "📄 Body recebido:",
            body: parsedResponse.body,
          });
        }

        this.socket.end();
        resolve(parsedResponse);
      });

      this.socket.on("error", (err) => {
        logger.error({ err }, "❌ Erro no socket");
        reject(err);
      });

      this.socket.on("connect", () => {
        logger.info("🔗 Conectado ao servidor");
        this.socket.write(request);
      });
    });
  }

  /**
   * ✅ Parse resposta HTTP em objeto estruturado
   */
  private parseHTTPResponse(responseText: string): HTTPResponse {
    const lines = responseText.split("\r\n");

    // Parse status line: "HTTP/1.1 200 OK"
    const statusLine = lines[0] || "";
    const statusParts = statusLine.split(" ");
    const statusCode = parseInt(statusParts[1] || "500");
    const statusMessage = statusParts.slice(2).join(" ");

    // Parse headers
    const headers: Record<string, string> = {};
    let i = 1;

    for (; i < lines.length; i++) {
      const line = lines[i];

      if (!line || line.trim() === "") {
        // Linha vazia = fim dos headers
        i++;
        break;
      }

      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    // Parse body (resto das linhas)
    const body = lines.slice(i).join("\r\n");

    return {
      statusCode,
      statusMessage,
      headers,
      body: body || "",
    };
  }
}

// ============= TESTES =============

async function testSimpleGET() {
  logger.info("\n" + "━".repeat(60));
  logger.info("🧪 Teste 1: GET simples com headers básicos");
  logger.info("━".repeat(60) + "\n");

  const client = new HTTPClient("127.0.0.1", 3000);

  const response = await client.sendHTTPRequest("GET", "/api/users", {
    Host: "localhost:3000",
    "User-Agent": "HTTPClient/1.0",
    Accept: "*/*",
  });

  logger.info("✅ Teste 1 completo\n");
  return response;
}

async function testGETWithManyHeaders() {
  logger.info("\n" + "━".repeat(60));
  logger.info("🧪 Teste 2: GET com múltiplos headers");
  logger.info("━".repeat(60) + "\n");

  const client = new HTTPClient("127.0.0.1", 3000);

  const response = await client.sendHTTPRequest(
    "GET",
    "/api/products?category=electronics&sort=price",
    {
      Host: "localhost:3000",
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "X-Custom-Header": "test-value",
      Authorization: "Bearer token123",
    }
  );

  logger.info("✅ Teste 2 completo\n");
  return response;
}

async function testPOSTWithHeaders() {
  logger.info("\n" + "━".repeat(60));
  logger.info("🧪 Teste 3: POST com Content-Type e Content-Length");
  logger.info("━".repeat(60) + "\n");

  const client = new HTTPClient("127.0.0.1", 3000);
  const body = JSON.stringify({ name: "John", age: 30 });

  const response = await client.sendHTTPRequest(
    "POST",
    "/api/users",
    {
      Host: "localhost:3000",
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body).toString(),
      "User-Agent": "HTTPClient/1.0",
    },
    body
  );

  logger.info("✅ Teste 3 completo\n");
  return response;
}

async function testHeadersWithSpaces() {
  logger.info("\n" + "━".repeat(60));
  logger.info("🧪 Teste 4: Headers com espaços extras");
  logger.info("━".repeat(60) + "\n");

  // Request manual com espaços
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.connect(3000, "127.0.0.1");

    const request =
      `GET /test HTTP/1.1\r\n` +
      `Host:    localhost:3000   \r\n` +
      `User-Agent:   TestClient/1.0\r\n` +
      `Accept  :  */*  \r\n` +
      `\r\n`;

    socket.on("connect", () => {
      logger.info("📤 Enviando request com headers com espaços extras");
      logger.debug({
        request: request.replace(/\r\n/g, "↵\n"),
        msg: "Request raw",
      });
      socket.write(request);
    });

    socket.once("data", (response) => {
      const responseText = response.toString("utf-8");

      logger.info({
        msg: "📥 Resposta recebida",
        preview: responseText.substring(0, 200),
      });

      socket.end();
      resolve(responseText);
    });

    socket.on("error", reject);
  });
}

async function testInvalidMethod() {
  logger.info("\n" + "━".repeat(60));
  logger.info("🧪 Teste 5: Método HTTP inválido (esperado: 405)");
  logger.info("━".repeat(60) + "\n");

  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    socket.connect(3000, "127.0.0.1");

    const request = `INVALID /test HTTP/1.1\r\nHost: localhost\r\n\r\n`;

    socket.on("connect", () => {
      logger.info("📤 Enviando método INVALID");
      socket.write(request);
    });

    socket.once("data", (response) => {
      const responseText = response.toString("utf-8");
      const statusLine = responseText.split("\r\n")[0];

      logger.info({
        statusLine,
        msg: "📥 Resposta de erro recebida",
      });

      // Parsear headers da resposta de erro
      const lines = responseText.split("\r\n");
      const headers: Record<string, string> = {};

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.trim() === "") break;

        const colonIndex = line.indexOf(":");
        if (colonIndex !== -1) {
          headers[line.substring(0, colonIndex).trim()] = line
            .substring(colonIndex + 1)
            .trim();
        }
      }

      logger.info({
        msg: "📋 Headers de erro:",
        headers: JSON.stringify(headers, null, 2),
      });

      socket.end();
      resolve(responseText);
    });

    socket.on("error", reject);
  });
}

async function testCaseInsensitiveHeaders() {
  logger.info("\n" + "━".repeat(60));
  logger.info("🧪 Teste 6: Headers com case misto");
  logger.info("━".repeat(60) + "\n");

  const client = new HTTPClient("127.0.0.1", 3000);

  const response = await client.sendHTTPRequest("GET", "/api/test", {
    HOST: "localhost:3000", // MAIÚSCULO
    "content-type": "application/json", // minúsculo
    "User-Agent": "TestClient/1.0", // Misto normal
    aCCePt: "text/html", // Misto estranho
  });

  logger.info("✅ Teste 6 completo\n");
  return response;
}

// Executar todos os testes
(async () => {
  try {
    await testSimpleGET();
    await new Promise((r) => setTimeout(r, 500));

    await testGETWithManyHeaders();
    await new Promise((r) => setTimeout(r, 500));

    await testPOSTWithHeaders();
    await new Promise((r) => setTimeout(r, 500));

    await testHeadersWithSpaces();
    await new Promise((r) => setTimeout(r, 500));

    await testInvalidMethod();
    await new Promise((r) => setTimeout(r, 500));

    await testCaseInsensitiveHeaders();

    logger.info("\n" + "━".repeat(60));
    logger.info("✅ TODOS OS TESTES CONCLUÍDOS!");
    logger.info("━".repeat(60));
  } catch (error) {
    logger.error({ error }, "❌ Teste falhou");
  }
})();
