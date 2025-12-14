import { describe, test, expect, beforeEach } from "bun:test";
import { RequestBuffer } from "../request-buffer";

describe("RequestBuffer", () => {
  let buffer: RequestBuffer;

  beforeEach(() => {
    buffer = new RequestBuffer();
  });

  describe("Plain Text Messages", () => {
    test("deve retornar mensagem completa quando recebe tudo de uma vez", () => {
      const chunk = Buffer.from("Hello World\n");
      const message = buffer.feedBuffer(chunk);

      expect(message).toBe("Hello World");
    });

    test("deve acumular chunks até receber \\n", () => {
      buffer.feedBuffer(Buffer.from("Hello "));
      buffer.feedBuffer(Buffer.from("World"));

      const message1 = buffer.feedBuffer(Buffer.from("!\n"));
      expect(message1).toBe("Hello World!");
    });

    test("deve retornar null quando mensagem incompleta", () => {
      const message = buffer.feedBuffer(Buffer.from("Incomplete message"));
      expect(message).toBeNull();
    });

    test("deve processar múltiplas mensagens", () => {
      const chunk1 = Buffer.from("First\nSecond\n");
      const message1 = buffer.feedBuffer(chunk1);

      expect(message1).toBe("First");

      // Segunda mensagem fica no buffer
      const message2 = buffer.feedBuffer(Buffer.from(""));
      expect(message2).toBe("Second");
    });

    test("deve lidar com mensagem vazia", () => {
      const message = buffer.feedBuffer(Buffer.from("\n"));
      expect(message).toBe("");
    });
  });

  describe("HTTP Requests - Sem Body", () => {
    test("deve parsear GET request simples", () => {
      const httpRequest =
        "GET / HTTP/1.1\r\n" +
        "Host: localhost\r\n" +
        "\r\n\n";

      const message = buffer.feedBuffer(Buffer.from(httpRequest));

      expect(message).toBe("GET / HTTP/1.1\r\nHost: localhost\r\n\r\n");
    });

    test("deve parsear request com múltiplos headers", () => {
      const httpRequest =
        "GET /api/users HTTP/1.1\r\n" +
        "Host: example.com\r\n" +
        "User-Agent: TestClient/1.0\r\n" +
        "Accept: */*\r\n" +
        "\r\n\n";

      const message = buffer.feedBuffer(Buffer.from(httpRequest));

      expect(message).not.toBeNull();
      expect(message).toContain("GET /api/users");
      expect(message).toContain("Host: example.com");
    });

    test("deve acumular chunks de HTTP request", () => {
      const chunk1 = Buffer.from("GET / HTTP/1.1\r\nHost: ");
      const chunk2 = Buffer.from("localhost\r\n\r\n\n");

      expect(buffer.feedBuffer(chunk1)).toBeNull();

      const message = buffer.feedBuffer(chunk2);
      expect(message).toBe("GET / HTTP/1.1\r\nHost: localhost\r\n\r\n");
    });

    test("deve retornar null quando headers incompletos", () => {
      const chunk = Buffer.from("GET / HTTP/1.1\r\nHost: localhost\r\n");

      const message = buffer.feedBuffer(chunk);
      expect(message).toBeNull();
    });

    test("deve detectar fim dos headers (\\r\\n\\r\\n)", () => {
      const chunk = Buffer.from("POST /api HTTP/1.1\r\n\r\n\n");

      const message = buffer.feedBuffer(chunk);
      expect(message).toBe("POST /api HTTP/1.1\r\n\r\n");
    });
  });

  describe("HTTP Requests - Com Body", () => {
    test("deve parsear POST request com body", () => {
      const body = '{"name":"John"}';
      const httpRequest =
        "POST /api/users HTTP/1.1\r\n" +
        "Host: localhost\r\n" +
        "Content-Type: application/json\r\n" +
        `Content-Length: ${body.length}\r\n` +
        "\r\n" +
        body + '\n';

      const message = buffer.feedBuffer(Buffer.from(httpRequest));

      expect(message).not.toBeNull();
      expect(message).toContain('{"name":"John"}');
    });

    test("deve aguardar body completo baseado em Content-Length", () => {
      const body = '{"name":"test","id":123}';
      const headers =
        "POST /api HTTP/1.1\r\n" +
        `Content-Length: ${body.length}\r\n` +
        "\r\n";

      const chunk1 = Buffer.from(headers);
      expect(buffer.feedBuffer(chunk1)).toBeNull();

      const chunk2 = Buffer.from(body);
      expect(buffer.feedBuffer(chunk2)).toBeNull();

      const chunk3 = Buffer.from("\n");
      const message = buffer.feedBuffer(chunk3);

      expect(message).not.toBeNull();
      expect(message).toContain(body);
    });

    test("deve parsear body em múltiplos chunks", () => {
      const body = '{"user":{"name":"Test"}}';
      const headers =
        "POST /api HTTP/1.1\r\n" +
        `Content-Length: ${body.length}\r\n` +
        "\r\n";

      buffer.feedBuffer(Buffer.from(headers));
      buffer.feedBuffer(Buffer.from('{"user":'));
      buffer.feedBuffer(Buffer.from('{"name":"Test"'));

      const message = buffer.feedBuffer(Buffer.from("}}\n"));
      expect(message).not.toBeNull();
      expect(message).toContain(body);
    });

    test("deve lidar com Content-Length: 0", () => {
      const httpRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Length: 0\r\n" +
        "\r\n\n";

      const message = buffer.feedBuffer(Buffer.from(httpRequest));
      expect(message).not.toBeNull();
    });

    test("deve parsear body com conteúdo binário", () => {
      const headers =
        "POST /upload HTTP/1.1\r\n" +
        "Content-Length: 5\r\n" +
        "\r\n";

      buffer.feedBuffer(Buffer.from(headers));

      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
      buffer.feedBuffer(binaryData);

      const message = buffer.feedBuffer(Buffer.from("\n"));
      expect(message).not.toBeNull();
    });
  });

  describe("reset", () => {
    test("deve limpar buffer após reset", () => {
      buffer.feedBuffer(Buffer.from("Some data"));
      buffer.reset();

      expect(buffer.getSize()).toBe(0);
    });

    test("deve permitir novo parse após reset", () => {
      buffer.feedBuffer(Buffer.from("First message\n"));
      buffer.reset();

      const message = buffer.feedBuffer(Buffer.from("Second message\n"));
      expect(message).toBe("Second message");
    });
  });

  describe("getSize", () => {
    test("deve retornar 0 para buffer vazio", () => {
      expect(buffer.getSize()).toBe(0);
    });

    test("deve retornar tamanho correto após adicionar dados", () => {
      buffer.feedBuffer(Buffer.from("Hello"));
      expect(buffer.getSize()).toBe(5);

      buffer.feedBuffer(Buffer.from(" World"));
      expect(buffer.getSize()).toBe(11);
    });

    test("deve retornar 0 após mensagem completa", () => {
      buffer.feedBuffer(Buffer.from("Message\n"));
      expect(buffer.getSize()).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    test("deve lidar com múltiplas mensagens em um chunk", () => {
      const chunk = Buffer.from("First\nSecond\n");

      const message1 = buffer.feedBuffer(chunk);
      expect(message1).toBe("First");

      const message2 = buffer.feedBuffer(Buffer.from(""));
      expect(message2).toBe("Second");
    });

    test("deve lidar com HTTP request seguido de plain text", () => {
      const httpChunk = Buffer.from("GET / HTTP/1.1\r\n\r\n\n");
      const message1 = buffer.feedBuffer(httpChunk);
      expect(message1).toBe("GET / HTTP/1.1\r\n\r\n");

      buffer.reset();

      const textChunk = Buffer.from("Plain text\n");
      const message2 = buffer.feedBuffer(textChunk);
      expect(message2).toBe("Plain text");
    });

    test("deve lidar com chunks muito pequenos", () => {
      "Hello World\n".split("").forEach((char) => {
        const result = buffer.feedBuffer(Buffer.from(char));
        if (char === "\n") {
          expect(result).toBe("Hello World");
        } else {
          expect(result).toBeNull();
        }
      });
    });

    test("deve lidar com buffer grande", () => {
      const largeMessage = "x".repeat(10000);
      const message = buffer.feedBuffer(Buffer.from(largeMessage + "\n"));

      expect(message).toBe(largeMessage);
      expect(message?.length).toBe(10000);
    });

    test("deve detectar HTTP mesmo com método lowercase", () => {
      const httpRequest = "get / HTTP/1.1\r\n\r\n\n";
      const message = buffer.feedBuffer(Buffer.from(httpRequest));

      // Deve detectar como HTTP e retornar sem o delimiter \n
      expect(message).not.toBeNull();
      expect(message).toContain("get / HTTP/1.1");
    });

    test("deve não confundir texto que começa com GET", () => {
      const textMessage = "GETTING STARTED\n";
      const message = buffer.feedBuffer(Buffer.from(textMessage));

      // Não deve tratar como HTTP (falta espaço após método)
      expect(message).toBe("GETTING STARTED");
    });
  });

  describe("Validação Content-Length", () => {
    test("deve aguardar exatamente Content-Length bytes", () => {
      const headers =
        "POST /api HTTP/1.1\r\n" +
        "Content-Length: 10\r\n" +
        "\r\n";

      buffer.feedBuffer(Buffer.from(headers));
      buffer.feedBuffer(Buffer.from("12345"));

      expect(buffer.feedBuffer(Buffer.from(""))).toBeNull();

      const message = buffer.feedBuffer(Buffer.from("67890\n"));
      expect(message).not.toBeNull();
    });

    test("deve ignorar dados extras após Content-Length", () => {
      const httpRequest =
        "POST /api HTTP/1.1\r\n" +
        "Content-Length: 5\r\n" +
        "\r\n" +
        "Hello Extra Data\n";

      const message = buffer.feedBuffer(Buffer.from(httpRequest));

      expect(message).toBe(
        "POST /api HTTP/1.1\r\n" +
        "Content-Length: 5\r\n" +
        "\r\n" +
        "Hello"
      );

      // Dados extras devem ficar no buffer
      expect(buffer.getSize()).toBeGreaterThan(0);
    });
  });
});
