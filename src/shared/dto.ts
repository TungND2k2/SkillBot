/**
 * Public DTOs — the wire format between the bot's HTTP API and the web
 * dashboard. Both sides import from this file (web via tsconfig path).
 *
 * Rules:
 *  - DTOs use `string` for IDs (never `ObjectId`).
 *  - DTOs use unix-ms `number` for timestamps (never `Date` objects).
 *  - Field names match what the API returns/accepts (camelCase).
 *  - When in doubt, prefer flat structures and explicit nullable.
 *  - Zod schemas are the source of truth — TS types are inferred from them.
 */
import { z } from "zod";

// ── Reusable bits ─────────────────────────────────────────────

export const ApiOk = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ ok: z.literal(true), data });

export const ApiErr = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

// ── Tenant ────────────────────────────────────────────────────

export const TenantDto = z.object({
  id: z.string(),
  name: z.string(),
  botUsername: z.string().nullable(),
  botStatus: z.string(),
  status: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type TenantDto = z.infer<typeof TenantDto>;

// ── Web User ──────────────────────────────────────────────────

export const WebUserDto = z.object({
  id: z.string(),
  tenantId: z.string(),
  username: z.string(),
  displayName: z.string(),
  role: z.string(),
  isSuperAdmin: z.boolean(),
  isActive: z.boolean(),
  hasPassword: z.boolean(),
  linkedChannel: z.string().optional(),
  linkedChannelUserId: z.string().optional(),
});
export type WebUserDto = z.infer<typeof WebUserDto>;

// ── Session ───────────────────────────────────────────────────

export const SessionDto = z.object({
  webUserId: z.string(),
  tenantId: z.string().nullable(),
  isSuperAdmin: z.boolean(),
  expiresAt: z.number(),
});
export type SessionDto = z.infer<typeof SessionDto>;

export const MeDto = z.object({
  session: SessionDto,
  user: WebUserDto.nullable(),
  tenant: TenantDto.nullable(),
});
export type MeDto = z.infer<typeof MeDto>;

/** Login response — same as MeDto plus the raw session token so the caller
 *  can install it as a cookie. Only returned from `/api/auth/login`. */
export const LoginResponseDto = MeDto.extend({
  sessionToken: z.string(),
});
export type LoginResponseDto = z.infer<typeof LoginResponseDto>;

// ── Auth requests ─────────────────────────────────────────────

export const LoginRequest = z.object({
  username: z.string().min(1, "Tên đăng nhập là bắt buộc"),
  password: z.string().min(1, "Mật khẩu là bắt buộc"),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

// ── Dashboard ─────────────────────────────────────────────────

export const DashboardStatsDto = z.object({
  collections: z.number(),
  rows: z.number(),
  activeWorkflows: z.number(),
  activeForms: z.number(),
  users: z.number(),
  activeCrons: z.number(),
  files: z.number(),
  auditLast24h: z.number(),
});
export type DashboardStatsDto = z.infer<typeof DashboardStatsDto>;

// ── Tenant user (Telegram-side) ───────────────────────────────

export const TenantUserDto = z.object({
  id: z.string(),
  tenantId: z.string(),
  channel: z.string(),
  channelUserId: z.string(),
  displayName: z.string(),
  role: z.string(),
  isActive: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type TenantUserDto = z.infer<typeof TenantUserDto>;

// ── Collection ────────────────────────────────────────────────

export const CollectionFieldDto = z.object({
  name: z.string(),
  label: z.string().optional(),
  type: z.string().optional(),
});
export type CollectionFieldDto = z.infer<typeof CollectionFieldDto>;

export const CollectionDto = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  fields: z.array(CollectionFieldDto),
  fieldCount: z.number(),
  rowCount: z.number(),
  isActive: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type CollectionDto = z.infer<typeof CollectionDto>;

export const CollectionRowDto = z.object({
  id: z.string(),
  collectionId: z.string(),
  data: z.record(z.unknown()),
  createdByName: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type CollectionRowDto = z.infer<typeof CollectionRowDto>;

// ── Workflow ──────────────────────────────────────────────────

export const WorkflowStageDto = z.object({
  id: z.string(),
  name: z.string(),
  actor: z.string().optional(),
  description: z.string().optional(),
});
export type WorkflowStageDto = z.infer<typeof WorkflowStageDto>;

export const WorkflowTemplateDto = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  domain: z.string().nullable(),
  version: z.number(),
  stages: z.array(WorkflowStageDto),
  stageCount: z.number(),
  status: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type WorkflowTemplateDto = z.infer<typeof WorkflowTemplateDto>;

export const WorkflowInstanceDto = z.object({
  id: z.string(),
  templateId: z.string(),
  templateName: z.string().nullable(),
  tenantId: z.string(),
  initiatedBy: z.string(),
  currentStageId: z.string().nullable(),
  status: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().nullable(),
});
export type WorkflowInstanceDto = z.infer<typeof WorkflowInstanceDto>;

// ── Form ──────────────────────────────────────────────────────

export const FormTemplateDto = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  version: z.number(),
  status: z.string(),
  fieldCount: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type FormTemplateDto = z.infer<typeof FormTemplateDto>;

// ── File ──────────────────────────────────────────────────────

export const FileDto = z.object({
  id: z.string(),
  tenantId: z.string(),
  fileName: z.string(),
  fileSize: z.number(),
  mimeType: z.string(),
  uploadedBy: z.string(),
  channel: z.string(),
  createdAt: z.number(),
});
export type FileDto = z.infer<typeof FileDto>;

// ── Cron ──────────────────────────────────────────────────────

export const CronJobDto = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  schedule: z.string(),
  scheduleDescription: z.string().nullable(),
  action: z.string(),
  status: z.string(),
  lastRunAt: z.number().nullable(),
  nextRunAt: z.number().nullable(),
  runCount: z.number(),
  lastResult: z.string().nullable(),
  createdAt: z.number(),
});
export type CronJobDto = z.infer<typeof CronJobDto>;

// ── Audit log ─────────────────────────────────────────────────

export const AuditLogDto = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string().nullable(),
  userRole: z.string().nullable(),
  action: z.string(),
  resourceTable: z.string(),
  resourceId: z.string().nullable(),
  createdAt: z.number(),
});
export type AuditLogDto = z.infer<typeof AuditLogDto>;

// ── Conversation session ──────────────────────────────────────

export const ConversationSessionDto = z.object({
  id: z.string(),
  tenantId: z.string(),
  channel: z.string(),
  channelUserId: z.string(),
  userName: z.string().nullable(),
  userRole: z.string().nullable(),
  messageCount: z.number(),
  hasActiveForm: z.boolean(),
  lastMessageAt: z.number(),
  createdAt: z.number(),
});
export type ConversationSessionDto = z.infer<typeof ConversationSessionDto>;

// ── List responses ────────────────────────────────────────────

export const TenantsListDto = z.object({ tenants: z.array(TenantDto) });
export type TenantsListDto = z.infer<typeof TenantsListDto>;

export const TenantUsersListDto = z.object({ users: z.array(TenantUserDto) });
export type TenantUsersListDto = z.infer<typeof TenantUsersListDto>;

export const CollectionsListDto = z.object({ collections: z.array(CollectionDto) });
export type CollectionsListDto = z.infer<typeof CollectionsListDto>;

export const CollectionRowsListDto = z.object({
  collection: CollectionDto,
  rows: z.array(CollectionRowDto),
});
export type CollectionRowsListDto = z.infer<typeof CollectionRowsListDto>;

export const WorkflowTemplatesListDto = z.object({ templates: z.array(WorkflowTemplateDto) });
export type WorkflowTemplatesListDto = z.infer<typeof WorkflowTemplatesListDto>;

export const WorkflowInstancesListDto = z.object({ instances: z.array(WorkflowInstanceDto) });
export type WorkflowInstancesListDto = z.infer<typeof WorkflowInstancesListDto>;

export const FormTemplatesListDto = z.object({ forms: z.array(FormTemplateDto) });
export type FormTemplatesListDto = z.infer<typeof FormTemplatesListDto>;

export const FilesListDto = z.object({ files: z.array(FileDto) });
export type FilesListDto = z.infer<typeof FilesListDto>;

export const CronJobsListDto = z.object({ jobs: z.array(CronJobDto) });
export type CronJobsListDto = z.infer<typeof CronJobsListDto>;

export const AuditLogsListDto = z.object({ logs: z.array(AuditLogDto) });
export type AuditLogsListDto = z.infer<typeof AuditLogsListDto>;

export const ConversationSessionsListDto = z.object({ sessions: z.array(ConversationSessionDto) });
export type ConversationSessionsListDto = z.infer<typeof ConversationSessionsListDto>;
