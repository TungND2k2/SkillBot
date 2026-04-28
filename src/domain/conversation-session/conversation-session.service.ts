import type { ConversationSession } from "./conversation-session.entity.js";
import type { ConversationSessionRepository } from "./conversation-session.repository.js";

export class ConversationSessionService {
  constructor(private readonly repo: ConversationSessionRepository) {}

  list(tenantId: string): Promise<ConversationSession[]> {
    return this.repo.listByTenant(tenantId);
  }
}
