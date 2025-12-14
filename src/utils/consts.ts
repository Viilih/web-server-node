export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
  OPTIONS: "OPTIONS",
  HEAD: "HEAD",
} as const;

export const VALID_METHODS = Object.values(HTTP_METHODS);

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  REQUEST_TIMEOUT: 408,
  PAYLOAD_TOO_LARGE: 413,

  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const HTTP_STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  408: "Request Timeout",
  413: "Payload Too Large",
  500: "Internal Server Error",
  501: "Not Implemented",
  503: "Service Unavailable",
};

export const COMMON_HEADERS = {
  CONTENT_TYPE: "content-type",
  CONTENT_LENGTH: "content-length",
  HOST: "host",
  USER_AGENT: "user-agent",
  ACCEPT: "accept",
  AUTHORIZATION: "authorization",
  CONNECTION: "connection",
  DATE: "date",
  SERVER: "server",
} as const;

export const CONTENT_TYPES = {
  JSON: "application/json",
  TEXT: "text/plain",
  HTML: "text/html",
  XML: "application/xml",
  FORM: "application/x-www-form-urlencoded",
} as const;

export const HTTP_PROTOCOL = {
  VERSION: "HTTP/1.1",
  CRLF: "\r\n",
  HEADER_END: "\r\n\r\n",
} as const;

export const SERVER_DEFAULTS = {
  PORT: 3000,
  HOST: "127.0.0.1",
  TIMEOUT: 30000, // 30s
  MAX_CONNECTIONS: 100,
  SERVER_NAME: "CustomHTTPServer/1.0",
} as const;
