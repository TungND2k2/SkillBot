import type { FormTemplate } from "./form-template.entity.js";
import type { FormTemplateRepository } from "./form-template.repository.js";

export class FormTemplateService {
  constructor(private readonly repo: FormTemplateRepository) {}

  list(tenantId: string): Promise<FormTemplate[]> {
    return this.repo.listByTenant(tenantId);
  }
}
