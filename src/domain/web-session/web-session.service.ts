import type { WebSession } from "./web-session.entity.js";
import type {
  WebSessionRepository,
  CreateSessionInput,
} from "./web-session.repository.js";
import {
  SESSION_TTL_SECONDS,
} from "./web-session.repository.js";

export class WebSessionService {
  constructor(private readonly repo: WebSessionRepository) {}

  create(input: CreateSessionInput): Promise<WebSession> {
    return this.repo.create(input);
  }

  /** Look up an active session. Auto-deletes expired ones, returns null if not found. */
  async findActive(token: string): Promise<WebSession | null> {
    const session = await this.repo.findById(token);
    if (!session) return null;
    if (session.isExpired()) {
      await this.repo.deleteById(token);
      return null;
    }
    this.repo.touch(token);
    return session;
  }

  destroy(token: string): Promise<void> {
    return this.repo.deleteById(token);
  }

  static get cookieMaxAge(): number {
    return SESSION_TTL_SECONDS;
  }

  static get cookieName(): string {
    return "skillbot_session";
  }
}
