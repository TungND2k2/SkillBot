import { query } from "@anthropic-ai/claude-agent-sdk";
import { ObjectId } from "mongodb";
import type { DbInstance } from "../db/connection.js";
import type { ConversationSessionDoc } from "../db/types.js";
import { nowMs } from "../utils/clock.js";
import { logger } from "../utils/logger.js";

// ── Session cache ─────────────────────────────────────────────
// In-memory cache keyed by "tenantId:channel:channelUserId"
// TTL: 5 minutes of inactivity

const SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  session: ConversationSessionDoc;
  cachedAt: number;
}

const _sessionCache = new Map<string, CacheEntry>();

function cacheKey(tenantId: string, channel: string, channelUserId: string): string {
  return `${tenantId}:${channel}:${channelUserId}`;
}

function cacheGet(tenantId: string, channel: string, channelUserId: string): ConversationSessionDoc | null {
  const key = cacheKey(tenantId, channel, channelUserId);
  const entry = _sessionCache.get(key);
  if (!entry) return null;
  if (nowMs() - entry.cachedAt > SESSION_CACHE_TTL_MS) {
    _sessionCache.delete(key);
    return null;
  }
  return entry.session;
}

function cacheSet(session: ConversationSessionDoc): void {
  const key = cacheKey(session.tenantId, session.channel, session.channelUserId);
  _sessionCache.set(key, { session, cachedAt: nowMs() });
}

function cacheInvalidate(tenantId: string, channel: string, channelUserId: string): void {
  _sessionCache.delete(cacheKey(tenantId, channel, channelUserId));
}

// ── Types ────────────────────────────────────────────────────

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
  at: number;
}

export interface SessionState {
  messages: HistoryMessage[];
  summary?: string;
  formState?: Record<string, unknown>;
  [key: string]: unknown;
}

export type SessionRow = ConversationSessionDoc;

// ── Session load / create ────────────────────────────────────

export async function loadOrCreateSession(
  db: DbInstance,
  tenantId: string,
  channel: string,
  channelUserId: string,
  userName: string,
  userRole: string
): Promise<SessionRow> {
  // 1. Cache hit
  const cached = cacheGet(tenantId, channel, channelUserId);
  if (cached) {
    // Sync userName/userRole in cache if stale (no DB write needed yet)
    if (cached.userName !== userName || cached.userRole !== userRole) {
      cached.userName = userName;
      cached.userRole = userRole;
      cacheSet(cached);
      db.collection("conversation_sessions")
        .updateOne({ _id: cached._id } as any, { $set: { userName, userRole } })
        .catch(() => {});
    }
    return cached;
  }

  // 2. DB lookup
  const existing = await db.collection<ConversationSessionDoc>("conversation_sessions")
    .findOne({ tenantId, channel, channelUserId });

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (userName && existing.userName !== userName) updates.userName = userName;
    if (userRole && existing.userRole !== userRole) updates.userRole = userRole;
    let session: ConversationSessionDoc = existing as unknown as ConversationSessionDoc;
    if (Object.keys(updates).length > 0) {
      await db.collection("conversation_sessions")
        .updateOne({ _id: existing._id } as any, { $set: updates });
      session = { ...existing, ...updates } as unknown as ConversationSessionDoc;
    }
    cacheSet(session);
    return session;
  }

  // 3. Create new
  const now = nowMs();
  const state: SessionState = { messages: [] };

  const session = {
    tenantId, channel, channelUserId, userName, userRole,
    activeInstanceId: null, state: state as unknown as Record<string, unknown>, lastMessageAt: now, createdAt: now,
  } as ConversationSessionDoc;

  await db.collection<ConversationSessionDoc>("conversation_sessions").insertOne(session as any);
  cacheSet(session);

  return session;
}

// ── State helpers ────────────────────────────────────────────

/** Safely parse state JSON from DB row */
export function getState(session: SessionRow): SessionState {
  const raw = session.state as Record<string, unknown>;
  return {
    messages: Array.isArray(raw?.messages)
      ? (raw.messages as HistoryMessage[])
      : [],
    summary: typeof raw?.summary === "string" ? raw.summary : undefined,
    formState:
      raw?.formState !== null && typeof raw?.formState === "object"
        ? (raw.formState as Record<string, unknown>)
        : undefined,
  };
}

/** Save state back to DB and update cache */
export async function saveSession(
  db: DbInstance,
  sessionId: string,
  state: SessionState,
  extra?: { activeInstanceId?: string | null; userRole?: string }
): Promise<void> {
  // Use field-level $set so tool-written keys (e.g. state.formState) are preserved
  const setFields: Record<string, unknown> = {
    "state.messages": state.messages,
    lastMessageAt: nowMs(),
  };
  if (state.summary !== undefined) setFields["state.summary"] = state.summary;
  if (extra?.activeInstanceId !== undefined) setFields.activeInstanceId = extra.activeInstanceId;
  if (extra?.userRole !== undefined) setFields.userRole = extra.userRole;

  await db.collection("conversation_sessions").updateOne(
    { _id: new ObjectId(sessionId) } as any,
    { $set: setFields }
  );

  // Refresh cache from DB so tool-written keys (formState etc.) are in sync
  const fresh = await db.collection<ConversationSessionDoc>("conversation_sessions")
    .findOne({ _id: new ObjectId(sessionId) } as any);
  if (fresh) cacheSet(fresh);
}

// ── History management ───────────────────────────────────────

/** Append a completed user+assistant exchange to history */
export function appendToHistory(
  state: SessionState,
  userContent: string,
  assistantContent: string,
  keepRecent: number
): void {
  const now = nowMs();
  state.messages.push({ role: "user", content: userContent, at: now });
  state.messages.push({ role: "assistant", content: assistantContent, at: now });

  // Keep at most keepRecent full exchanges (2 messages each)
  const maxMessages = keepRecent * 2;
  if (state.messages.length > maxMessages) {
    state.messages = state.messages.slice(state.messages.length - maxMessages);
  }
}

/** True when history has grown past the summarisation threshold */
export function needsCompact(state: SessionState, threshold: number): boolean {
  return state.messages.length >= threshold;
}

/**
 * Build the `<conversation_history>` block injected into the system prompt.
 * Includes the running summary (if any) plus recent messages.
 *
 * When a form is actively being filled (`hasActiveForm`), only the last few
 * messages are included — the `## Active Form` section in the system prompt
 * already carries the full form state (collected data, pending fields, etc.).
 */
// Max chars per individual message in history context (prevents file-upload bloat)
const MSG_TRUNCATE = 800;
// When a form is active, only keep this many recent messages for continuity
const ACTIVE_FORM_RECENT = 4; // last 2 exchanges

export function buildHistoryContext(
  state: SessionState,
  hasActiveForm = false,
): string {
  const lines: string[] = [];

  if (state.summary) {
    lines.push(
      `<conversation_summary>\n${state.summary}\n</conversation_summary>`
    );
  }

  const msgs = hasActiveForm
    ? state.messages.slice(-ACTIVE_FORM_RECENT)
    : state.messages;

  if (msgs.length > 0) {
    lines.push("<recent_conversation>");
    for (const msg of msgs) {
      const label = msg.role === "user" ? "User" : "Assistant";
      const content = msg.content.length > MSG_TRUNCATE
        ? msg.content.slice(0, MSG_TRUNCATE) + " …[truncated]"
        : msg.content;
      lines.push(`${label}: ${content}`);
    }
    lines.push("</recent_conversation>");
  }

  return lines.join("\n");
}

/**
 * Summarise old messages using Claude and store the result in `state.summary`.
 * Drops the summarised messages from `state.messages`, keeping only the
 * most recent `keepRecent` exchanges.
 */
export async function compactHistory(
  state: SessionState,
  keepRecent: number,
  model: string
): Promise<void> {
  const cutoff = state.messages.length - keepRecent * 2;
  if (cutoff <= 0) return;

  const toSummarize = state.messages.slice(0, cutoff);
  state.messages = state.messages.slice(cutoff);

  const chatText = toSummarize
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const preamble = state.summary
    ? `Previous summary:\n${state.summary}\n\nAdditional conversation to incorporate:\n`
    : "";

  const prompt =
    `${preamble}Summarise the following conversation into a compact, structured format. ` +
    `Focus on RESULTS and KEY FACTS only:\n` +
    `- User name, role\n` +
    `- Completed actions: form names, record IDs, collection IDs, file names/IDs\n` +
    `- Key data: names, amounts, dates, quantities\n` +
    `- Pending items or unresolved requests\n\n` +
    `Format as short bullet points. Omit step-by-step conversation details.\n` +
    `Example: "• Sale Anntt created order PE-240406-001 (row: 69d37...) | Customer: Nguyễn Văn A | Total: $2,000 | Deposit: $1,000 | Remaining: $500"\n\n` +
    `Conversation:\n${chatText}`;

  try {
    let summaryText = "";
    const q = query({
      prompt,
      options: {
        tools: [],
        maxTurns: 1,
        model,
        persistSession: false,
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        systemPrompt: "You summarise conversations accurately and briefly.",
      },
    });

    for await (const msg of q) {
      if (msg.type === "result" && msg.subtype === "success") {
        summaryText = msg.result;
      }
    }

    if (summaryText) {
      state.summary = summaryText;
      logger.debug(
        "History",
        `Compacted ${toSummarize.length} messages into summary`
      );
    }
  } catch (error) {
    logger.error("History", "Compact failed — keeping messages as-is", error);
    // Safe fallback: restore dropped messages so nothing is lost
    state.messages = [...toSummarize, ...state.messages];
  }
}
