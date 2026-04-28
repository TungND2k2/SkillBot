import type { Filter } from "mongodb";
import type { TenantDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { toObjectId } from "../../core/id.js";
import { Tenant } from "./tenant.entity.js";

export class TenantRepository extends BaseRepository<TenantDoc> {
  protected readonly collectionName = "tenants";

  async findById(id: string): Promise<Tenant | null> {
    const doc = await this.findOneRaw({ _id: toObjectId(id) } as Filter<TenantDoc>);
    return doc ? new Tenant(doc) : null;
  }

  async findByBotToken(token: string): Promise<Tenant | null> {
    const doc = await this.findOneRaw({ botToken: token } as Filter<TenantDoc>);
    return doc ? new Tenant(doc) : null;
  }

  async list(): Promise<Tenant[]> {
    const docs = await this.findManyRaw({}, { sort: { createdAt: -1 } });
    return docs.map((d) => new Tenant(d));
  }

  async listActive(): Promise<Tenant[]> {
    const docs = await this.findManyRaw(
      { status: "active" } as Filter<TenantDoc>,
      { sort: { createdAt: -1 } },
    );
    return docs.map((d) => new Tenant(d));
  }
}
