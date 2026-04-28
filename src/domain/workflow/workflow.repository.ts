import type { Filter } from "mongodb";
import type { WorkflowTemplateDoc, WorkflowInstanceDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { toObjectId, fromObjectId } from "../../core/id.js";
import { WorkflowTemplate } from "./workflow-template.entity.js";
import { WorkflowInstance } from "./workflow-instance.entity.js";

export class WorkflowTemplateRepository extends BaseRepository<WorkflowTemplateDoc> {
  protected readonly collectionName = "workflow_templates";

  async findById(id: string): Promise<WorkflowTemplate | null> {
    if (id.length !== 24) return null;
    const doc = await this.findOneRaw({ _id: toObjectId(id) } as Filter<WorkflowTemplateDoc>);
    return doc ? new WorkflowTemplate(doc) : null;
  }

  async listByTenant(tenantId: string): Promise<WorkflowTemplate[]> {
    const docs = await this.findManyRaw(
      { tenantId } as Filter<WorkflowTemplateDoc>,
      { sort: { name: 1 } },
    );
    return docs.map((d) => new WorkflowTemplate(d));
  }
}

export class WorkflowInstanceRepository extends BaseRepository<WorkflowInstanceDoc> {
  protected readonly collectionName = "workflow_instances";

  async listByTenant(tenantId: string, limit = 100): Promise<WorkflowInstance[]> {
    const docs = await this.findManyRaw(
      { tenantId } as Filter<WorkflowInstanceDoc>,
      { sort: { updatedAt: -1 }, limit },
    );
    if (docs.length === 0) return [];
    // Hydrate template names in one query.
    const templateIds = Array.from(new Set(docs.map((d) => d.templateId).filter(Boolean)));
    const { getDb } = await import("../../db/connection.js");
    const validIds = templateIds.filter((id) => id && id.length === 24);
    const templates = validIds.length === 0
      ? []
      : await getDb()
          .collection<WorkflowTemplateDoc>("workflow_templates")
          .find({ _id: { $in: validIds.map((id) => toObjectId(id)) } } as Filter<WorkflowTemplateDoc>)
          .project({ _id: 1, name: 1 })
          .toArray() as Array<{ _id: { toHexString(): string }; name: string }>;
    const nameById = new Map(templates.map((t) => [fromObjectId(t._id as never), t.name]));
    return docs.map((d) => new WorkflowInstance(d, nameById.get(d.templateId) ?? null));
  }
}
