/**
 * Chat endpoint cho web admin — bong bóng chat trong Payload UI gọi vào.
 *
 * Stream SSE để frontend thấy live status (AI đang gọi tool X, đang nghĩ...)
 * giống experience Telegram.
 *
 * Auth: header `X-Internal-Secret` khớp env. Browser KHÔNG gọi trực tiếp;
 * Next.js (CMS) proxy qua /api/chat sau khi check Payload session.
 *
 * History per `sessionKey` (vd "web:userId123") trong RAM — giống Telegram.
 */
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

import { getConfig } from "../config.js";
import { logger } from "../utils/logger.js";
import { runPipeline, type PriorMessage } from "../pipeline/pipeline.js";
import { describeToolCall } from "../telegram/tool-labels.js";

const MAX_HISTORY = 12;
const chatHistory = new Map<string, PriorMessage[]>();

const chatSchema = z.object({
  message: z.string().min(1),
  sessionKey: z.string().min(1),
  reset: z.boolean().optional(),
});

export function registerChatRoutes(app: Hono): void {
  app.post("/api/chat", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "bad-request", details: parsed.error.issues }, 400);
    }
    const { message, sessionKey, reset } = parsed.data;

    if (reset) {
      chatHistory.delete(sessionKey);
      return c.json({ ok: true, reset: true });
    }

    const history = chatHistory.get(sessionKey) ?? [];
    logger.info("ChatHTTP", `[${sessionKey}] "${message.slice(0, 80)}"`);

    return streamSSE(c, async (stream) => {
      const sendEvent = async (event: string, data: unknown) => {
        try {
          await stream.writeSSE({
            event,
            data: typeof data === "string" ? data : JSON.stringify(data),
          });
        } catch (err) {
          logger.warn("ChatHTTP", `SSE write failed: ${err}`);
        }
      };

      try {
        const result = await runPipeline({
          message,
          priorMessages: history,
          logTag: `Chat[${sessionKey}]`,
          onToolCall: (name, args) => {
            const label = describeToolCall(name, args);
            void sendEvent("tool", { name, label, args });
          },
          onThinking: (text) => {
            void sendEvent("thinking", { text });
          },
        });

        // Update history
        history.push({ role: "user", text: message });
        history.push({ role: "assistant", text: result.reply });
        if (history.length > MAX_HISTORY) {
          history.splice(0, history.length - MAX_HISTORY);
        }
        chatHistory.set(sessionKey, history);

        await sendEvent("reply", {
          text: result.reply,
          ok: result.ok,
          toolsUsed: result.toolsUsed,
        });
        await sendEvent("done", "");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error("ChatHTTP", `pipeline error: ${msg}`);
        await sendEvent("error", { message: msg });
        await sendEvent("done", "");
      }
    });
  });
}
