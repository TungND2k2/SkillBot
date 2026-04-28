import { NotFoundError, ForbiddenError } from "../../core/errors.js";
import type { WorkflowTemplate } from "./workflow-template.entity.js";
import type { WorkflowInstance } from "./workflow-instance.entity.js";
import type {
  WorkflowTemplateRepository,
  WorkflowInstanceRepository,
} from "./workflow.repository.js";

export class WorkflowService {
  constructor(
    private readonly templates: WorkflowTemplateRepository,
    private readonly instances: WorkflowInstanceRepository,
  ) {}

  listTemplates(tenantId: string): Promise<WorkflowTemplate[]> {
    return this.templates.listByTenant(tenantId);
  }

  listInstances(tenantId: string): Promise<WorkflowInstance[]> {
    return this.instances.listByTenant(tenantId);
  }

  async getTemplate(id: string, tenantId: string): Promise<WorkflowTemplate> {
    const template = await this.templates.findById(id);
    if (!template) throw new NotFoundError("Workflow template");
    if (template.tenantId !== tenantId) throw new ForbiddenError();
    return template;
  }
}
