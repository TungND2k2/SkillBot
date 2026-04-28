import type { WorkflowTemplateDoc } from "../../db/types.js";
import type { WorkflowTemplateDto, WorkflowStageDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

export class WorkflowTemplate {
  constructor(private readonly doc: WorkflowTemplateDoc) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get tenantId(): string { return this.doc.tenantId; }
  get name(): string { return this.doc.name; }
  get description(): string | null { return this.doc.description ?? null; }
  get domain(): string | null { return this.doc.domain ?? null; }
  get version(): number { return this.doc.version; }
  get status(): string { return this.doc.status; }

  /** Parse `stages` (Array | JSON string) into a typed list. */
  get stages(): WorkflowStageDto[] {
    let raw: unknown = this.doc.stages;
    if (typeof raw === "string") {
      try { raw = JSON.parse(raw); } catch { raw = []; }
    }
    if (!Array.isArray(raw)) return [];
    return raw
      .map((s): WorkflowStageDto | null => {
        if (!s || typeof s !== "object") return null;
        const obj = s as { id?: unknown; name?: unknown; actor?: unknown; description?: unknown };
        if (typeof obj.id !== "string" || typeof obj.name !== "string") return null;
        return {
          id: obj.id,
          name: obj.name,
          actor: typeof obj.actor === "string" ? obj.actor : undefined,
          description: typeof obj.description === "string" ? obj.description : undefined,
        };
      })
      .filter((x): x is WorkflowStageDto => x !== null);
  }

  get stageCount(): number {
    return this.stages.length;
  }

  toDto(): WorkflowTemplateDto {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      description: this.description,
      domain: this.domain,
      version: this.version,
      stages: this.stages,
      stageCount: this.stageCount,
      status: this.status,
      createdAt: this.doc.createdAt,
      updatedAt: this.doc.updatedAt,
    };
  }
}
