import { BaseController } from "../../core/controller.js";
import { ForbiddenError } from "../../core/errors.js";
import type { AppEnv } from "../../http/app-context.js";
import { requireSession } from "../../http/middleware/session.middleware.js";
import type {
  CollectionsListDto,
  CollectionRowsListDto,
} from "../../shared/dto.js";
import { CollectionService } from "./collection.service.js";

export class CollectionController extends BaseController<AppEnv> {
  readonly basePath = "/api/collections";

  constructor(private readonly service: CollectionService) {
    super();
  }

  protected registerRoutes(): void {
    this.router.get("/", requireSession, async (c) => {
      const session = c.get("session");
      if (!session.tenantId) throw new ForbiddenError("Cần chọn cơ sở để xem bảng dữ liệu");
      const collections = await this.service.listByTenant(session.tenantId);
      const body: CollectionsListDto = { collections: collections.map((x) => x.toDto()) };
      return c.json(body);
    });

    this.router.get("/:id/rows", requireSession, async (c) => {
      const session = c.get("session");
      if (!session.tenantId) throw new ForbiddenError("Cần chọn cơ sở");
      const { collection, rows } = await this.service.getRows(c.req.param("id"), session.tenantId);
      const body: CollectionRowsListDto = {
        collection: collection.toDto(),
        rows: rows.map(CollectionService.rowToDto),
      };
      return c.json(body);
    });
  }
}
