import { describe, test, expect } from "bun:test";
import { HTTPParser } from "../http";

describe("HTTPParser", () => {
  describe("parse - requests completos", () => {
    test("deve parsear GET request simples", () => {
      const rawRequest = "GET / HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe("GET");
      expect(result.data?.path).toBe("/");
      expect(result.data?.version).toBe("HTTP/1.1");
      expect(result.data?.headers).toEqual({ host: "localhost" });
      expect(result.data?.body).toBe(null);
      expect(result.data?.query).toEqual({});
    });

    test("deve parsear POST request com múltiplos headers", () => {
      const rawRequest =
        "POST /api/users HTTP/1.1\r\n" +
        "Host: example.com\r\n" +
        "Content-Type: application/json\r\n" +
        "Content-Length: 26\r\n" +
        "Authorization: Bearer token123\r\n" +
        "\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe("POST");
      expect(result.data?.path).toBe("/api/users");
      expect(result.data?.headers["host"]).toBe("example.com");
      expect(result.data?.headers["content-type"]).toBe("application/json");
      expect(result.data?.headers["content-length"]).toBe("26");
      expect(result.data?.headers["authorization"]).toBe("Bearer token123");
    });

    test("deve parsear request com query parameters", () => {
      const rawRequest = "GET /api/users?id=123&name=test&active=true HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.path).toBe("/api/users");
      expect(result.data?.query).toEqual({
        id: "123",
        name: "test",
        active: "true",
      });
    });

    test("deve parsear query parameters com URL encoding", () => {
      const rawRequest = "GET /search?q=hello%20world&filter=%3Ctest%3E HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.query["q"]).toBe("hello world");
      expect(result.data?.query["filter"]).toBe("<test>");
    });

    test("deve parsear request sem query parameters", () => {
      const rawRequest = "GET /api/users HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.path).toBe("/api/users");
      expect(result.data?.query).toEqual({});
    });

    test("deve parsear request sem headers", () => {
      const rawRequest = "GET / HTTP/1.1\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe("GET");
      expect(result.data?.headers).toEqual({});
    });

    test("deve manter raw request original", () => {
      const rawRequest = "GET /test HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.raw).toBe(rawRequest);
    });
  });

  describe("parse - requests inválidos", () => {
    test("deve rejeitar request line inválida", () => {
      const rawRequest = "INVALID\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
    });

    test("deve rejeitar método HTTP inválido", () => {
      const rawRequest = "INVALID /test HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(405);
    });

    test("deve rejeitar path inválido", () => {
      const rawRequest = "GET test HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
    });

    test("deve rejeitar versão HTTP inválida", () => {
      const rawRequest = "GET /test 1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
    });

    test("deve rejeitar request vazio", () => {
      const rawRequest = "";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
    });
  });

  describe("parse - todos os métodos HTTP", () => {
    const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];

    methods.forEach((method) => {
      test(`deve parsear ${method} request`, () => {
        const rawRequest = `${method} /test HTTP/1.1\r\nHost: localhost\r\n\r\n`;

        const result = HTTPParser.parse(rawRequest);

        expect(result.success).toBe(true);
        expect(result.data?.method).toBe(method);
      });
    });
  });

  describe("parse - headers especiais", () => {
    test("deve parsear Authorization header", () => {
      const rawRequest =
        "GET /api HTTP/1.1\r\n" +
        "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\r\n" +
        "\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.headers["authorization"]).toBe("Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    });

    test("deve parsear User-Agent header", () => {
      const rawRequest =
        "GET / HTTP/1.1\r\n" +
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)\r\n" +
        "\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.headers["user-agent"]).toBe("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    });

    test("deve parsear múltiplos Accept headers", () => {
      const rawRequest =
        "GET / HTTP/1.1\r\n" +
        "Accept: text/html,application/json\r\n" +
        "Accept-Encoding: gzip, deflate, br\r\n" +
        "Accept-Language: en-US,en;q=0.9\r\n" +
        "\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.headers["accept"]).toBe("text/html,application/json");
      expect(result.data?.headers["accept-encoding"]).toBe("gzip, deflate, br");
      expect(result.data?.headers["accept-language"]).toBe("en-US,en;q=0.9");
    });
  });

  describe("parse - query parameters edge cases", () => {
    test("deve parsear query parameter vazio", () => {
      const rawRequest = "GET /api?key= HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.query["key"]).toBe("");
    });

    test("deve parsear query parameter sem valor", () => {
      const rawRequest = "GET /api?flag HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.query["flag"]).toBe("");
    });

    test("deve parsear múltiplos query parameters", () => {
      const rawRequest = "GET /api?a=1&b=2&c=3&d=4&e=5 HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data?.query || {}).length).toBe(5);
    });

    test("deve lidar com query string vazia", () => {
      const rawRequest = "GET /api? HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.query).toEqual({});
    });
  });

  describe("parse - real-world examples", () => {
    test("deve parsear request típico de navegador", () => {
      const rawRequest =
        "GET /index.html HTTP/1.1\r\n" +
        "Host: www.example.com\r\n" +
        "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n" +
        "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8\r\n" +
        "Accept-Language: en-US,en;q=0.5\r\n" +
        "Accept-Encoding: gzip, deflate\r\n" +
        "Connection: keep-alive\r\n" +
        "\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe("GET");
      expect(result.data?.path).toBe("/index.html");
      expect(Object.keys(result.data?.headers || {}).length).toBe(6);
    });

    test("deve parsear API request com autenticação", () => {
      const rawRequest =
        "POST /api/v1/users HTTP/1.1\r\n" +
        "Host: api.example.com\r\n" +
        "Content-Type: application/json\r\n" +
        "Authorization: Bearer abc123xyz\r\n" +
        "X-Request-ID: req-12345\r\n" +
        "X-API-Key: key-67890\r\n" +
        "\r\n";

      const result = HTTPParser.parse(rawRequest);

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe("POST");
      expect(result.data?.headers["authorization"]).toBe("Bearer abc123xyz");
      expect(result.data?.headers["x-request-id"]).toBe("req-12345");
      expect(result.data?.headers["x-api-key"]).toBe("key-67890");
    });
  });
});
