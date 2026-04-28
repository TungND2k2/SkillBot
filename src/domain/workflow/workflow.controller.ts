import { BaseController } from "../../core/controller.js";
import { ForbiddenError } from "../../core/errors.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import type {
  WorkflowTemplatesListDto,
  WorkflowInstancesListDto,
} from "../../shared/dto.js";
import type { WorkflowService } from "./workflow.service.js";

export class WorkflowController extends BaseController<AppEnv> {
  readonly basePath = "/api/workflows";

  constructor(private readonly service: WorkflowService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get("/templates", requireSession, async (c) => {
      const s = c.get("session");
      if (!s.tenantId) throw new ForbiddenError("Cần chọn cơ sở");
      const templates = await this.service.listTemplates(s.tenantId);
      const body: WorkflowTemplatesListDto = { templates: templates.map((t) => t.toDto()) };
      return c.json(body);
    });

    this.router.get("/instances", requireSession, async (c) => {
      const s = c.get("session");
      if (!s.tenantId) throw new ForbiddenError("Cần chọn cơ sở");
      const instances = await this.service.listInstances(s.tenantId);
      const body: WorkflowInstancesListDto = { instances: instances.map((i) => i.toDto()) };
      return c.json(body);
    });

    this.router.get("/templates/:id", requireSession, async (c) => {
      const s = c.get("session");
      if (!s.tenantId) throw new ForbiddenError("Cần chọn cơ sở");
      const template = await this.service.getTemplate(c.req.param("id"), s.tenantId);
      return c.json(template.toDto());
    });
  }
}
