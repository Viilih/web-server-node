import { describe, test, expect } from "bun:test";
import { HeadersParser } from "../header";

describe("HeadersParser", () => {
  describe("parse - casos válidos", () => {
    test("deve parsear headers simples", () => {
      const lines = [
        "GET / HTTP/1.1",
        "Host: localhost",
        "User-Agent: Test",
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        host: "localhost",
        "user-agent": "Test",
      });
    });

    test("deve parsear múltiplos headers", () => {
      const lines = [
        "POST /api HTTP/1.1",
        "Host: example.com",
        "Content-Type: application/json",
        "Content-Length: 100",
        "Authorization: Bearer token123",
        "Accept: */*",
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data!).length).toBe(5);
      expect(result.data!["host"]).toBe("example.com");
      expect(result.data!["content-type"]).toBe("application/json");
      expect(result.data!["content-length"]).toBe("100");
      expect(result.data!["authorization"]).toBe("Bearer token123");
      expect(result.data!["accept"]).toBe("*/*");
    });

    test("deve normalizar header keys para lowercase", () => {
      const lines = [
        "GET / HTTP/1.1",
        "Content-Type: text/html",
        "AUTHORIZATION: Bearer xyz",
        "Accept-Encoding: gzip",
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(result.data!["content-type"]).toBe("text/html");
      expect(result.data!["authorization"]).toBe("Bearer xyz");
      expect(result.data!["accept-encoding"]).toBe("gzip");
    });

    test("deve fazer trim nos valores", () => {
      const lines = [
        "GET / HTTP/1.1",
        "Host:   localhost   ",
        "User-Agent:Test",
        "Accept:  */*  ",
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(result.data!["host"]).toBe("localhost");
      expect(result.data!["user-agent"]).toBe("Test");
      expect(result.data!["accept"]).toBe("*/*");
    });

    test("deve aceitar header com valor vazio", () => {
      const lines = [
        "GET / HTTP/1.1",
        "X-Empty:",
        "X-Empty-Spaces:   ",
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(result.data!["x-empty"]).toBe("");
      expect(result.data!["x-empty-spaces"]).toBe("");
    });

    test("deve aceitar header com múltiplos dois pontos no valor", () => {
      const lines = [
        "GET / HTTP/1.1",
        "X-Custom: value:with:colons",
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(result.data!["x-custom"]).toBe("value:with:colons");
    });

    test("deve parar na primeira linha vazia", () => {
      const lines = [
        "POST / HTTP/1.1",
        "Host: localhost",
        "Content-Length: 26",
        "",
        '{"name": "test"}', // Body - não deve ser parseado
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data!).length).toBe(2);
    });

    test("deve retornar headers vazios quando não há headers", () => {
      const lines = [
        "GET / HTTP/1.1",
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data!).length).toBe(0);
    });
  });

  describe("parse - casos inválidos", () => {
    test("deve ignorar linha sem dois pontos (e continuar)", () => {
      const lines = [
        "GET / HTTP/1.1",
        "Host: localhost",
        "Invalid Header Without Colon",
        "Content-Type: text/html",
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data!).length).toBe(2);
      expect(result.data!["host"]).toBe("localhost");
      expect(result.data!["content-type"]).toBe("text/html");
    });

    test("deve ignorar múltiplas linhas inválidas", () => {
      const lines = [
        "GET / HTTP/1.1",
        "Invalid",
        "Host: localhost",
        "Another Invalid",
        "Accept: */*",
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data!).length).toBe(2);
    });
  });

  describe("getHeader", () => {
    test("deve buscar header existente", () => {
      const headers = {
        "content-type": "application/json",
        "host": "localhost",
      };

      expect(HeadersParser.getHeader(headers, "content-type")).toBe("application/json");
      expect(HeadersParser.getHeader(headers, "host")).toBe("localhost");
    });

    test("deve ser case-insensitive", () => {
      const headers = {
        "content-type": "application/json",
      };

      expect(HeadersParser.getHeader(headers, "Content-Type")).toBe("application/json");
      expect(HeadersParser.getHeader(headers, "CONTENT-TYPE")).toBe("application/json");
      expect(HeadersParser.getHeader(headers, "content-type")).toBe("application/json");
    });

    test("deve retornar undefined para header inexistente", () => {
      const headers = {
        "host": "localhost",
      };

      expect(HeadersParser.getHeader(headers, "content-type")).toBeUndefined();
    });
  });

  describe("hasHeader", () => {
    test("deve retornar true para header existente", () => {
      const headers = {
        "content-type": "application/json",
        "host": "localhost",
      };

      expect(HeadersParser.hasHeader(headers, "content-type")).toBe(true);
      expect(HeadersParser.hasHeader(headers, "host")).toBe(true);
    });

    test("deve ser case-insensitive", () => {
      const headers = {
        "content-type": "application/json",
      };

      expect(HeadersParser.hasHeader(headers, "Content-Type")).toBe(true);
      expect(HeadersParser.hasHeader(headers, "CONTENT-TYPE")).toBe(true);
    });

    test("deve retornar false para header inexistente", () => {
      const headers = {
        "host": "localhost",
      };

      expect(HeadersParser.hasHeader(headers, "content-type")).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("deve lidar com header com espaços no nome", () => {
      const lines = [
        "GET / HTTP/1.1",
        "  Host  : localhost",
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(result.data!["host"]).toBe("localhost");
    });

    test("deve lidar com valores longos", () => {
      const longValue = "a".repeat(1000);
      const lines = [
        "GET / HTTP/1.1",
        `X-Long: ${longValue}`,
        "",
      ];

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(result.data!["x-long"]).toBe(longValue);
    });

    test("deve lidar com muitos headers", () => {
      const lines = ["GET / HTTP/1.1"];

      for (let i = 1; i <= 50; i++) {
        lines.push(`X-Header-${i}: value${i}`);
      }
      lines.push("");

      const result = HeadersParser.parse(lines);

      expect(result.success).toBe(true);
      expect(Object.keys(result.data!).length).toBe(50);
    });
  });
});
