import { HTTPValidator } from "../validator";
import type { ParseResult, HTTPHeaders } from "../../core/types";
import { parserLogger } from "../../utils/logger";

export class HeadersParser {
  static parse(lines: string[]): ParseResult<HTTPHeaders> {
    const headers: HTTPHeaders = {};
    let headerCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (!line || line.trim() === "") {
        break;
      }

      if (!HTTPValidator.isValidHeader(line)) {
        parserLogger.warn({
          line,
          msg: '⚠️ Header sem ":" - ignorando',
        });
        continue;
      }

      const { key, value } = this.parseHeaderLine(line);

      if (key && value !== null) {
        headers[key] = value;
        headerCount++;
      }
    }

    parserLogger.debug({
      headerCount,
      headers: Object.keys(headers),
      msg: "Headers parseados",
    });

    return {
      success: true,
      data: headers,
    };
  }

  private static parseHeaderLine(line: string): {
    key: string;
    value: string | null;
  } {
    const colonIndex = line.indexOf(":");

    if (colonIndex === -1) {
      return { key: "", value: null };
    }

    const key = line.substring(0, colonIndex).trim().toLowerCase();
    const value = line.substring(colonIndex + 1).trim();

    return { key, value };
  }

  static getHeader(headers: HTTPHeaders, name: string): string | undefined {
    return headers[name.toLowerCase()];
  }

  static hasHeader(headers: HTTPHeaders, name: string): boolean {
    return name.toLowerCase() in headers;
  }
}
