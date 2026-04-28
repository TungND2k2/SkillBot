import { BaseController } from "../../core/controller.js";
import { ForbiddenError } from "../../core/errors.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import type { FormTemplatesListDto } from "../../shared/dto.js";
import type { FormTemplateService } from "./form-template.service.js";

export class FormTemplateController extends BaseController<AppEnv> {
  readonly basePath = "/api/forms";

  constructor(private readonly service: FormTemplateService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get("/", requireSession, async (c) => {
      const s = c.get("session");
      if (!s.tenantId) throw new ForbiddenError("Cần chọn cơ sở");
      const forms = await this.service.list(s.tenantId);
      const body: FormTemplatesListDto = { forms: forms.map((f) => f.toDto()) };
      return c.json(body);
    });
  }
}
