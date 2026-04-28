import { randomBytes } from "node:crypto";
import type { Filter } from "mongodb";
import type { WebSessionDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { nowMs } from "../../utils/clock.js";
import { WebSession } from "./web-session.entity.js";

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000;

export interface CreateSessionInput {
  webUserId: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  userAgent?: string;
  ipAddress?: string;
}

export class WebSessionRepository extends BaseRepository<WebSessionDoc> {
  protected readonly collectionName = "web_sessions";

  async create(input: CreateSessionInput): Promise<WebSession> {
    const now = nowMs();
    const doc: WebSessionDoc = {
      _id: randomBytes(32).toString("hex"),
      webUserId: input.webUserId,
      tenantId: input.tenantId,
      isSuperAdmin: input.isSuperAdmin,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      lastSeenAt: now,
    };
    await this.collection.insertOne(doc as never);
    return new WebSession(doc);
  }

  /** Token must be exactly 64 hex chars; bail early on bad input. */
  async findById(token: string): Promise<WebSession | null> {
    if (!token || token.length !== 64) return null;
    const doc = await this.findOneRaw({ _id: token } as Filter<WebSessionDoc>);
    return doc ? new WebSession(doc) : null;
  }

  async deleteById(token: string): Promise<void> {
    if (!token) return;
    await this.collection.deleteOne({ _id: token } as Filter<WebSessionDoc>);
  }

  /** Fire-and-forget bump of lastSeenAt. Errors are swallowed by design. */
  touch(token: string): void {
    void this.collection
      .updateOne({ _id: token } as Filter<WebSessionDoc>, { $set: { lastSeenAt: nowMs() } })
      .catch(() => {});
  }

  /** Cleanup expired sessions. Call from a cron periodically. */
  async deleteExpired(): Promise<number> {
    const r = await this.collection.deleteMany({
      expiresAt: { $lt: nowMs() },
    } as Filter<WebSessionDoc>);
    return r.deletedCount;
  }
}
