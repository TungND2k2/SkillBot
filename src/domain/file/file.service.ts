import type { File } from "./file.entity.js";
import type { FileRepository } from "./file.repository.js";

export class FileService {
  constructor(private readonly repo: FileRepository) {}

  list(tenantId: string): Promise<File[]> {
    return this.repo.listByTenant(tenantId);
  }
}
