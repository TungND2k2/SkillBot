// TypeScript document interfaces for all MongoDB collections

export interface SuperAdminDoc {
  _id: string;

  channel: string;
  channelUserId: string;
  displayName?: string;
  createdAt: number;
}

export interface TenantDoc {
  _id: string;

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
  _id: string;

  tenantId: string;
  channel: string;
  channelUserId: string;
  displayName?: string;
  role: string;           // cached role name (denormalized)
  roleId?: string;         // reference to tenant_roles._id
  permissions?: unknown[];
  reportsTo?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionDoc {
  _id: string;

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
  _id: string;

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
  _id: string;

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
  _id: string;

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
  _id: string;

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
  _id: string;

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
  _id: string;

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
  _id: string;

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
  _id: string;

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
  _id: string;

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
  _id: string;

  tenantId: string;
  name: string;            // slug: "admin", "manager", "user", or custom
  label: string;           // display: "Quản trị viên", "Quản lý", ...
  description: string;
  level: number;           // hierarchy: higher = more privileges (admin=100, manager=50, user=10)
  isSystem: boolean;       // system roles cannot be deleted
  createdAt: number;
  updatedAt: number;
}

export interface AuditLogDoc {
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
  _id: string;

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
  _id: string;

  tenantId: string;
  title: string;
  content: string;
  category?: string;
  updatedByUserId?: string;
  updatedByName?: string;
  createdAt: number;
  updatedAt: number;
}
