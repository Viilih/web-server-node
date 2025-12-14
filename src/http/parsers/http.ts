import { parserLogger } from "../../utils/logger";
import type { ParseResult, HTTPRequest } from "../../core/types";
import { HeadersParser } from "./header";
import { RequestLineParser } from "./request-line";
import { BodyParser } from "./body";

export class HTTPParser {
  static parse(rawRequest: string): ParseResult<HTTPRequest> {
    try {
      parserLogger.info({
        requestLength: rawRequest.length,
        preview: rawRequest.substring(0, 100).replace(/\r\n/g, "↵"),
        msg: "📝 Iniciando parse HTTP",
      });

      const lines = rawRequest.split("\r\n");

      const requestLineResult = RequestLineParser.parse(lines[0] || "");

      if (!requestLineResult.success || !requestLineResult.data) {
        return {
          success: false,
          error: requestLineResult.error,
        };
      }

      const headersResult = HeadersParser.parse(lines);

      if (!headersResult.success || !headersResult.data) {
        return {
          success: false,
          error: headersResult.error,
        };
      }

      const bodyResult = BodyParser.parse(rawRequest, headersResult.data);

      if (!bodyResult.success) {
        return {
          success: false,
          error: bodyResult.error,
        };
      }

      const { path, query } = this.parseQueryParams(
        requestLineResult.data.path
      );

      const request: HTTPRequest = {
        method: requestLineResult.data.method,
        path,
        version: requestLineResult.data.version,
        headers: headersResult.data,
        body: bodyResult.data?.size ? bodyResult.data : null,
        query,
        raw: rawRequest,
      };

      parserLogger.info({
        method: request.method,
        path: request.path,
        headersCount: Object.keys(request.headers).length,
        hasBody: request.body !== null,
        bodySize: request.body?.size || 0,
        bodyContentType: request.body?.contentType || "none",
        msg: "✅ Request parseada com sucesso",
      });

      return {
        success: true,
        data: request,
      };
    } catch (error) {
      parserLogger.error({
        error: error instanceof Error ? error.message : String(error),
        msg: "❌ Erro inesperado ao parsear",
      });

      return {
        success: false,
        error: {
          message: "Erro interno no parser",
          statusCode: 500,
          details: error,
        },
      };
    }
  }

  private static parseQueryParams(fullPath: string): {
    path: string;
    query: Record<string, string>;
  } {
    const questionIndex = fullPath.indexOf("?");

    if (questionIndex === -1) {
      return { path: fullPath, query: {} };
    }

    const path = fullPath.substring(0, questionIndex);
    const queryString = fullPath.substring(questionIndex + 1);

    const query: Record<string, string> = {};
    const pairs = queryString.split("&");

    for (const pair of pairs) {
      const [key, value] = pair.split("=");
      if (key) {
        query[decodeURIComponent(key)] = decodeURIComponent(value || "");
      }
    }

    return { path, query };
  }
}
