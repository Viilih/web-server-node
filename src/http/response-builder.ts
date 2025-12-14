import { serverLogger } from "../utils/logger";
import type { HTTPHeaders } from "../core/types";
import {
  COMMON_HEADERS,
  HTTP_STATUS_TEXT,
  HTTP_PROTOCOL,
  HTTP_STATUS,
} from "../utils/consts";

export class ResponseBuilder {
  private statusCode: number = 200;
  private headers: HTTPHeaders = {};
  private bodyContent: string = "";

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  header(name: string, value: string): this {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  multipleHeaders(headers: HTTPHeaders): this {
    for (const [name, value] of Object.entries(headers)) {
      this.header(name, value);
    }
    return this;
  }

  json(data: unknown): this {
    this.bodyContent = JSON.stringify(data, null, 2);
    this.header(COMMON_HEADERS.CONTENT_TYPE, "application/json");
    return this;
  }

  text(text: string): this {
    this.bodyContent = text;
    this.header(COMMON_HEADERS.CONTENT_TYPE, "text/plain");
    return this;
  }

  html(html: string): this {
    this.bodyContent = html;
    this.header(COMMON_HEADERS.CONTENT_TYPE, "text/html");
    return this;
  }

  error(statusCode: number, message?: string): this {
    this.statusCode = statusCode;
    this.json({
      error: HTTP_STATUS_TEXT[statusCode] || "Unknown Error",
      message: message || HTTP_STATUS_TEXT[statusCode],
      statusCode,
    });
    return this;
  }

  build(): string {
    if (!this.headers[COMMON_HEADERS.CONTENT_LENGTH]) {
      this.header(
        COMMON_HEADERS.CONTENT_LENGTH,
        Buffer.byteLength(this.bodyContent).toString()
      );
    }

    if (!this.headers[COMMON_HEADERS.DATE]) {
      this.header(COMMON_HEADERS.DATE, new Date().toUTCString());
    }

    if (!this.headers[COMMON_HEADERS.SERVER]) {
      this.header(COMMON_HEADERS.SERVER, "CustomHTTPServer/1.0");
    }

    const statusMessage = HTTP_STATUS_TEXT[this.statusCode] || "Unknown";
    const statusLine = `${HTTP_PROTOCOL.VERSION} ${this.statusCode} ${statusMessage}`;

    const headerLines = Object.entries(this.headers)
      .map(([name, value]) => `${this.formatHeaderName(name)}: ${value}`)
      .join(HTTP_PROTOCOL.CRLF);

    const response =
      statusLine +
      HTTP_PROTOCOL.CRLF +
      headerLines +
      HTTP_PROTOCOL.CRLF +
      HTTP_PROTOCOL.CRLF +
      this.bodyContent;

    serverLogger.debug({
      statusCode: this.statusCode,
      headersCount: Object.keys(this.headers).length,
      bodyLength: this.bodyContent.length,
      msg: "🔨 Response construída",
    });

    return response;
  }

  private formatHeaderName(name: string): string {
    return name
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("-");
  }

  static ok(data?: unknown): ResponseBuilder {
    const builder = new ResponseBuilder().status(HTTP_STATUS.OK);
    if (data) builder.json(data);
    return builder;
  }

  static created(data?: unknown): ResponseBuilder {
    const builder = new ResponseBuilder().status(HTTP_STATUS.CREATED);
    if (data) builder.json(data);
    return builder;
  }

  static noContent(): ResponseBuilder {
    return new ResponseBuilder().status(HTTP_STATUS.NO_CONTENT);
  }

  static badRequest(message?: string): ResponseBuilder {
    return new ResponseBuilder().error(HTTP_STATUS.BAD_REQUEST, message);
  }

  static notFound(message?: string): ResponseBuilder {
    return new ResponseBuilder().error(HTTP_STATUS.NOT_FOUND, message);
  }

  static methodNotAllowed(message?: string): ResponseBuilder {
    return new ResponseBuilder().error(HTTP_STATUS.METHOD_NOT_ALLOWED, message);
  }

  static internalError(message?: string): ResponseBuilder {
    return new ResponseBuilder().error(
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message
    );
  }
}
