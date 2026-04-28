import type { Filter } from "mongodb";
import type { FormTemplateDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { FormTemplate } from "./form-template.entity.js";

export class FormTemplateRepository extends BaseRepository<FormTemplateDoc> {
  protected readonly collectionName = "form_templates";

  async listByTenant(tenantId: string): Promise<FormTemplate[]> {
    const docs = await this.findManyRaw(
      { tenantId } as Filter<FormTemplateDoc>,
      { sort: { name: 1 } },
    );
    return docs.map((d) => new FormTemplate(d));
  }
}
