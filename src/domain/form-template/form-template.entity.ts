import type { FormTemplateDoc } from "../../db/types.js";
import type { FormTemplateDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

export class FormTemplate {
  constructor(private readonly doc: FormTemplateDoc) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get tenantId(): string { return this.doc.tenantId; }
  get name(): string { return this.doc.name; }
  get version(): number { return this.doc.version; }
  get status(): string { return this.doc.status; }

  get fieldCount(): number {
    const s = this.doc.schema;
    if (Array.isArray(s)) return s.length;
    if (s && typeof s === "object") {
      const fields = (s as { fields?: unknown }).fields;
      if (Array.isArray(fields)) return fields.length;
      return Object.keys(s).length;
    }
    return 0;
  }

  toDto(): FormTemplateDto {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      version: this.version,
      status: this.status,
      fieldCount: this.fieldCount,
      createdAt: this.doc.createdAt,
      updatedAt: this.doc.updatedAt,
    };
  }
}
