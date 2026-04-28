import { BaseController } from "../../core/controller.js";
import { ForbiddenError } from "../../core/errors.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import type { TenantUsersListDto } from "../../shared/dto.js";
import type { TenantUserService } from "./tenant-user.service.js";

export class TenantUserController extends BaseController<AppEnv> {
  readonly basePath = "/api/users";

  constructor(private readonly service: TenantUserService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get("/", requireSession, async (c) => {
      const s = c.get("session");
      if (!s.tenantId) throw new ForbiddenError("Cần chọn cơ sở");
      const users = await this.service.listByTenant(s.tenantId);
      const body: TenantUsersListDto = { users: users.map((u) => u.toDto()) };
      return c.json(body);
    });
  }
}
