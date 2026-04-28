import { BaseController } from "../../core/controller.js";
import { ForbiddenError } from "../../core/errors.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import type { ConversationSessionsListDto } from "../../shared/dto.js";
import type { ConversationSessionService } from "./conversation-session.service.js";

export class ConversationSessionController extends BaseController<AppEnv> {
  readonly basePath = "/api/sessions";

  constructor(private readonly service: ConversationSessionService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get("/", requireSession, async (c) => {
      const s = c.get("session");
      if (!s.tenantId) throw new ForbiddenError("Cần chọn cơ sở");
      const sessions = await this.service.list(s.tenantId);
      const body: ConversationSessionsListDto = { sessions: sessions.map((x) => x.toDto()) };
      return c.json(body);
    });
  }
}
