/**
 * Server-side API client for the SkillBot bot process.
 *
 * Used exclusively from React Server Components / Server Actions / Route
 * handlers — never from "use client" components, because we forward the
 * incoming user cookie via `next/headers`, which is server-only.
 */
import { cookies, headers } from "next/headers";
import {
  TenantDto,
  TenantsListDto,
  TenantUsersListDto,
  MeDto,
  LoginResponseDto,
  DashboardStatsDto,
  CollectionsListDto,
  CollectionRowsListDto,
  WorkflowTemplateDto,
  WorkflowTemplatesListDto,
  WorkflowInstancesListDto,
  FormTemplatesListDto,
  FilesListDto,
  CronJobsListDto,
  AuditLogsListDto,
  ConversationSessionsListDto,
} from "@shared/dto";
import type { z } from "zod";

const API_BASE = process.env.BOT_API_URL ?? "http://localhost:3102";

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "ApiError";
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  forwardCookie?: boolean;
}

/** Read all incoming cookies and serialize for the outgoing fetch. */
async function buildCookieHeader(): Promise<string | undefined> {
  const jar = await cookies();
  const all = jar.getAll();
  if (all.length === 0) return undefined;
  return all.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function rawRequest(path: string, opts: RequestOptions = {}): Promise<Response> {
  const reqHeaders: Record<string, string> = {};
  if (opts.body !== undefined) reqHeaders["content-type"] = "application/json";
  if (opts.forwardCookie !== false) {
    const cookie = await buildCookieHeader();
    if (cookie) reqHeaders["cookie"] = cookie;
  }
  const ua = (await headers()).get("user-agent");
  if (ua) reqHeaders["user-agent"] = ua;

  return fetch(`${API_BASE}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    cache: "no-store",
    headers: reqHeaders,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

async function request<T extends z.ZodTypeAny>(
  schema: T,
  path: string,
  opts: RequestOptions = {},
): Promise<z.infer<T>> {
  const res = await rawRequest(path, opts);

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    throw new ApiError(
      res.status,
      body?.error?.code ?? "http_error",
      body?.error?.message ?? `HTTP ${res.status}`,
    );
  }

  const data = await res.json();
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new ApiError(500, "schema_mismatch", `Bot trả dữ liệu sai format: ${parsed.error.message}`);
  }
  return parsed.data;
}

// ── Endpoint wrappers ─────────────────────────────────────────

export const api = {
  /**
   * Login with username + password. Returns the session token in the body
   * — caller must install it as an httpOnly cookie on its own response.
   */
  login: (input: { username: string; password: string }) =>
    request(LoginResponseDto, "/api/auth/login", { body: input, forwardCookie: false }),

  /** Logout — invalidates server-side session. Caller still needs to clear cookie. */
  logout: () =>
    rawRequest("/api/auth/logout", { method: "POST" }).then(() => undefined),

  /** Hydrate current user. Throws ApiError(401) if no valid session cookie. */
  me: () => request(MeDto, "/api/auth/me"),

  dashboardStats: () => request(DashboardStatsDto, "/api/dashboard/stats"),

  listTenants: () => request(TenantsListDto, "/api/tenants"),

  getTenant: (id: string) =>
    request(TenantDto, `/api/tenants/${encodeURIComponent(id)}`),

  listTenantUsers: () => request(TenantUsersListDto, "/api/users"),

  listCollections: () => request(CollectionsListDto, "/api/collections"),

  getCollectionRows: (id: string) =>
    request(CollectionRowsListDto, `/api/collections/${encodeURIComponent(id)}/rows`),

  listWorkflowTemplates: () =>
    request(WorkflowTemplatesListDto, "/api/workflows/templates"),

  getWorkflowTemplate: (id: string) =>
    request(WorkflowTemplateDto, `/api/workflows/templates/${encodeURIComponent(id)}`),

  listWorkflowInstances: () =>
    request(WorkflowInstancesListDto, "/api/workflows/instances"),

  listForms: () => request(FormTemplatesListDto, "/api/forms"),

  listFiles: () => request(FilesListDto, "/api/files"),

  listCrons: () => request(CronJobsListDto, "/api/crons"),

  listAuditLogs: () => request(AuditLogsListDto, "/api/audit"),

  listConversationSessions: () =>
    request(ConversationSessionsListDto, "/api/sessions"),
} as const;
