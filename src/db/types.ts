// MongoDB document interfaces. Each interface mirrors a collection in the
// database 1:1 — they describe what is *persisted*, not what is exposed to
// callers (DTOs live in src/shared/dto.ts).
//
// `_id` is `ObjectId` for collections where MongoDB auto-generates it on
// insert. The only exception is `web_sessions`, which provides its own
// random hex token as the primary key.

import type { ObjectId } from "mongodb";

export interface SuperAdminDoc {
  _id: ObjectId;
  channel: string;
  channelUserId: string;
  displayName?: string;
  createdAt: number;
}

export interface TenantDoc {
  _id: ObjectId;
  name: string;
  botToken?: string;
  botUsername?: string;
  botStatus: string;
  config: Record<string, unknown>;
  aiConfig: Record<string, unknown>;
  instructions: string;
  status: string;
  createdByUserId?: string;
  createdByName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TenantUserDoc {
  _id: ObjectId;
  tenantId: string;
  channel: string;
  channelUserId: string;
  displayName?: string;
  role: string;
  roleId?: string;
  permissions?: unknown[];
  reportsTo?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionDoc {
  _id: ObjectId;
  tenantId: string;
  name: string;
  slug: string;
  description?: string;
  fields: unknown;
  createdBy?: string;
  createdByName?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionRowDoc {
  _id: ObjectId;
  collectionId: string;
  data: Record<string, unknown>;
  createdBy?: string;
  createdByName?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowTemplateDoc {
  _id: ObjectId;
  tenantId: string;
  name: string;
  description?: string;
  domain?: string;
  version: number;
  stages: unknown;
  triggerConfig?: unknown;
  config?: unknown;
  status: string;
  createdByUserId?: string;
  createdByName?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface FormTemplateDoc {
  _id: ObjectId;
  tenantId: string;
  name: string;
  schema: unknown;
  uiHints?: unknown;
  version: number;
  status: string;
  createdByUserId?: string;
  createdByName?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BusinessRuleDoc {
  _id: ObjectId;
  tenantId: string;
  name: string;
  description?: string;
  domain?: string;
  ruleType: string;
  conditions: unknown;
  actions: unknown;
  priority: number;
  status: string;
  createdByUserId?: string;
  createdByName?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowInstanceDoc {
  _id: ObjectId;
  templateId: string;
  tenantId: string;
  initiatedBy: string;
  currentStageId?: string;
  status: string;
  formData: Record<string, unknown>;
  contextData: Record<string, unknown>;
  conversationId?: string;
  channel?: string;
  history: unknown[];
  error?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface WorkflowApprovalDoc {
  _id: ObjectId;
  instanceId: string;
  stageId: string;
  approverId: string;
  status: string;
  decisionReason?: string;
  autoApprovedByRuleId?: string;
  createdAt: number;
  decidedAt?: number;
}

export interface ConversationSessionDoc {
  _id: ObjectId;
  tenantId: string;
  channel: string;
  channelUserId: string;
  userName?: string;
  userRole?: string;
  activeInstanceId?: string | null;
  state: Record<string, unknown>;
  lastMessageAt: number;
  createdAt: number;
}

export interface FileDoc {
  _id: ObjectId;
  tenantId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  s3Url?: string;
  uploadedBy: string;
  channel: string;
  workflowInstanceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface PermissionRequestDoc {
  _id: ObjectId;
  tenantId: string;
  requesterId: string;
  requesterName?: string;
  approverId: string;
  approverName?: string;
  resource: string;
  requestedAccess: string;
  reason?: string;
  status: string;
  grantedAccess?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface RoleDoc {
  _id: ObjectId;
  tenantId: string;
  name: string;
  label: string;
  description: string;
  level: number;
  isSystem: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AuditLogDoc {
  _id: ObjectId;
  userId: string;
  userName?: string;
  userRole?: string;
  action: string;
  resourceTable: string;
  resourceId?: string;
  beforeData?: unknown;
  afterData?: unknown;
  permissionRequestId?: string;
  createdAt: number;
}

export interface CronJobDoc {
  _id: ObjectId;
  tenantId: string;
  name: string;
  schedule: string;
  scheduleDescription?: string;
  action: string;
  args?: Record<string, unknown>;
  notifyUserId?: string;
  status: string;
  lastRunAt?: number;
  nextRunAt?: number;
  runCount: number;
  lastResult?: string;
  createdByUserId?: string;
  createdByName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BotDocDoc {
  _id: ObjectId;
  tenantId: string;
  title: string;
  content: string;
  category?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Web dashboard user — independent identity from Telegram.
 *
 * Auto-created when a Telegram user registers (`username = "tg_<telegramId>"`,
 * `passwordHash = null`). The user sets a password via Telegram bot command
 * `/setweb <password>`, after which they can sign in to the web dashboard.
 */
export interface WebUserDoc {
  _id: ObjectId;
  tenantId: string;
  username: string;
  passwordHash: string | null;     // null = no password set, can't login yet
  displayName: string;
  role: string;                    // mirrors tenant_users.role at create time
  isSuperAdmin: boolean;
  isActive: boolean;
  /** Channel + ID of the Telegram user this account is linked to (if any). */
  linkedChannel?: string;
  linkedChannelUserId?: string;
  /** _id of the matching tenant_users row (denormalized for fast joins). */
  linkedTenantUserId?: string;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
}

/**
 * Web dashboard session. The `_id` is the random hex token used as the cookie
 * value — it's set by application code on insert (not auto-generated by Mongo).
 */
export interface WebSessionDoc {
  _id: string;
  webUserId: string;               // hex of the WebUserDoc._id
  tenantId: string | null;         // mirrored from web user — null only for cross-tenant super-admin
  isSuperAdmin: boolean;
  userAgent?: string;
  ipAddress?: string;
  createdAt: number;
  expiresAt: number;
  lastSeenAt: number;
}
