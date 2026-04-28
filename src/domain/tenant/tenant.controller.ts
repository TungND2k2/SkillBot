import { BaseController } from "../../core/controller.js";
import { ForbiddenError } from "../../core/errors.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import type { TenantsListDto } from "../../shared/dto.js";
import type { TenantService } from "./tenant.service.js";

export class TenantController extends BaseController<AppEnv> {
  readonly basePath = "/api/tenants";

  constructor(private readonly service: TenantService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get("/", requireSession, async (c) => {
      const session = c.get("session");
      if (!session.isSuperAdmin) {
        throw new ForbiddenError("Chỉ super-admin xem được toàn bộ tenant");
      }
      const tenants = await this.service.list();
      const body: TenantsListDto = { tenants: tenants.map((t) => t.toDto()) };
      return c.json(body);
    });

    this.router.get("/:id", requireSession, async (c) => {
      const session = c.get("session");
      const id = c.req.param("id");
      // Non super-admins can only fetch their own tenant.
      if (!session.isSuperAdmin && session.tenantId !== id) {
        throw new ForbiddenError();
      }
      const tenant = await this.service.getById(id);
      return c.json({ tenant: tenant.toDto() });
    });
  }
}
