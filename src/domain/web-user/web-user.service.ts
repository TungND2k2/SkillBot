import bcrypt from "bcryptjs";
import { ValidationError, NotFoundError, UnauthenticatedError } from "../../core/errors.js";
import { WebUser } from "./web-user.entity.js";
import type { WebUserRepository, CreateWebUserInput } from "./web-user.repository.js";

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 8;

export interface RegisterFromTelegramInput {
  tenantId: string;
  channel: string;
  channelUserId: string;
  displayName: string;
  role: string;
  tenantUserId: string;
  isActive: boolean;
}

export class WebUserService {
  constructor(private readonly repo: WebUserRepository) {}

  /**
   * Auto-create a web user when someone registers via Telegram. If a record
   * already exists for the same (channel, channelUserId), return that one
   * instead of duplicating.
   *
   * Initial password is `null` — the user must run `/setweb <password>` on
   * Telegram before they can sign in to the web dashboard.
   */
  async upsertFromTelegram(input: RegisterFromTelegramInput): Promise<WebUser> {
    const existing = await this.repo.findByLinkedTelegram(input.channel, input.channelUserId);
    if (existing) {
      // Sync any drift in displayName / isActive from the source-of-truth tenant_users.
      if (existing.displayName !== input.displayName) {
        await this.repo.setDisplayName(existing.id, input.displayName);
      }
      if (existing.isActive !== input.isActive) {
        await this.repo.setActive(existing.id, input.isActive);
      }
      return (await this.repo.findById(existing.id))!;
    }

    const username = await this.generateUniqueUsername(input.channel, input.channelUserId);
    const create: CreateWebUserInput = {
      tenantId: input.tenantId,
      username,
      displayName: input.displayName,
      role: input.role,
      linkedChannel: input.channel,
      linkedChannelUserId: input.channelUserId,
      linkedTenantUserId: input.tenantUserId,
      isActive: input.isActive,
    };
    return this.repo.create(create);
  }

  async setPassword(linkedChannel: string, linkedChannelUserId: string, password: string): Promise<WebUser> {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`Mật khẩu phải tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`);
    }
    const user = await this.repo.findByLinkedTelegram(linkedChannel, linkedChannelUserId);
    if (!user) throw new NotFoundError("Tài khoản web");
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.repo.setPasswordHash(user.id, hash);
    return (await this.repo.findById(user.id))!;
  }

  /**
   * Verify username + password. Throws `UnauthenticatedError` on any failure
   * (wrong username, wrong password, no password set, inactive account) —
   * the message is intentionally generic to avoid user enumeration.
   */
  async authenticate(username: string, password: string): Promise<WebUser> {
    const generic = new UnauthenticatedError("Tên đăng nhập hoặc mật khẩu không đúng");

    const user = await this.repo.findByUsername(username);
    if (!user || !user.isActive) throw generic;

    const hash = user.passwordHashForVerification;
    if (!hash) {
      throw new UnauthenticatedError(
        "Tài khoản chưa đặt mật khẩu. Hãy chat với bot Telegram và gửi: /setweb <mật khẩu>",
      );
    }

    const ok = await bcrypt.compare(password, hash);
    if (!ok) throw generic;

    await this.repo.touchLastLogin(user.id);
    return user;
  }

  findById(id: string): Promise<WebUser | null> {
    return this.repo.findById(id);
  }

  /**
   * Generate a unique username for a Telegram user. Tries `tg_<id>` first;
   * if that's taken (rare — same Telegram ID shouldn't appear twice across
   * tenants but defend anyway), append `_2`, `_3`, etc.
   */
  private async generateUniqueUsername(channel: string, channelUserId: string): Promise<string> {
    const base = `${channel === "telegram" ? "tg" : channel}_${channelUserId}`;
    let candidate = base;
    let suffix = 1;
    while (await this.repo.findByUsername(candidate)) {
      suffix += 1;
      candidate = `${base}_${suffix}`;
      if (suffix > 100) {
        throw new ValidationError("Không thể tạo username (xung đột quá nhiều)");
      }
    }
    return candidate;
  }
}
