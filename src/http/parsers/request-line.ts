import { HTTPValidator } from "../validator";
import type { RequestLine, ParseResult, ParseError } from "../../core/types";
import { parserLogger } from "../../utils/logger";

export class RequestLineParser {
  static parse(line: string): ParseResult<RequestLine> {
    if (!line || line.trim() === "") {
      return this.error("Request line vazia", 400);
    }

    const parts = line.trim().split(" ");

    if (parts.length !== 3) {
      return this.error("Request line malformada", 400);
    }

    const [method, path, version] = parts;

    if (!HTTPValidator.isValidMethod(method)) {
      return this.error(`Método HTTP inválido: ${method}`, 405);
    }

    if (!HTTPValidator.isValidPath(path)) {
      return this.error(`Path inválido: ${path}`, 400);
    }

    if (!HTTPValidator.isValidVersion(version)) {
      return this.error(`Versão HTTP inválida: ${version}`, 400);
    }

    parserLogger.debug({
      method,
      path,
      version,
      msg: "Request line parseada",
    });

    return {
      success: true,
      data: {
        method: method.toUpperCase() as any,
        path,
        version,
      },
    };
  }

  private static error(
    message: string,
    statusCode: number
  ): ParseResult<RequestLine> {
    parserLogger.warn({ message, statusCode, msg: "Request line inválida" });

    return {
      success: false,
      error: { message, statusCode },
    };
  }
}
