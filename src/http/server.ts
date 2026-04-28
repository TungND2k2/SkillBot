import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger as honoLogger } from "hono/logger";
import { httpErrorHandler } from "../core/http-error-handler.js";
import type { BaseController } from "../core/controller.js";
import type { AppEnv } from "./app-context.js";
import { logger } from "../utils/logger.js";

export interface ApiServerHandle {
  stop(): Promise<void>;
}

export interface BuildAppOptions {
  controllers: BaseController<AppEnv>[];
}

export function buildApp(options: BuildAppOptions): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use("*", honoLogger((msg) => logger.debug("HTTP", msg)));

  app.get("/api/health", (c) => c.json({ ok: true, ts: Date.now() }));

  for (const controller of options.controllers) {
    app.route(controller.basePath, controller.build());
  }

  app.notFound((c) => c.json({ error: { code: "not_found", message: "Endpoint không tồn tại" } }, 404));
  app.onError(httpErrorHandler);

  return app;
}

export function startApiServer(port: number, controllers: BaseController<AppEnv>[]): ApiServerHandle {
  const app = buildApp({ controllers });
  const server = serve({ fetch: app.fetch, port }, ({ port: actualPort }) => {
    logger.info("HTTP", `API server listening on http://localhost:${actualPort}`);
  });

  return {
    stop: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}
