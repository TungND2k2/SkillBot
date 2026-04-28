/**
 * One pass of conversation: take user message, give to Claude, let it
 * call tools (which talk to Payload), return final reply.
 *
 * Stateless on purpose — conversation history is held in-memory by
 * caller (Telegram channel), passed in as `priorMessages`. Keep this
 * function pure for easier testing.
 */
import { query, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";

import { getConfig } from "../config.js";
import { logger } from "../utils/logger.js";
import { allTools } from "../tools/index.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";

export interface PipelineInput {
  /** Latest user message text. */
  message: string;
  /** Optional callback fired each time Claude calls a tool. */
  onToolCall?: (toolName: string) => void;
  /** Optional callback fired with intermediate "thinking" text. */
  onThinking?: (text: string) => void;
  /** Optional tag for log prefix — useful when caller wants to identify session. */
  logTag?: string;
}

export interface PipelineOutput {
  reply: string;
  ok: boolean;
  toolsUsed: string[];
}

/** Hard timeout (ms) — nếu Claude treo, thoát ra để log lỗi rõ. */
const PIPELINE_TIMEOUT_MS = 90_000;

function preview(s: string, n = 80): string {
  const compact = s.replace(/\s+/g, " ").trim();
  return compact.length > n ? compact.slice(0, n) + "…" : compact;
}

export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const config = getConfig();
  const tag = input.logTag ?? "Pipeline";
  const toolsUsed: string[] = [];
  let reply = "";
  let ok = true;

  const startTs = Date.now();
  logger.info(tag, `▶ user: "${preview(input.message, 100)}"`);

  const mcpServer = createSdkMcpServer({
    name: "skillbot",
    tools: allTools,
  });

  // Wrap iterator with global timeout — Claude SDK sometimes hangs.
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    logger.warn(tag, `⏱ Timeout after ${PIPELINE_TIMEOUT_MS}ms — aborting`);
  }, PIPELINE_TIMEOUT_MS);

  try {
    const q = query({
      prompt: input.message,
      options: {
        systemPrompt: SYSTEM_PROMPT,
        mcpServers: { skillbot: mcpServer },
        tools: [],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: config.MAX_TOOL_LOOPS,
        model: config.CLAUDE_MODEL,
        persistSession: false,
        ...(config.CLAUDE_BIN ? { pathToClaudeCodeExecutable: config.CLAUDE_BIN } : {}),
      },
    });

    for await (const msg of q) {
      if (timedOut) {
        ok = false;
        reply = "Hệ thống quá tải — vui lòng thử lại sau.";
        break;
      }

      const elapsed = Date.now() - startTs;

      if (msg.type === "assistant") {
        const blocks = msg.message.content as Array<{
          type: string;
          text?: string;
          name?: string;
          input?: unknown;
        }>;
        for (const b of blocks) {
          if (b.type === "tool_use" && b.name) {
            const short = b.name.replace(/^mcp__\w+__/, "");
            toolsUsed.push(short);
            const argsJson = b.input ? JSON.stringify(b.input) : "";
            logger.info(tag, `  [+${elapsed}ms] 🔧 ${short}(${preview(argsJson, 100)})`);
            input.onToolCall?.(short);
          } else if (b.type === "text" && b.text?.trim()) {
            const t = b.text.trim();
            logger.info(tag, `  [+${elapsed}ms] 💭 ${preview(t, 120)}`);
            input.onThinking?.(t);
          }
        }
      } else if (msg.type === "user") {
        // tool_result blocks come back as user messages
        const blocks = (msg.message?.content as Array<{ type: string; content?: unknown; is_error?: boolean }>) ?? [];
        for (const b of blocks) {
          if (b.type === "tool_result") {
            const contentStr = typeof b.content === "string" ? b.content : JSON.stringify(b.content);
            const mark = b.is_error ? "✗" : "✔";
            logger.info(tag, `  [+${elapsed}ms] ${mark} result: ${preview(contentStr, 140)}`);
          }
        }
      } else if (msg.type === "result") {
        if (msg.subtype === "success") {
          reply = msg.result;
          logger.info(tag, `◀ [+${elapsed}ms] reply (${reply.length} chars), tools: [${toolsUsed.join(", ")}]`);
        } else {
          ok = false;
          reply = "Có lỗi khi xử lý — vui lòng thử lại.";
          logger.error(tag, `[+${elapsed}ms] subtype=${msg.subtype} (${(msg as { error?: string }).error ?? "no detail"})`);
        }
      } else if (msg.type === "system") {
        // Init/setup messages — log once at debug
        logger.debug(tag, `system: ${(msg as { subtype?: string }).subtype ?? "init"}`);
      }
    }

    if (!reply && ok) {
      reply = "Không có phản hồi — vui lòng thử lại.";
      logger.warn(tag, `[+${Date.now() - startTs}ms] empty reply but no error`);
    }
  } catch (e) {
    ok = false;
    const errMsg = e instanceof Error ? e.message : String(e);
    logger.error(tag, `Threw at +${Date.now() - startTs}ms: ${errMsg}`, e);
    reply = "Lỗi hệ thống. Vui lòng thử lại sau.";
  } finally {
    clearTimeout(timer);
  }

  logger.info(tag, `✓ done in ${Date.now() - startTs}ms (ok=${ok}, ${toolsUsed.length} tools)`);
  return { reply, ok, toolsUsed };
}
