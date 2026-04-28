import type { Filter } from "mongodb";
import type { ConversationSessionDoc } from "../../db/types.js";
import { BaseRepository } from "../../core/repository.js";
import { ConversationSession } from "./conversation-session.entity.js";

export class ConversationSessionRepository extends BaseRepository<ConversationSessionDoc> {
  protected readonly collectionName = "conversation_sessions";

  async listByTenant(tenantId: string, limit = 100): Promise<ConversationSession[]> {
    const docs = await this.findManyRaw(
      { tenantId } as Filter<ConversationSessionDoc>,
      { sort: { lastMessageAt: -1 }, limit },
    );
    return docs.map((d) => new ConversationSession(d));
  }
}
