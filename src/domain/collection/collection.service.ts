import { NotFoundError, ForbiddenError } from "../../core/errors.js";
import type { CollectionRowDoc } from "../../db/types.js";
import type { Collection } from "./collection.entity.js";
import type { CollectionRepository, CollectionRowRepository } from "./collection.repository.js";
import { fromObjectId } from "../../core/id.js";

export interface CollectionRowsResult {
  collection: Collection;
  rows: CollectionRowDoc[];
}

export class CollectionService {
  constructor(
    private readonly collections: CollectionRepository,
    private readonly rows: CollectionRowRepository,
  ) {}

  listByTenant(tenantId: string): Promise<Collection[]> {
    return this.collections.listByTenant(tenantId);
  }

  async getRows(collectionId: string, tenantId: string): Promise<CollectionRowsResult> {
    const collection = await this.collections.findById(collectionId);
    if (!collection) throw new NotFoundError("Bảng dữ liệu");
    if (collection.tenantId !== tenantId) {
      throw new ForbiddenError("Không có quyền xem bảng này");
    }
    const rows = await this.rows.listByCollection(collectionId);
    return { collection, rows };
  }

  static rowToDto(row: CollectionRowDoc) {
    return {
      id: fromObjectId(row._id),
      collectionId: row.collectionId,
      data: row.data,
      createdByName: row.createdByName ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
