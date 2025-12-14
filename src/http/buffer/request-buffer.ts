import { bufferLogger } from "../../utils/logger";

export class RequestBuffer {
  private buffer: Buffer = Buffer.alloc(0);

  feedBuffer(chunk: Buffer): string | null {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    bufferLogger.debug({
      chunkSize: chunk.length,
      totalBuffered: this.buffer.length,
      preview: this.sanitizePreview(chunk.toString("utf-8")),
      msg: "Chunk acumulado",
    });

    const bufferStr = this.buffer.toString("utf-8");
    const isHTTP = /^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s/.test(
      bufferStr
    );

    if (isHTTP) {
      return this.parseHTTPMessage();
    } else {
      return this.parsePlainTextMessage();
    }
  }

  private parseHTTPMessage(): string | null {
    const httpEndPattern = "\r\n\r\n";
    const httpEndIndex = this.buffer.indexOf(httpEndPattern);

    if (httpEndIndex === -1) {
      bufferLogger.debug({
        bufferedBytes: this.buffer.length,
        isHTTP: true,
        msg: "⏳ Aguardando fim dos headers...",
      });
      return null;
    }

    const headersEnd = httpEndIndex + httpEndPattern.length;

    const headersText = this.buffer.slice(0, headersEnd).toString("utf-8");
    const contentLengthMatch = headersText.match(/content-length:\s*(\d+)/i);

    if (contentLengthMatch) {
      return this.parseHTTPWithBody(
        headersEnd,
        parseInt(contentLengthMatch[1]!, 10)
      );
    } else {
      return this.parseHTTPWithoutBody(headersEnd);
    }
  }

  private parseHTTPWithBody(
    headersEnd: number,
    contentLength: number
  ): string | null {
    const expectedMinLength = headersEnd + contentLength;

    if (this.buffer.length < expectedMinLength) {
      bufferLogger.debug({
        bufferedBytes: this.buffer.length,
        expectedBytes: expectedMinLength,
        msg: "⏳ Aguardando body completo...",
      });
      return null;
    }

    const message = this.buffer.slice(0, expectedMinLength).toString("utf-8");

    if (
      this.buffer.length > expectedMinLength &&
      this.buffer[expectedMinLength] === 0x0a
    ) {
      this.buffer = this.buffer.slice(expectedMinLength + 1);
    } else {
      this.buffer = this.buffer.slice(expectedMinLength);
    }

    bufferLogger.info({
      messageLength: message.length,
      contentLength,
      remainingBuffer: this.buffer.length,
      msg: "✅ HTTP request completa (com body)",
    });

    return message;
  }

  private parseHTTPWithoutBody(headersEnd: number): string | null {
    const message = this.buffer.slice(0, headersEnd).toString("utf-8");

    if (this.buffer.length > headersEnd && this.buffer[headersEnd] === 0x0a) {
      this.buffer = this.buffer.slice(headersEnd + 1);
    } else {
      this.buffer = this.buffer.slice(headersEnd);
    }

    bufferLogger.info({
      messageLength: message.length,
      remainingBuffer: this.buffer.length,
      msg: "✅ HTTP request completa (sem body)",
    });

    return message;
  }

  private parsePlainTextMessage(): string | null {
    const newLineIndex = this.buffer.indexOf("\n");

    if (newLineIndex === -1) {
      bufferLogger.debug({
        bufferedBytes: this.buffer.length,
        isHTTP: false,
        msg: "⏳ Aguardando mais dados...",
      });
      return null;
    }

    const message = this.buffer.slice(0, newLineIndex).toString("utf-8");
    this.buffer = this.buffer.slice(newLineIndex + 1);

    bufferLogger.info({
      messageLength: message.length,
      remainingBuffer: this.buffer.length,
      msg: "✅ Mensagem de texto completa",
    });

    return message;
  }

  reset(): void {
    const hadData = this.buffer.length > 0;
    this.buffer = Buffer.alloc(0);

    if (hadData) {
      bufferLogger.debug("Buffer resetado");
    }
  }

  getSize(): number {
    return this.buffer.length;
  }

  private sanitizePreview(text: string): string {
    return text.substring(0, 50).replace(/\r/g, "↵").replace(/\n/g, "⏎");
  }
}
