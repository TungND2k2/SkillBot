import { getCookie } from "hono/cookie";
import { BaseController } from "../../core/controller.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import {
  LoginRequest,
  type MeDto,
  type LoginResponseDto,
} from "../../shared/dto.js";
import { ValidationError } from "../../core/errors.js";
import { WebSessionService } from "../web-session/web-session.service.js";
import type { AuthService } from "./auth.service.js";
import { logger } from "../../utils/logger.js";

const COOKIE_NAME = WebSessionService.cookieName;

export class AuthController extends BaseController<AppEnv> {
  readonly basePath = "/api/auth";

  constructor(private readonly auth: AuthService) {
    super();
  }

  protected registerRoutes(): void {
    /**
     * POST /api/auth/login — body: { username, password }
     *
     * Returns the session token in the body. The caller (web dashboard
     * server action) is responsible for installing it as an httpOnly cookie
     * on its own response — bot is upstream of the user's browser, so
     * setting cookies here would not reach the browser.
     */
    this.router.post("/login", async (c) => {
      const body = await c.req.json().catch(() => ({}));
      const parsed = LoginRequest.safeParse(body);
      if (!parsed.success) {
        throw new ValidationError("Dữ liệu đăng nhập không hợp lệ", parsed.error.issues);
      }

      const result = await this.auth.login({
        ...parsed.data,
        userAgent: c.req.header("user-agent") ?? undefined,
        ipAddress: c.req.header("x-forwarded-for") ?? undefined,
      });

      logger.info(
        "Auth",
        `Login ok: ${parsed.data.username} → tenant=${result.session.tenantId ?? "none"} super=${result.session.isSuperAdmin}`,
      );

      const response: LoginResponseDto = {
        sessionToken: result.session.id,
        session: result.session.toDto(),
        user: result.user.toDto(),
        tenant: result.tenant?.toDto() ?? null,
      };
      return c.json(response);
    });

    /**
     * POST /api/auth/logout — destroys the session matching the cookie.
     * Web is responsible for clearing the cookie on its own response.
     */
    this.router.post("/logout", async (c) => {
      const token = getCookie(c, COOKIE_NAME);
      await this.auth.logout(token);
      return c.json({ ok: true });
    });

    this.router.get("/me", requireSession, async (c) => {
      const session = c.get("session");
      const { user, tenant } = await this.auth.hydrate(session);
      const body: MeDto = {
        session: session.toDto(),
        user: user.toDto(),
        tenant: tenant?.toDto() ?? null,
      };
      return c.json(body);
    });
  }
}
