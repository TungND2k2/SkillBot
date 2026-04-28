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
}

export interface PipelineOutput {
  reply: string;
  ok: boolean;
  toolsUsed: string[];
}

export async function runPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const config = getConfig();
  const toolsUsed: string[] = [];
  let reply = "";
  let ok = true;

  const mcpServer = createSdkMcpServer({
    name: "skillbot",
    tools: allTools,
  });

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
      if (msg.type === "assistant") {
        const blocks = msg.message.content as Array<{ type: string; text?: string; name?: string }>;
        for (const b of blocks) {
          if (b.type === "tool_use" && b.name) {
            const short = b.name.replace(/^mcp__\w+__/, "");
            toolsUsed.push(short);
            input.onToolCall?.(short);
            logger.debug("Pipeline", `🔧 ${short}`);
          } else if (b.type === "text" && b.text?.trim()) {
            input.onThinking?.(b.text);
          }
        }
      } else if (msg.type === "result") {
        if (msg.subtype === "success") {
          reply = msg.result;
        } else {
          ok = false;
          reply = "Có lỗi khi xử lý — vui lòng thử lại.";
          logger.error("Pipeline", `Query subtype=${msg.subtype}`);
        }
      }
    }

    if (!reply && ok) reply = "Không có phản hồi — vui lòng thử lại.";
  } catch (e) {
    ok = false;
    const errMsg = e instanceof Error ? e.message : String(e);
    logger.error("Pipeline", `Threw: ${errMsg}`, e);
    reply = "Lỗi hệ thống. Vui lòng thử lại sau.";
  }

  return { reply, ok, toolsUsed };
}
