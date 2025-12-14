import { describe, test, expect } from "bun:test";
import { RequestLineParser } from "../request-line";

describe("RequestLineParser", () => {
  describe("parse - casos válidos", () => {
    test("deve parsear GET request simples", () => {
      const result = RequestLineParser.parse("GET / HTTP/1.1");

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe("GET");
      expect(result.data?.path).toBe("/");
      expect(result.data?.version).toBe("HTTP/1.1");
    });

    test("deve parsear POST request com path", () => {
      const result = RequestLineParser.parse("POST /api/users HTTP/1.1");

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe("POST");
      expect(result.data?.path).toBe("/api/users");
      expect(result.data?.version).toBe("HTTP/1.1");
    });

    test("deve parsear todos os métodos HTTP", () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];

      for (const method of methods) {
        const result = RequestLineParser.parse(`${method} /test HTTP/1.1`);
        expect(result.success).toBe(true);
        expect(result.data?.method).toBe(method);
      }
    });

    test("deve parsear path com query string", () => {
      const result = RequestLineParser.parse("GET /api/users?id=123&name=test HTTP/1.1");

      expect(result.success).toBe(true);
      expect(result.data?.path).toBe("/api/users?id=123&name=test");
    });

    test("deve parsear path longo", () => {
      const result = RequestLineParser.parse("GET /api/v1/users/123/posts/456/comments HTTP/1.1");

      expect(result.success).toBe(true);
      expect(result.data?.path).toBe("/api/v1/users/123/posts/456/comments");
    });

    test("deve normalizar método para uppercase", () => {
      const result = RequestLineParser.parse("get /test HTTP/1.1");

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe("GET");
    });

    test("deve aceitar HTTP/1.0", () => {
      const result = RequestLineParser.parse("GET / HTTP/1.0");

      expect(result.success).toBe(true);
      expect(result.data?.version).toBe("HTTP/1.0");
    });

    test("deve lidar com espaços extras", () => {
      const result = RequestLineParser.parse("  GET /test HTTP/1.1  ");

      expect(result.success).toBe(true);
      expect(result.data?.method).toBe("GET");
    });
  });

  describe("parse - casos inválidos", () => {
    test("deve rejeitar request line vazia", () => {
      const result = RequestLineParser.parse("");

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.message).toContain("vazia");
    });

    test("deve rejeitar request line com espaços apenas", () => {
      const result = RequestLineParser.parse("   ");

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
    });

    test("deve rejeitar request line malformada (poucas partes)", () => {
      const result = RequestLineParser.parse("GET /test");

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.message).toContain("malformada");
    });

    test("deve rejeitar request line com muitas partes", () => {
      const result = RequestLineParser.parse("GET /test HTTP/1.1 extra");

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
    });

    test("deve rejeitar método HTTP inválido", () => {
      const result = RequestLineParser.parse("INVALID /test HTTP/1.1");

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(405);
      expect(result.error?.message).toContain("inválido");
    });

    test("deve rejeitar path inválido (sem barra)", () => {
      const result = RequestLineParser.parse("GET test HTTP/1.1");

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.message).toContain("Path inválido");
    });

    test("deve rejeitar directory traversal", () => {
      const result = RequestLineParser.parse("GET /api/../etc/passwd HTTP/1.1");

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
    });

    test("deve rejeitar versão HTTP inválida", () => {
      const result = RequestLineParser.parse("GET /test HTTP/1");

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.message).toContain("Versão HTTP inválida");
    });

    test("deve rejeitar versão sem HTTP/", () => {
      const result = RequestLineParser.parse("GET /test 1.1");

      expect(result.success).toBe(false);
      expect(result.error?.statusCode).toBe(400);
    });
  });

  describe("parse - edge cases", () => {
    test("deve parsear path com caracteres especiais", () => {
      const result = RequestLineParser.parse("GET /api/users%20test HTTP/1.1");

      expect(result.success).toBe(true);
      expect(result.data?.path).toBe("/api/users%20test");
    });

    test("deve parsear path com fragmento", () => {
      const result = RequestLineParser.parse("GET /page#section HTTP/1.1");

      expect(result.success).toBe(true);
      expect(result.data?.path).toBe("/page#section");
    });
  });
});
