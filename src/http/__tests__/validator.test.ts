import { describe, test, expect } from "bun:test";
import { HTTPValidator } from "../validator";

describe("HTTPValidator", () => {
  describe("isValidMethod", () => {
    test("deve aceitar métodos HTTP válidos", () => {
      expect(HTTPValidator.isValidMethod("GET")).toBe(true);
      expect(HTTPValidator.isValidMethod("POST")).toBe(true);
      expect(HTTPValidator.isValidMethod("PUT")).toBe(true);
      expect(HTTPValidator.isValidMethod("DELETE")).toBe(true);
      expect(HTTPValidator.isValidMethod("PATCH")).toBe(true);
      expect(HTTPValidator.isValidMethod("OPTIONS")).toBe(true);
      expect(HTTPValidator.isValidMethod("HEAD")).toBe(true);
    });

    test("deve aceitar métodos em lowercase", () => {
      expect(HTTPValidator.isValidMethod("get")).toBe(true);
      expect(HTTPValidator.isValidMethod("post")).toBe(true);
    });

    test("deve rejeitar métodos inválidos", () => {
      expect(HTTPValidator.isValidMethod("INVALID")).toBe(false);
      expect(HTTPValidator.isValidMethod("")).toBe(false);
      expect(HTTPValidator.isValidMethod("G E T")).toBe(false);
    });
  });

  describe("isValidVersion", () => {
    test("deve aceitar versões HTTP válidas", () => {
      expect(HTTPValidator.isValidVersion("HTTP/1.0")).toBe(true);
      expect(HTTPValidator.isValidVersion("HTTP/1.1")).toBe(true);
      expect(HTTPValidator.isValidVersion("HTTP/2.0")).toBe(true);
    });

    test("deve rejeitar versões inválidas", () => {
      expect(HTTPValidator.isValidVersion("HTTP/1")).toBe(false);
      expect(HTTPValidator.isValidVersion("HTTP 1.1")).toBe(false);
      expect(HTTPValidator.isValidVersion("HTTP/")).toBe(false);
      expect(HTTPValidator.isValidVersion("1.1")).toBe(false);
      expect(HTTPValidator.isValidVersion("")).toBe(false);
    });
  });

  describe("isValidPath", () => {
    test("deve aceitar paths válidos", () => {
      expect(HTTPValidator.isValidPath("/")).toBe(true);
      expect(HTTPValidator.isValidPath("/api/users")).toBe(true);
      expect(HTTPValidator.isValidPath("/api/users/123")).toBe(true);
      expect(HTTPValidator.isValidPath("/path/to/resource.json")).toBe(true);
    });

    test("deve aceitar paths com query string", () => {
      expect(HTTPValidator.isValidPath("/api/users?id=123")).toBe(true);
      expect(HTTPValidator.isValidPath("/search?q=test&limit=10")).toBe(true);
    });

    test("deve rejeitar paths sem barra inicial", () => {
      expect(HTTPValidator.isValidPath("api/users")).toBe(false);
      expect(HTTPValidator.isValidPath("users")).toBe(false);
    });

    test("deve rejeitar directory traversal", () => {
      expect(HTTPValidator.isValidPath("/api/../etc/passwd")).toBe(false);
      expect(HTTPValidator.isValidPath("/../../secret")).toBe(false);
    });

    test("deve rejeitar paths vazios", () => {
      expect(HTTPValidator.isValidPath("")).toBe(false);
    });
  });

  describe("isValidHeader", () => {
    test("deve aceitar headers válidos", () => {
      expect(HTTPValidator.isValidHeader("Content-Type: application/json")).toBe(true);
      expect(HTTPValidator.isValidHeader("Host: localhost")).toBe(true);
      expect(HTTPValidator.isValidHeader("Authorization: Bearer token")).toBe(true);
    });

    test("deve aceitar header com valor vazio", () => {
      expect(HTTPValidator.isValidHeader("X-Empty:")).toBe(true);
    });

    test("deve rejeitar header sem dois pontos", () => {
      expect(HTTPValidator.isValidHeader("Content-Type")).toBe(false);
      expect(HTTPValidator.isValidHeader("Invalid Header")).toBe(false);
    });
  });

  describe("isValidContentLength", () => {
    test("deve aceitar valores numéricos válidos", () => {
      expect(HTTPValidator.isValidContentLength("0")).toBe(true);
      expect(HTTPValidator.isValidContentLength("100")).toBe(true);
      expect(HTTPValidator.isValidContentLength("1234567")).toBe(true);
    });

    test("deve rejeitar valores negativos", () => {
      expect(HTTPValidator.isValidContentLength("-1")).toBe(false);
      expect(HTTPValidator.isValidContentLength("-100")).toBe(false);
    });

    test("deve rejeitar valores não numéricos", () => {
      expect(HTTPValidator.isValidContentLength("abc")).toBe(false);
      expect(HTTPValidator.isValidContentLength("12.5")).toBe(false);
      expect(HTTPValidator.isValidContentLength("")).toBe(false);
    });
  });
});
