/**
 * HTTP wiring — instantiates repositories, services, and controllers.
 * One place to read to understand the graph; called once from `index.ts`.
 */
import { TenantRepository } from "../domain/tenant/tenant.repository.js";
import { TenantService } from "../domain/tenant/tenant.service.js";
import { TenantController } from "../domain/tenant/tenant.controller.js";

import {
  TenantUserRepository,
  SuperAdminRepository,
} from "../domain/tenant-user/tenant-user.repository.js";
import { TenantUserService } from "../domain/tenant-user/tenant-user.service.js";
import { TenantUserController } from "../domain/tenant-user/tenant-user.controller.js";

import { WebUserRepository } from "../domain/web-user/web-user.repository.js";
import { WebUserService } from "../domain/web-user/web-user.service.js";

import { WebSessionRepository } from "../domain/web-session/web-session.repository.js";
import { WebSessionService } from "../domain/web-session/web-session.service.js";

import { AuthService } from "../domain/auth/auth.service.js";
import { AuthController } from "../domain/auth/auth.controller.js";

import { DashboardService } from "../domain/dashboard/dashboard.service.js";
import { DashboardController } from "../domain/dashboard/dashboard.controller.js";

import {
  CollectionRepository,
  CollectionRowRepository,
} from "../domain/collection/collection.repository.js";
import { CollectionService } from "../domain/collection/collection.service.js";
import { CollectionController } from "../domain/collection/collection.controller.js";

import {
  WorkflowTemplateRepository,
  WorkflowInstanceRepository,
} from "../domain/workflow/workflow.repository.js";
import { WorkflowService } from "../domain/workflow/workflow.service.js";
import { WorkflowController } from "../domain/workflow/workflow.controller.js";

import { FormTemplateRepository } from "../domain/form-template/form-template.repository.js";
import { FormTemplateService } from "../domain/form-template/form-template.service.js";
import { FormTemplateController } from "../domain/form-template/form-template.controller.js";

import { FileRepository } from "../domain/file/file.repository.js";
import { FileService } from "../domain/file/file.service.js";
import { FileController } from "../domain/file/file.controller.js";

import { CronJobRepository } from "../domain/cron-job/cron-job.repository.js";
import { CronJobService } from "../domain/cron-job/cron-job.service.js";
import { CronJobController } from "../domain/cron-job/cron-job.controller.js";

import { AuditLogRepository } from "../domain/audit-log/audit-log.repository.js";
import { AuditLogService } from "../domain/audit-log/audit-log.service.js";
import { AuditLogController } from "../domain/audit-log/audit-log.controller.js";

import { ConversationSessionRepository } from "../domain/conversation-session/conversation-session.repository.js";
import { ConversationSessionService } from "../domain/conversation-session/conversation-session.service.js";
import { ConversationSessionController } from "../domain/conversation-session/conversation-session.controller.js";

import type { BaseController } from "../core/controller.js";
import type { AppEnv } from "./app-context.js";
import { setSessionService } from "./middleware/session.middleware.js";

export interface WiredHttp {
  controllers: BaseController<AppEnv>[];
  webUsers: WebUserService;
  sessions: WebSessionService;
  tenantUsers: TenantUserService;
}

export function wireHttp(): WiredHttp {
  // ── Repositories ──────────────────────────────────────────
  const tenantRepo = new TenantRepository();
  const tenantUserRepo = new TenantUserRepository();
  const superAdminRepo = new SuperAdminRepository();
  const webUserRepo = new WebUserRepository();
  const sessionRepo = new WebSessionRepository();
  const collectionRepo = new CollectionRepository();
  const collectionRowRepo = new CollectionRowRepository();
  const workflowTemplateRepo = new WorkflowTemplateRepository();
  const workflowInstanceRepo = new WorkflowInstanceRepository();
  const formTemplateRepo = new FormTemplateRepository();
  const fileRepo = new FileRepository();
  const cronJobRepo = new CronJobRepository();
  const auditLogRepo = new AuditLogRepository();
  const conversationSessionRepo = new ConversationSessionRepository();

  // ── Services ──────────────────────────────────────────────
  const tenantService = new TenantService(tenantRepo);
  const tenantUsers = new TenantUserService(tenantUserRepo, superAdminRepo);
  const webUsers = new WebUserService(webUserRepo);
  const sessions = new WebSessionService(sessionRepo);
  const authService = new AuthService(tenantService, webUsers, sessions);
  const dashboardService = new DashboardService();
  const collectionService = new CollectionService(collectionRepo, collectionRowRepo);
  const workflowService = new WorkflowService(workflowTemplateRepo, workflowInstanceRepo);
  const formTemplateService = new FormTemplateService(formTemplateRepo);
  const fileService = new FileService(fileRepo);
  const cronJobService = new CronJobService(cronJobRepo);
  const auditLogService = new AuditLogService(auditLogRepo);
  const conversationSessionService = new ConversationSessionService(conversationSessionRepo);

  // Inject session service into the middleware so requireSession can use it.
  setSessionService(sessions);

  // ── Controllers ───────────────────────────────────────────
  const controllers: BaseController<AppEnv>[] = [
    new AuthController(authService),
    new DashboardController(dashboardService),
    new TenantController(tenantService),
    new TenantUserController(tenantUsers),
    new CollectionController(collectionService),
    new WorkflowController(workflowService),
    new FormTemplateController(formTemplateService),
    new FileController(fileService),
    new CronJobController(cronJobService),
    new AuditLogController(auditLogService),
    new ConversationSessionController(conversationSessionService),
  ];

  return { controllers, webUsers, sessions, tenantUsers };
}
