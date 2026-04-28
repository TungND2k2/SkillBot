import type { Filter } from "mongodb";
import type { CollectionDoc, CollectionRowDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { toObjectId, fromObjectId } from "../../core/id.js";
import { getDb } from "../../db/connection.js";
import { Collection } from "./collection.entity.js";

export class CollectionRepository extends BaseRepository<CollectionDoc> {
  protected readonly collectionName = "collections";

  async findById(id: string): Promise<Collection | null> {
    const doc = await this.findOneRaw({ _id: toObjectId(id) } as Filter<CollectionDoc>);
    if (!doc) return null;
    const rowCount = await getDb()
      .collection("collection_rows")
      .countDocuments({ collectionId: id });
    return new Collection(doc, rowCount);
  }

  async listByTenant(tenantId: string): Promise<Collection[]> {
    const docs = await this.findManyRaw(
      { tenantId, isActive: true } as Filter<CollectionDoc>,
      { sort: { name: 1 } },
    );
    if (docs.length === 0) return [];
    const ids = docs.map((d) => fromObjectId(d._id));
    const counts = await this.countRowsBatch(ids);
    return docs.map((d) => new Collection(d, counts.get(fromObjectId(d._id)) ?? 0));
  }

  private async countRowsBatch(collectionIds: string[]): Promise<Map<string, number>> {
    const result = await getDb()
      .collection("collection_rows")
      .aggregate<{ _id: string; n: number }>([
        { $match: { collectionId: { $in: collectionIds } } },
        { $group: { _id: "$collectionId", n: { $sum: 1 } } },
      ])
      .toArray();
    const map = new Map<string, number>();
    for (const r of result) map.set(String(r._id), r.n);
    return map;
  }
}

export class CollectionRowRepository extends BaseRepository<CollectionRowDoc> {
  protected readonly collectionName = "collection_rows";

  listByCollection(collectionId: string, limit = 200): Promise<CollectionRowDoc[]> {
    return this.findManyRaw(
      { collectionId } as Filter<CollectionRowDoc>,
      { sort: { createdAt: -1 }, limit },
    );
  }

  countByCollection(collectionId: string): Promise<number> {
    return this.count({ collectionId } as Filter<CollectionRowDoc>);
  }
}
