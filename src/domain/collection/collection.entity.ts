import type { CollectionDoc } from "../../db/types.js";
import type { CollectionDto, CollectionFieldDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

export class Collection {
  constructor(
    private readonly doc: CollectionDoc,
    private readonly rowCount: number = 0,
  ) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get tenantId(): string { return this.doc.tenantId; }
  get name(): string { return this.doc.name; }
  get slug(): string { return this.doc.slug; }
  get description(): string | null { return this.doc.description ?? null; }
  get isActive(): boolean { return this.doc.isActive; }

  get fields(): CollectionFieldDto[] {
    const raw = this.doc.fields;
    if (Array.isArray(raw)) {
      return raw
        .map((f): CollectionFieldDto | null => {
          if (typeof f === "string") return { name: f };
          if (f && typeof f === "object") {
            const obj = f as { name?: unknown; label?: unknown; type?: unknown };
            if (typeof obj.name === "string") {
              return {
                name: obj.name,
                label: typeof obj.label === "string" ? obj.label : undefined,
                type: typeof obj.type === "string" ? obj.type : undefined,
              };
            }
          }
          return null;
        })
        .filter((x): x is CollectionFieldDto => x !== null);
    }
    if (raw && typeof raw === "object") {
      return Object.entries(raw).map(([name, v]) => ({
        name,
        label: typeof v === "object" && v && "label" in v && typeof (v as { label: unknown }).label === "string"
          ? ((v as { label: string }).label)
          : undefined,
        type: typeof v === "object" && v && "type" in v && typeof (v as { type: unknown }).type === "string"
          ? ((v as { type: string }).type)
          : undefined,
      }));
    }
    return [];
  }

  get fieldCount(): number {
    return this.fields.length;
  }

  toDto(): CollectionDto {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      slug: this.slug,
      description: this.description,
      fields: this.fields,
      fieldCount: this.fieldCount,
      rowCount: this.rowCount,
      isActive: this.isActive,
      createdAt: this.doc.createdAt,
      updatedAt: this.doc.updatedAt,
    };
  }
}
