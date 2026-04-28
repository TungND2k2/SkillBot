import type {
  Collection,
  Document,
  Filter,
  UpdateFilter,
  OptionalUnlessRequiredId,
} from "mongodb";
import { getDb } from "../db/connection.js";
import { toObjectId } from "./id.js";

/**
 * Generic base for collection-backed repositories.
 *
 * Subclasses declare `collectionName` and `_id`-shape via the type parameter.
 * They typically expose a typed `findById`, `list`, plus domain queries
 * like `findByEmail`, `findActiveByTenant`, etc. — converting raw docs into
 * domain Entity objects before returning.
 *
 * The base does NOT return Entity objects directly — that is the subclass's
 * job, because Entity construction may need extra context.
 */
export abstract class BaseRepository<TDoc extends Document> {
  protected abstract readonly collectionName: string;

  /** Lazy collection accessor — DB is only initialized once at boot. */
  protected get collection(): Collection<TDoc> {
    return getDb().collection<TDoc>(this.collectionName);
  }

  protected async findOneRaw(filter: Filter<TDoc>): Promise<TDoc | null> {
    const doc = await this.collection.findOne(filter);
    return doc as TDoc | null;
  }

  protected async findManyRaw(
    filter: Filter<TDoc> = {} as Filter<TDoc>,
    options?: { limit?: number; skip?: number; sort?: Record<string, 1 | -1> },
  ): Promise<TDoc[]> {
    let cursor = this.collection.find(filter);
    if (options?.sort) cursor = cursor.sort(options.sort);
    if (options?.skip) cursor = cursor.skip(options.skip);
    if (options?.limit) cursor = cursor.limit(options.limit);
    return (await cursor.toArray()) as TDoc[];
  }

  async count(filter: Filter<TDoc> = {} as Filter<TDoc>): Promise<number> {
    return this.collection.countDocuments(filter);
  }

  protected async insertRaw(doc: OptionalUnlessRequiredId<TDoc>): Promise<TDoc> {
    const result = await this.collection.insertOne(doc);
    return { ...(doc as TDoc), _id: result.insertedId } as TDoc;
  }

  protected async updateRawById(
    objectIdHex: string,
    update: UpdateFilter<TDoc>,
  ): Promise<boolean> {
    const r = await this.collection.updateOne(
      { _id: toObjectId(objectIdHex) } as Filter<TDoc>,
      update,
    );
    return r.matchedCount > 0;
  }

  protected async deleteRawById(objectIdHex: string): Promise<boolean> {
    const r = await this.collection.deleteOne({ _id: toObjectId(objectIdHex) } as Filter<TDoc>);
    return r.deletedCount > 0;
  }
}
