import { NotFoundError } from "../../core/errors.js";
import type { TenantService } from "../tenant/tenant.service.js";
import type { WebUserService } from "../web-user/web-user.service.js";
import type { WebSessionService } from "../web-session/web-session.service.js";
import type { Tenant } from "../tenant/tenant.entity.js";
import type { WebUser } from "../web-user/web-user.entity.js";
import type { WebSession } from "../web-session/web-session.entity.js";

export interface LoginInput {
  username: string;
  password: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface LoginResult {
  session: WebSession;
  user: WebUser;
  tenant: Tenant | null;
}

/**
 * AuthService — orchestrates web login by combining web-user authentication
 * with tenant lookup and session creation.
 *
 * Flow:
 *  1. Authenticate username + password via WebUserService — throws on failure.
 *  2. Resolve the tenant the web user belongs to (or null for super-admin
 *     without a tenant binding).
 *  3. Create a WebSession bound to the web user.
 */
export class AuthService {
  constructor(
    private readonly tenants: TenantService,
    private readonly webUsers: WebUserService,
    private readonly sessions: WebSessionService,
  ) {}

  async login(input: LoginInput): Promise<LoginResult> {
    const user = await this.webUsers.authenticate(input.username, input.password);

    const tenantId = user.tenantId;
    const tenant = tenantId ? await this.tenants.findById(tenantId) : null;

    const session = await this.sessions.create({
      webUserId: user.id,
      tenantId,
      isSuperAdmin: user.isSuperAdmin,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    return { session, user, tenant };
  }

  async logout(token: string | undefined): Promise<void> {
    if (token) await this.sessions.destroy(token);
  }

  /**
   * Resolve session token → full user/tenant context for `/api/me`.
   * Returns null user only if the session points at a deleted web user
   * (data integrity issue — caller should clear the cookie).
   */
  async hydrate(session: WebSession): Promise<{ user: WebUser; tenant: Tenant | null }> {
    const user = await this.webUsers.findById(session.webUserId);
    if (!user) throw new NotFoundError("Tài khoản web");
    const tenant = session.tenantId ? await this.tenants.findById(session.tenantId) : null;
    return { user, tenant };
  }
}
