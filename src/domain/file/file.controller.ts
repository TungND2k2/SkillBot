import { BaseController } from "../../core/controller.js";
import { ForbiddenError } from "../../core/errors.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import type { FilesListDto } from "../../shared/dto.js";
import type { FileService } from "./file.service.js";

export class FileController extends BaseController<AppEnv> {
  readonly basePath = "/api/files";

  constructor(private readonly service: FileService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get("/", requireSession, async (c) => {
      const s = c.get("session");
      if (!s.tenantId) throw new ForbiddenError("Cần chọn cơ sở");
      const files = await this.service.list(s.tenantId);
      const body: FilesListDto = { files: files.map((f) => f.toDto()) };
      return c.json(body);
    });
  }
}
