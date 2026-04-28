import type { WebSession } from "../domain/web-session/web-session.entity.js";

/**
 * Hono environment shared across all controllers in this app.
 *
 * Variables become available via `c.get("session")` after `sessionMiddleware`
 * (or `requireSession`) runs upstream. Routes that don't need auth simply
 * omit the middleware and never touch `c.get("session")`.
 */
export interface AppEnv {
  Variables: {
    session: WebSession;
  };
}
