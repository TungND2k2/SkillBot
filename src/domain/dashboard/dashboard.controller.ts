import { BaseController } from "../../core/controller.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import type { DashboardService } from "./dashboard.service.js";

export class DashboardController extends BaseController<AppEnv> {
  readonly basePath = "/api/dashboard";

  constructor(private readonly service: DashboardService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get("/stats", requireSession, async (c) => {
      const session = c.get("session");
      const stats = await this.service.getStats(session.tenantId);
      return c.json(stats);
    });
  }
}
