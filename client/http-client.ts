import * as net from "net";
import { clientLogger } from "../utils/logger";

export class HTTPClient {
  private socket: net.Socket;

  constructor(host: string, port: number) {
    this.socket = new net.Socket();
    this.socket.connect(port, host);
  }

  async sendHTTPRequest(
    method: string = "GET",
    path: string = "/",
    headers: Record<string, string> = {},
    body?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Build HTTP request
      const requestLines: string[] = [];

      // Request line
      requestLines.push(`${method.toUpperCase()} ${path} HTTP/1.1`);

      // Default headers
      const allHeaders: Record<string, string> = {
        Host: "localhost",
        "User-Agent": "CustomHTTPClient/1.0",
        Accept: "*/*",
        ...headers,
      };

      // Add Content-Length if body exists
      if (body) {
        allHeaders["Content-Length"] = Buffer.byteLength(body, "utf-8").toString();
      }

      // Add headers
      for (const [key, value] of Object.entries(allHeaders)) {
        requestLines.push(`${key}: ${value}`);
      }

      // Empty line separates headers from body (need double \r\n\r\n)
      requestLines.push("");
      requestLines.push(""); // Second empty line creates \r\n\r\n

      // Add body if exists
      if (body) {
        requestLines.pop(); // Remove the second empty line if we have a body
        requestLines.push(body);
      }

      // Join with \r\n and add final \n delimiter
      const httpRequest = requestLines.join("\r\n") + "\n";

      clientLogger.info({
        method,
        path,
        headerCount: Object.keys(allHeaders).length,
        bodySize: body ? body.length : 0,
        msg: "📤 Sending HTTP request",
      });

      clientLogger.debug({
        preview: httpRequest.substring(0, 200).replace(/\r\n/g, "↵"),
        msg: "Request preview",
      });

      this.socket.on("data", (data: Buffer) => {
        clientLogger.info({
          response: data.toString("utf-8"),
          msg: "📨 Received response",
        });
      });

      this.socket.on("error", (err) => {
        reject(err);
      });

      this.socket.on("connect", () => {
        this.socket.write(httpRequest, (err) => {
          if (err) {
            reject(err);
            return;
          }

          clientLogger.info("✅ Request sent successfully");

          // Close connection after a short delay to receive response
          setTimeout(() => {
            this.socket.end();
            resolve();
          }, 500);
        });
      });
    });
  }
}

async function testHTTPHeaderParsing() {
  clientLogger.info("━".repeat(50));
  clientLogger.info("🧪 Testing HTTP Header Parsing");
  clientLogger.info("━".repeat(50));

  // Test 1: Simple GET request
  const client1 = new HTTPClient("127.0.0.1", 3000);
  await client1.sendHTTPRequest("GET", "/api/users", {
    "Authorization": "Bearer token123",
    "Content-Type": "application/json",
    "X-Custom-Header": "custom-value",
  });

  await new Promise((r) => setTimeout(r, 1000));

  // Test 2: POST request with body
  const client2 = new HTTPClient("127.0.0.1", 3000);
  await client2.sendHTTPRequest(
    "POST",
    "/api/data",
    {
      "Authorization": "Bearer xyz789",
      "Content-Type": "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    JSON.stringify({ name: "test", value: 42 })
  );

  await new Promise((r) => setTimeout(r, 1000));

  // Test 3: Request with many headers
  const client3 = new HTTPClient("127.0.0.1", 3000);
  await client3.sendHTTPRequest("GET", "/test/headers", {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://example.com",
    "X-Requested-With": "XMLHttpRequest",
    "X-API-Key": "secret-key-123",
  });
}

(async () => {
  try {
    await testHTTPHeaderParsing();
    clientLogger.info("━".repeat(50));
    clientLogger.info("✅ All tests completed");
    clientLogger.info("━".repeat(50));
  } catch (error) {
    clientLogger.error({ error }, "Test failed");
  }
})();
