import { describe, test, expect } from "bun:test";
import { BodyParser, BodyContentType } from "../body";
import type { HTTPHeaders } from "../../../core/types";

describe("BodyParser", () => {
  describe("parse - JSON body", () => {
    test("deve parsear JSON válido", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/json\r\n" +
        "\r\n" +
        '{"name":"John","age":30}';

      const headers: HTTPHeaders = {
        "content-type": "application/json",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.contentType).toBe(BodyContentType.JSON);
      expect(result.data?.raw).toBe('{"name":"John","age":30}');
      expect(result.data?.parsed).toEqual({ name: "John", age: 30 });
      expect(result.data?.size).toBe(24);
    });

    test("deve parsear JSON com charset", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/json; charset=utf-8\r\n" +
        "\r\n" +
        '{"test":true}';

      const headers: HTTPHeaders = {
        "content-type": "application/json; charset=utf-8",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.contentType).toBe(BodyContentType.JSON);
      expect(result.data?.parsed).toEqual({ test: true });
    });

    test("deve retornar null para JSON inválido", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/json\r\n" +
        "\r\n" +
        '{"invalid": json}';

      const headers: HTTPHeaders = {
        "content-type": "application/json",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.parsed).toBeNull();
    });

    test("deve parsear JSON com arrays", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/json\r\n" +
        "\r\n" +
        '[1,2,3]';

      const headers: HTTPHeaders = {
        "content-type": "application/json",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.parsed).toEqual([1, 2, 3]);
    });

    test("deve parsear JSON complexo", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/json\r\n" +
        "\r\n" +
        '{"user":{"name":"Alice","roles":["admin","user"]},"active":true}';

      const headers: HTTPHeaders = {
        "content-type": "application/json",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.parsed).toEqual({
        user: { name: "Alice", roles: ["admin", "user"] },
        active: true,
      });
    });
  });

  describe("parse - Form URL Encoded body", () => {
    test("deve parsear form-urlencoded simples", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/x-www-form-urlencoded\r\n" +
        "\r\n" +
        "name=John&age=30";

      const headers: HTTPHeaders = {
        "content-type": "application/x-www-form-urlencoded",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.contentType).toBe(BodyContentType.FORM_URLENCODED);
      expect(result.data?.parsed).toEqual({ name: "John", age: "30" });
    });

    test("deve decodificar URL encoding", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/x-www-form-urlencoded\r\n" +
        "\r\n" +
        "message=Hello%20World&email=test%40example.com";

      const headers: HTTPHeaders = {
        "content-type": "application/x-www-form-urlencoded",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.parsed).toEqual({
        message: "Hello World",
        email: "test@example.com",
      });
    });

    test("deve converter + em espaço", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/x-www-form-urlencoded\r\n" +
        "\r\n" +
        "name=John+Doe&city=New+York";

      const headers: HTTPHeaders = {
        "content-type": "application/x-www-form-urlencoded",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.parsed).toEqual({
        name: "John Doe",
        city: "New York",
      });
    });

    test("deve lidar com valores vazios", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/x-www-form-urlencoded\r\n" +
        "\r\n" +
        "key1=value1&key2=&key3=value3";

      const headers: HTTPHeaders = {
        "content-type": "application/x-www-form-urlencoded",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.parsed).toEqual({
        key1: "value1",
        key2: "",
        key3: "value3",
      });
    });

    test("deve lidar com caracteres especiais", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/x-www-form-urlencoded\r\n" +
        "\r\n" +
        "data=%3Ctest%3E&symbols=%21%40%23%24";

      const headers: HTTPHeaders = {
        "content-type": "application/x-www-form-urlencoded",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.parsed).toEqual({
        data: "<test>",
        symbols: "!@#$",
      });
    });
  });

  describe("parse - Text body", () => {
    test("deve parsear text/plain", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: text/plain\r\n" +
        "\r\n" +
        "This is plain text";

      const headers: HTTPHeaders = {
        "content-type": "text/plain",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.contentType).toBe(BodyContentType.TEXT);
      expect(result.data?.parsed).toBe("This is plain text");
      expect(result.data?.raw).toBe("This is plain text");
    });

    test("deve parsear text/html", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: text/html\r\n" +
        "\r\n" +
        "<h1>Hello World</h1>";

      const headers: HTTPHeaders = {
        "content-type": "text/html",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.contentType).toBe(BodyContentType.HTML);
      expect(result.data?.parsed).toBe("<h1>Hello World</h1>");
    });
  });

  describe("parse - sem body", () => {
    test("deve retornar body vazio quando não há body", () => {
      const rawRequest = "GET / HTTP/1.1\r\nHost: localhost\r\n\r\n";

      const headers: HTTPHeaders = {
        host: "localhost",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.raw).toBe("");
      expect(result.data?.parsed).toBeNull();
      expect(result.data?.size).toBe(0);
    });

    test("deve retornar body vazio para GET request", () => {
      const rawRequest = "GET /api HTTP/1.1\r\n\r\n";

      const headers: HTTPHeaders = {};

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(0);
    });
  });

  describe("parse - Content-Type desconhecido", () => {
    test("deve retornar raw string para Content-Type desconhecido", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/custom\r\n" +
        "\r\n" +
        "custom data here";

      const headers: HTTPHeaders = {
        "content-type": "application/custom",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.contentType).toBe(BodyContentType.UNKNOWN);
      expect(result.data?.parsed).toBe("custom data here");
    });

    test("deve tratar body sem Content-Type header", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "\r\n" +
        "some data";

      const headers: HTTPHeaders = {};

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.contentType).toBe(BodyContentType.UNKNOWN);
      expect(result.data?.raw).toBe("some data");
    });
  });

  describe("validateContentLength", () => {
    test("deve validar Content-Length correto", () => {
      const headers: HTTPHeaders = {
        "content-length": "15",
      };

      const isValid = BodyParser.validateContentLength(15, headers);
      expect(isValid).toBe(true);
    });

    test("deve retornar false para Content-Length incorreto", () => {
      const headers: HTTPHeaders = {
        "content-length": "20",
      };

      const isValid = BodyParser.validateContentLength(15, headers);
      expect(isValid).toBe(false);
    });

    test("deve retornar true quando não há Content-Length header", () => {
      const headers: HTTPHeaders = {};

      const isValid = BodyParser.validateContentLength(15, headers);
      expect(isValid).toBe(true);
    });

    test("deve retornar false para Content-Length inválido", () => {
      const headers: HTTPHeaders = {
        "content-length": "invalid",
      };

      const isValid = BodyParser.validateContentLength(15, headers);
      expect(isValid).toBe(false);
    });
  });

  describe("hasBody", () => {
    test("deve retornar true quando Content-Length > 0", () => {
      const headers: HTTPHeaders = {
        "content-length": "100",
      };

      expect(BodyParser.hasBody(headers)).toBe(true);
    });

    test("deve retornar false quando Content-Length = 0", () => {
      const headers: HTTPHeaders = {
        "content-length": "0",
      };

      expect(BodyParser.hasBody(headers)).toBe(false);
    });

    test("deve retornar true para chunked transfer encoding", () => {
      const headers: HTTPHeaders = {
        "transfer-encoding": "chunked",
      };

      expect(BodyParser.hasBody(headers)).toBe(true);
    });

    test("deve retornar false quando não há indicators de body", () => {
      const headers: HTTPHeaders = {
        host: "localhost",
      };

      expect(BodyParser.hasBody(headers)).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("deve lidar com body vazio mas com Content-Type", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/json\r\n" +
        "\r\n";

      const headers: HTTPHeaders = {
        "content-type": "application/json",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(0);
    });

    test("deve lidar com body grande", () => {
      const largeBody = "x".repeat(10000);
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: text/plain\r\n" +
        "\r\n" +
        largeBody;

      const headers: HTTPHeaders = {
        "content-type": "text/plain",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.size).toBe(10000);
      expect(result.data?.parsed).toBe(largeBody);
    });

    test("deve lidar com JSON com caracteres especiais", () => {
      const rawRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Type: application/json\r\n" +
        "\r\n" +
        '{"message":"Olá, Mundo! ☺️","emoji":"🚀"}';

      const headers: HTTPHeaders = {
        "content-type": "application/json",
      };

      const result = BodyParser.parse(rawRequest, headers);

      expect(result.success).toBe(true);
      expect(result.data?.parsed).toEqual({
        message: "Olá, Mundo! ☺️",
        emoji: "🚀",
      });
    });
  });
});
