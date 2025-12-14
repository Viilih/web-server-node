import { describe, test, expect } from "bun:test";
import { ResponseBuilder } from "../response-builder";

describe("ResponseBuilder", () => {
  describe("status", () => {
    test("deve definir status code", () => {
      const builder = new ResponseBuilder();
      const result = builder.status(404);

      expect(result).toBe(builder); // Chainable
    });

    test("deve aceitar todos status codes válidos", () => {
      const codes = [200, 201, 400, 404, 500];

      codes.forEach((code) => {
        const builder = new ResponseBuilder();
        expect(() => builder.status(code)).not.toThrow();
      });
    });
  });

  describe("header", () => {
    test("deve adicionar header", () => {
      const builder = new ResponseBuilder();
      const result = builder.header("X-Custom", "value");

      expect(result).toBe(builder); // Chainable
    });

    test("deve permitir múltiplos headers", () => {
      const builder = new ResponseBuilder();

      builder
        .header("Content-Type", "application/json")
        .header("X-Request-ID", "123");

      expect(builder).toBeInstanceOf(ResponseBuilder);
    });
  });

  describe("json", () => {
    test("deve serializar objeto para JSON", () => {
      const builder = new ResponseBuilder();
      const data = { message: "Hello", count: 42 };

      builder.json(data);
      const response = builder.build();

      expect(response).toContain('"message"');
      expect(response).toContain('"Hello"');
      expect(response).toContain('"count"');
      expect(response).toContain("Content-Type: application/json");
    });

    test("deve usar status 200 por padrão", () => {
      const builder = new ResponseBuilder();
      builder.json({ ok: true });

      const response = builder.build();
      expect(response).toContain("HTTP/1.1 200 OK");
    });

    test("deve usar status customizado", () => {
      const builder = new ResponseBuilder();
      builder.status(201).json({ created: true });

      const response = builder.build();
      expect(response).toContain("HTTP/1.1 201 Created");
    });
  });

  describe("text", () => {
    test("deve enviar texto simples", () => {
      const builder = new ResponseBuilder();
      builder.text("Hello World");

      const response = builder.build();
      expect(response).toContain("Hello World");
      expect(response).toContain("Content-Type: text/plain");
    });

    test("deve calcular Content-Length corretamente", () => {
      const builder = new ResponseBuilder();
      const text = "Test Message";
      builder.text(text);

      const response = builder.build();
      expect(response).toContain(`Content-Length: ${text.length}`);
    });
  });

  describe("html", () => {
    test("deve enviar HTML", () => {
      const builder = new ResponseBuilder();
      builder.html("<h1>Hello</h1>");

      const response = builder.build();
      expect(response).toContain("<h1>Hello</h1>");
      expect(response).toContain("Content-Type: text/html");
    });
  });

  describe("build", () => {
    test("deve construir response HTTP válida", () => {
      const builder = new ResponseBuilder();
      builder.status(200).json({ message: "test" });

      const response = builder.build();

      // Deve ter status line
      expect(response).toContain("HTTP/1.1 200 OK");

      // Deve ter headers
      expect(response).toContain("Content-Type:");
      expect(response).toContain("Content-Length:");
      expect(response).toContain("Server:");

      // Deve ter body
      expect(response).toContain("message");
    });

    test("deve incluir headers padrão", () => {
      const builder = new ResponseBuilder();
      builder.text("test");

      const response = builder.build();

      expect(response).toContain("Server: CustomHTTPServer/1.0");
      expect(response).toContain("Date:");
      expect(response).toContain("Content-Length:");
    });
  });

  describe("chaining", () => {
    test("deve permitir encadeamento de métodos", () => {
      const builder = new ResponseBuilder();

      const response = builder
        .status(201)
        .header("X-Custom-Header", "value")
        .header("X-Another", "test")
        .json({ created: true })
        .build();

      expect(response).toContain("HTTP/1.1 201 Created");
      expect(response).toContain("X-Custom-Header: value");
      expect(response).toContain("X-Another: test");
      expect(response).toContain("created");
    });
  });

  describe("Content-Length", () => {
    test("deve calcular Content-Length para JSON", () => {
      const builder = new ResponseBuilder();
      const data = { test: "data" };

      builder.json(data);
      const response = builder.build();

      // JSON é formatado com pretty print (2 espaços)
      const jsonString = JSON.stringify(data, null, 2);
      expect(response).toContain(`Content-Length: ${Buffer.byteLength(jsonString)}`);
    });

    test("deve calcular Content-Length para texto com chars especiais", () => {
      const builder = new ResponseBuilder();
      const text = "Test with special chars: ã é ñ";

      builder.text(text);
      const response = builder.build();

      expect(response).toContain(`Content-Length: ${Buffer.byteLength(text)}`);
    });
  });

  describe("error", () => {
    test("deve criar response de erro", () => {
      const builder = new ResponseBuilder();
      builder.error(404, "Not Found");

      const response = builder.build();

      expect(response).toContain("HTTP/1.1 404 Not Found");
      expect(response).toContain('"error"');
      expect(response).toContain('"statusCode"');
    });
  });

  describe("static helpers", () => {
    test("deve criar response OK", () => {
      const response = ResponseBuilder.ok({ success: true }).build();

      expect(response).toContain("HTTP/1.1 200 OK");
      expect(response).toContain("success");
    });

    test("deve criar response Created", () => {
      const response = ResponseBuilder.created({ id: 123 }).build();

      expect(response).toContain("HTTP/1.1 201 Created");
    });

    test("deve criar response Not Found", () => {
      const response = ResponseBuilder.notFound("Resource not found").build();

      expect(response).toContain("HTTP/1.1 404 Not Found");
    });

    test("deve criar response Bad Request", () => {
      const response = ResponseBuilder.badRequest("Invalid input").build();

      expect(response).toContain("HTTP/1.1 400 Bad Request");
    });
  });
});
