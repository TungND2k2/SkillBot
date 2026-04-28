import { NotFoundError } from "../../core/errors.js";
import type { Tenant } from "./tenant.entity.js";
import type { TenantRepository } from "./tenant.repository.js";

export class TenantService {
  constructor(private readonly repo: TenantRepository) {}

  list(): Promise<Tenant[]> {
    return this.repo.list();
  }

  listActive(): Promise<Tenant[]> {
    return this.repo.listActive();
  }

  async getById(id: string): Promise<Tenant> {
    const t = await this.repo.findById(id);
    if (!t) throw new NotFoundError("Cơ sở (tenant)");
    return t;
  }

  findById(id: string): Promise<Tenant | null> {
    return this.repo.findById(id);
  }
}
