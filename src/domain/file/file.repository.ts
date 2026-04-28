import type { Filter } from "mongodb";
import type { FileDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { File } from "./file.entity.js";

export class FileRepository extends BaseRepository<FileDoc> {
  protected readonly collectionName = "files";

  async listByTenant(tenantId: string, limit = 100): Promise<File[]> {
    const docs = await this.findManyRaw(
      { tenantId } as Filter<FileDoc>,
      { sort: { createdAt: -1 }, limit },
    );
    return docs.map((d) => new File(d));
  }
}
