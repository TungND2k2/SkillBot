import type { ConversationSessionDoc } from "../../db/types.js";
import type { ConversationSessionDto } from "../../shared/dto.js";
import { fromObjectId } from "../../core/id.js";

export class ConversationSession {
  constructor(private readonly doc: ConversationSessionDoc) {}

  get id(): string { return fromObjectId(this.doc._id); }
  get tenantId(): string { return this.doc.tenantId; }
  get channel(): string { return this.doc.channel; }
  get channelUserId(): string { return this.doc.channelUserId; }
  get userName(): string | null { return this.doc.userName ?? null; }
  get userRole(): string | null { return this.doc.userRole ?? null; }
  get lastMessageAt(): number { return this.doc.lastMessageAt; }
  get hasActiveForm(): boolean { return !!this.doc.activeInstanceId; }

  get messageCount(): number {
    const messages = (this.doc.state as { messages?: unknown[] } | undefined)?.messages;
    return Array.isArray(messages) ? messages.length : 0;
  }

  toDto(): ConversationSessionDto {
    return {
      id: this.id,
      tenantId: this.tenantId,
      channel: this.channel,
      channelUserId: this.channelUserId,
      userName: this.userName,
      userRole: this.userRole,
      messageCount: this.messageCount,
      hasActiveForm: this.hasActiveForm,
      lastMessageAt: this.lastMessageAt,
      createdAt: this.doc.createdAt,
    };
  }
}
