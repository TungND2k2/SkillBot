import { query, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { ObjectId } from "mongodb";
import type { DbInstance } from "../db/connection.js";
import type { Config } from "../config.js";
import { buildSdkTools, getSkill } from "../skills/_registry.js";
import type { SkillContext } from "../skills/_types.js";
import {
  loadOrCreateSession,
  getState,
  appendToHistory,
  saveSession,
  needsCompact,
  buildHistoryContext,
  compactHistory,
} from "./history.js";
import { buildContext } from "./context-builder.js";
import { buildSystemPrompt } from "./prompt-builder.js";
import { logger } from "../utils/logger.js";

// ── Public types ─────────────────────────────────────────────

export interface PipelineInput {
  /** Tenant the message belongs to */
  tenantId: string;
  /** Transport channel identifier (e.g. "telegram") */
  channel: string;
  /** User's ID as seen by the channel (e.g. Telegram user ID) */
  channelUserId: string;
  /** Display name for the user */
  userName: string;
  /** Resolved role for the user ("admin" | "manager" | "user" | "viewer") */
  userRole: string;
  /** The raw message text from the user */
  message: string;
  db: DbInstance;
  config: Config;
  /** Optional callback — called each time a tool is invoked, before the result arrives. */
  onProgress?: (status: string) => Promise<void>;
  /** Optional callback — called when Claude emits an intermediate text block (thinking) before final reply. */
  onThinking?: (text: string) => Promise<void>;
}

export interface PipelineOutput {
  /** Text reply to send back to the user */
  reply: string;
  /** Internal session ID (stored in DB) */
  sessionId: string;
  /** Whether the pipeline completed without error */
  ok: boolean;
  /** True when the reply was already sent via onThinking (caller should not re-send) */
  replyAlreadySent?: boolean;
}

// ── Core pipeline ────────────────────────────────────────────

/**
 * Run one turn of the conversation pipeline:
 *  1. Load (or create) the conversation session
 *  2. Compact history if it exceeds the threshold
 *  3. Build context + system prompt
 *  4. Create an in-process MCP server with all skill tools
 *  5. Call the Claude Agent SDK query()
 *  6. Persist the new exchange to DB
 *  7. Return the assistant's reply
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const { tenantId, channel, channelUserId, userName, userRole, message, db, config } =
    input;

  logger.info("Pipeline", `▶ [${channel}] ${userName} (${channelUserId}): "${message.slice(0, 80)}"`);
  logger.debug("Pipeline", `model=${config.CLAUDE_MODEL}`);

  // ── 1. Session ─────────────────────────────────────────────
  const session = await loadOrCreateSession(
    db,
    tenantId,
    channel,
    channelUserId,
    userName,
    userRole
  );
  const state = getState(session);
  logger.debug("Pipeline", `Session ${String(session._id)} | history=${state.messages.length} msgs`);

  // ── 2. Compact if needed ───────────────────────────────────
  if (needsCompact(state, config.SUMMARY_THRESHOLD)) {
    logger.debug("Pipeline", `Compacting history (session ${String(session._id)})`);
    await compactHistory(state, config.KEEP_RECENT_MESSAGES, config.CLAUDE_MODEL);
  }

  // ── 3. Build context & prompt ─────────────────────────────
  const ctx = await buildContext(
    db,
    tenantId,
    channelUserId,   // use channel user ID as the skill-layer user identifier
    userName,
    userRole,
    String(session._id),
    session.activeInstanceId,
    state.formState
  );

  const historyContext = buildHistoryContext(state, !!ctx.activeForm);
  const systemPrompt = buildSystemPrompt(ctx, historyContext);
  logger.debug("Pipeline", `SYSTEM PROMPT:\n${"─".repeat(60)}\n${systemPrompt}\n${"─".repeat(60)}`);

  // ── 4. Build skill tools for this user ────────────────────
  const skillCtx: SkillContext = {
    tenantId,
    userId: channelUserId,
    channelUserId,
    userName,
    userRole,
    sessionId: String(session._id),
    db,
  };

  const sdkTools = await buildSdkTools(() => skillCtx);

  const mcpServer = createSdkMcpServer({
    name: "skillbot",
    tools: sdkTools,
  });

  // ── 5. Query Claude ───────────────────────────────────────
  let reply = "";
  let lastAssistantText = "";
  let sentAsThinking = "";
  let ok = true;

  try {
    const q = query({
      prompt: message,
      options: {
        systemPrompt,
        mcpServers: { skillbot: mcpServer },
        // Disable all built-in Claude Code tools — only our MCP tools are used
        tools: [],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: config.MAX_TOOL_LOOPS,
        model: config.CLAUDE_MODEL,
        // Don't persist sessions to disk — we manage state in DB
        persistSession: false,
      },
    });

    logger.debug("Pipeline", `Querying Claude...`);

    for await (const msg of q) {
      if (msg.type === "assistant") {
        // Extract tool calls from this turn's content blocks
        const blocks = msg.message.content as any[];
        const toolBlocks = blocks.filter((b) => b.type === "tool_use");
        const textBlocks = blocks.filter((b) => b.type === "text" && b.text?.trim());

        if (textBlocks.length > 0) {
          const joined = textBlocks.map((b: any) => b.text).join("\n");
          lastAssistantText = joined;
          logger.debug("Pipeline", `  💭 thinking: ${joined.slice(0, 80)}`);
          sentAsThinking = joined;
          if (input.onThinking) await input.onThinking(joined);
        }

        if (toolBlocks.length > 0) {
          const toolDescs: string[] = [];
          for (const b of toolBlocks) {
            const shortName = (b.name as string).replace(/^mcp__\w+__/, "");
            const skill = getSkill(b.name as string);
            const desc = skill?.description ?? shortName;
            const argsJson = JSON.stringify(b.input ?? {});
            const argsShort = argsJson.length > 120 ? argsJson.slice(0, 120) + "…" : argsJson;
            logger.info("Pipeline", `  🔧 ${shortName}(${argsShort})  — ${desc}`);
            toolDescs.push(desc);
          }
          if (input.onProgress) {
            await input.onProgress(toolDescs.join(", "));
          }
        }
      } else if (msg.type === "tool_progress") {
        const shortName = msg.tool_name.replace(/^mcp__\w+__/, "");
        logger.debug("Pipeline", `  ⏱ ${shortName} — ${msg.elapsed_time_seconds.toFixed(1)}s`);
      } else if (msg.type === "user") {
        const blocks = (msg.message?.content as any[]) ?? [];
        const resultBlocks = blocks.filter((b: any) => b.type === "tool_result");
        for (const b of resultBlocks) {
          const isError = b.is_error ?? false;
          const content = b.content ?? "";
          const contentStr = typeof content === "string" ? content : JSON.stringify(content);
          const contentShort = contentStr.length > 200 ? contentStr.slice(0, 200) + "…" : contentStr;
          logger.debug("Pipeline", `  ${isError ? "✗" : "✔"} result: ${contentShort}`);
        }
      } else if (msg.type === "result") {
        if (msg.subtype === "success") {
          reply = msg.result;
          logger.info("Pipeline", `◀ reply (${reply.length} chars)`);
        } else {
          ok = false;
          logger.error(
            "Pipeline",
            `Query ended with error subtype: ${msg.subtype}`
          );
          reply = "Something went wrong on my end. Please try again.";
        }
      }
    }

    if (!reply && ok) {
      // SDK sometimes returns empty result when reply was in assistant text blocks
      if (lastAssistantText && lastAssistantText !== sentAsThinking) {
        reply = lastAssistantText;
        logger.debug("Pipeline", `Using last assistant text as reply (${reply.length} chars)`);
      } else if (lastAssistantText) {
        // Already sent via onThinking — use as reply text but don't re-send
        reply = lastAssistantText;
      } else {
        reply = "I didn't receive a response. Please try again.";
        ok = false;
      }
    }
  } catch (error) {
    ok = false;
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error("Pipeline", `Query threw: ${errMsg}`, error);
    reply = "An unexpected error occurred. Please try again.";
  }

  // ── 6. Persist exchange ────────────────────────────────────
  // Reload state from DB (bypass cache) — tool calls during the query
  // may have modified state (e.g. form completion clears messages).
  if (ok) {
    const freshDoc = await db.collection("conversation_sessions")
      .findOne({ _id: new ObjectId(String(session._id)) });
    const freshState = freshDoc ? getState(freshDoc as any) : state;
    appendToHistory(freshState, message, reply, config.KEEP_RECENT_MESSAGES);
    await saveSession(db, String(session._id), freshState);
    logger.debug("Pipeline", `Session saved (${String(session._id)})`);
  }

  logger.info("Pipeline", `${ok ? "✓" : "✗"} done`);
  return { reply, sessionId: String(session._id), ok, replyAlreadySent: reply === sentAsThinking };
}
