import { Hono, type Env } from "hono";

/**
 * Base class for HTTP controllers.
 *
 * Each controller owns a Hono sub-router under `basePath`. Subclasses
 * implement `registerRoutes()` — typically calling `this.router.get(...)`,
 * `this.router.post(...)`, etc., possibly with middleware.
 *
 * The HTTP server wires controllers via `app.route(c.basePath, c.build())`.
 *
 * The `Env` type parameter lets concrete controllers declare what they
 * expect on Hono context (e.g. `session` set by `sessionMiddleware`).
 */
export abstract class BaseController<E extends Env = Env> {
  abstract readonly basePath: string;
  readonly router: Hono<E>;

  constructor() {
    this.router = new Hono<E>();
  }

  /** Register routes onto `this.router`. Called by `build()` from the wiring layer. */
  protected abstract registerRoutes(): void;

  /** One-shot setup: register routes and return the Hono router for mounting. */
  build(): Hono<E> {
    this.registerRoutes();
    return this.router;
  }
}
