import { parserLogger } from "../../utils/logger";
import type { HTTPHeaders, ParseResult } from "../../core/types";
import { COMMON_HEADERS, HTTP_PROTOCOL } from "../../utils/consts";

export enum BodyContentType {
  JSON = "application/json",
  FORM_URLENCODED = "application/x-www-form-urlencoded",
  TEXT = "text/plain",
  HTML = "text/html",
  MULTIPART = "multipart/form-data",
  UNKNOWN = "unknown",
}

export interface ParsedBody {
  raw: string;
  parsed: unknown;
  contentType: BodyContentType;
  size: number;
}

export class BodyParser {
  static parse(
    rawRequest: string,
    headers: HTTPHeaders
  ): ParseResult<ParsedBody> {
    try {
      const bodyStartIndex = rawRequest.indexOf(HTTP_PROTOCOL.HEADER_END);

      if (bodyStartIndex === -1) {
        return {
          success: true,
          data: {
            raw: "",
            parsed: null,
            contentType: BodyContentType.UNKNOWN,
            size: 0,
          },
        };
      }

      const bodyRaw = rawRequest.substring(
        bodyStartIndex + HTTP_PROTOCOL.HEADER_END.length
      );

      if (!bodyRaw || bodyRaw.trim() === "") {
        return {
          success: true,
          data: {
            raw: "",
            parsed: null,
            contentType: BodyContentType.UNKNOWN,
            size: 0,
          },
        };
      }

      const contentType = this.getContentType(headers);

      const parsed = this.parseByContentType(bodyRaw, contentType);

      parserLogger.debug({
        contentType,
        bodySize: bodyRaw.length,
        parsed: parsed !== null,
        msg: "Body parseado",
      });

      return {
        success: true,
        data: {
          raw: bodyRaw,
          parsed,
          contentType,
          size: bodyRaw.length,
        },
      };
    } catch (error) {
      parserLogger.error({
        error: error instanceof Error ? error.message : String(error),
        msg: "❌ Erro ao parsear body",
      });

      return {
        success: false,
        error: {
          message: "Erro ao parsear body",
          statusCode: 400,
          details: error,
        },
      };
    }
  }

  private static getContentType(headers: HTTPHeaders): BodyContentType {
    const contentTypeHeader = headers[COMMON_HEADERS.CONTENT_TYPE];

    if (!contentTypeHeader) {
      return BodyContentType.UNKNOWN;
    }

    const contentType = contentTypeHeader.split(";")[0]?.trim().toLowerCase();

    if (contentType?.includes("application/json")) {
      return BodyContentType.JSON;
    }

    if (contentType?.includes("application/x-www-form-urlencoded")) {
      return BodyContentType.FORM_URLENCODED;
    }

    if (contentType?.includes("text/plain")) {
      return BodyContentType.TEXT;
    }

    if (contentType?.includes("text/html")) {
      return BodyContentType.HTML;
    }

    if (contentType?.includes("multipart/form-data")) {
      return BodyContentType.MULTIPART;
    }

    return BodyContentType.UNKNOWN;
  }

  private static parseByContentType(
    bodyRaw: string,
    contentType: BodyContentType
  ): unknown {
    switch (contentType) {
      case BodyContentType.JSON:
        return this.parseJSON(bodyRaw);

      case BodyContentType.FORM_URLENCODED:
        return this.parseFormUrlEncoded(bodyRaw);

      case BodyContentType.TEXT:
      case BodyContentType.HTML:
        return bodyRaw;

      case BodyContentType.MULTIPART:
        parserLogger.warn("Multipart form-data não suportado ainda");
        return null;

      default:
        return bodyRaw;
    }
  }

  private static parseJSON(bodyRaw: string): unknown {
    try {
      return JSON.parse(bodyRaw);
    } catch (error) {
      parserLogger.warn({
        error: error instanceof Error ? error.message : String(error),
        msg: "⚠️ JSON inválido no body",
      });

      return null;
    }
  }

  private static parseFormUrlEncoded(
    bodyRaw: string
  ): Record<string, string> | null {
    try {
      const result: Record<string, string> = {};
      const pairs = bodyRaw.split("&");

      for (const pair of pairs) {
        if (!pair) continue;

        const [key, value] = pair.split("=");

        if (key) {
          const decodedKey = decodeURIComponent(key.replace(/\+/g, " "));
          const decodedValue = value
            ? decodeURIComponent(value.replace(/\+/g, " "))
            : "";

          result[decodedKey] = decodedValue;
        }
      }

      return result;
    } catch (error) {
      parserLogger.warn({
        error: error instanceof Error ? error.message : String(error),
        msg: "⚠️ Erro ao parsear form-urlencoded",
      });

      return null;
    }
  }

  static validateContentLength(
    bodySize: number,
    headers: HTTPHeaders
  ): boolean {
    const contentLength = headers[COMMON_HEADERS.CONTENT_LENGTH];

    if (!contentLength) {
      return true;
    }

    const expectedLength = parseInt(contentLength, 10);

    if (isNaN(expectedLength)) {
      return false;
    }

    return bodySize === expectedLength;
  }

  static hasBody(headers: HTTPHeaders): boolean {
    const contentLength = headers[COMMON_HEADERS.CONTENT_LENGTH];

    if (contentLength && parseInt(contentLength, 10) > 0) {
      return true;
    }

    const transferEncoding = headers["transfer-encoding"];
    if (transferEncoding?.toLowerCase().includes("chunked")) {
      return true;
    }

    return false;
  }
}
