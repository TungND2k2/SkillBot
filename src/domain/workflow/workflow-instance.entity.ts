import type { WorkflowInstanceDoc } from "../../db/types.js";
import type { WorkflowInstanceDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

export class WorkflowInstance {
  constructor(
    private readonly doc: WorkflowInstanceDoc,
    private readonly templateName: string | null = null,
  ) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get tenantId(): string { return this.doc.tenantId; }
  get templateId(): string { return this.doc.templateId; }
  get status(): string { return this.doc.status; }
  get currentStageId(): string | null { return this.doc.currentStageId ?? null; }
  get initiatedBy(): string { return this.doc.initiatedBy; }

  toDto(): WorkflowInstanceDto {
    return {
      id: this.id,
      templateId: this.templateId,
      templateName: this.templateName,
      tenantId: this.tenantId,
      initiatedBy: this.initiatedBy,
      currentStageId: this.currentStageId,
      status: this.status,
      createdAt: this.doc.createdAt,
      updatedAt: this.doc.updatedAt,
      completedAt: this.doc.completedAt ?? null,
    };
  }
}
