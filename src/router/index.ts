import type { HTTPMethod, RouteHandler, HTTPRequest } from "../core/types";

interface Route {
  method: HTTPMethod;
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
}

export class Router {
  private routes: Route[] = [];

  get(path: string, handler: RouteHandler): this {
    return this.addRoute("GET", path, handler);
  }

  post(path: string, handler: RouteHandler): this {
    return this.addRoute("POST", path, handler);
  }

  put(path: string, handler: RouteHandler): this {
    return this.addRoute("PUT", path, handler);
  }

  delete(path: string, handler: RouteHandler): this {
    return this.addRoute("DELETE", path, handler);
  }

  private addRoute(
    method: HTTPMethod,
    path: string,
    handler: RouteHandler
  ): this {
    const { pattern, paramNames } = this.pathToRegex(path);

    this.routes.push({
      method,
      pattern,
      handler,
      paramNames,
    });

    return this;
  }

  match(
    request: HTTPRequest
  ): { handler: RouteHandler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== request.method) {
        continue;
      }

      const match = route.pattern.exec(request.path);

      if (!match) {
        continue;
      }

      const params: Record<string, string> = {};
      route.paramNames.forEach((name, index) => {
        params[name] = match[index + 1] || "";
      });

      return { handler: route.handler, params };
    }

    return null;
  }

  //    /users/:id, /posts/:postId/comments/:commentId
  private pathToRegex(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];

    let regexPattern = path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    regexPattern = regexPattern.replace(
      /:([a-zA-Z_][a-zA-Z0-9_]*)/g,
      (_, paramName) => {
        paramNames.push(paramName);
        return "([^/]+)";
      }
    );

    regexPattern = `^${regexPattern}$`;

    return {
      pattern: new RegExp(regexPattern),
      paramNames,
    };
  }

  listRoutes(): Array<{ method: string; path: string }> {
    return this.routes.map((route) => ({
      method: route.method,
      path: route.pattern.source,
    }));
  }
}
