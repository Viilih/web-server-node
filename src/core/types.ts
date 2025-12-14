import type { ResponseBuilder } from "../http/response-builder";

export interface HTTPRequest {
  method: HTTPMethod;
  path: string;
  version: string;
  headers: HTTPHeaders;
  body: HTTPBody | null;
  query: Record<string, string>;
  raw: string;
}

export interface HTTPBody {
  raw: string;
  parsed: unknown;
  contentType: string;
  size: number;
}

export type HTTPMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";

export type HTTPHeaders = Record<string, string>;

export interface HTTPResponse {
  statusCode: number;
  statusMessage: string;
  headers: HTTPHeaders;
  body: Buffer | string;
}

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: ParseError;
}

export interface ParseError {
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface RequestLine {
  method: HTTPMethod;
  path: string;
  version: string;
}

export type RouteHandler = (ctx: RouteContext) => void | Promise<void>;

export interface RouteContext {
  req: HTTPRequest;
  res: ResponseBuilder;
  params: Record<string, string>;
  query: Record<string, string>;
}

export interface Route {
  method: HTTPMethod;
  path: string;
  handler: RouteHandler;
}

export interface ServerConfig {
  port: number;
  host: string;
  timeout?: number;
  maxConnections?: number;
}

export interface Connection {
  id: string;
  socket: import("net").Socket;
  buffer: import("../http/buffer/request-buffer").RequestBuffer;
  createdAt: Date;
}
