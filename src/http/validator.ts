import { VALID_METHODS } from "../utils/consts";
import type { HTTPMethod } from "../core/types";

export class HTTPValidator {
  static isValidMethod(method: string): method is HTTPMethod {
    return VALID_METHODS.includes(method.toUpperCase() as HTTPMethod);
  }

  static isValidVersion(version: string): boolean {
    return /^HTTP\/\d\.\d$/.test(version);
  }

  static isValidPath(path: string): boolean {
    if (!path.startsWith("/")) return false;

    if (path.includes("..")) return false;

    return true;
  }

  static isValidHeader(line: string): boolean {
    return line.includes(":");
  }

  static isValidContentLength(value: string): boolean {
    if (!/^\d+$/.test(value)) {
      return false;
    }

    const num = parseInt(value, 10);
    return !isNaN(num) && num >= 0;
  }
}
