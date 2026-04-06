import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "../config.js";

const client = new Anthropic();

export interface JudgementResult {
  passed: boolean;
  reason: string;
}

/**
 * Ask Claude to judge whether the bot's reply satisfies the expected outcome.
 * Returns a simple pass/fail with a short explanation.
 */
export async function judgeStep(
  userMessage: string,
  botReply: string,
  expect: string,
  _config: Config
): Promise<JudgementResult> {
  const prompt = `You are an automated QA judge evaluating a chatbot response.

User sent: "${userMessage}"

Bot replied:
<reply>
${botReply}
</reply>

Expected behaviour: "${expect}"

Does the bot reply satisfy the expected behaviour? Answer with JSON only:
{"passed": true/false, "reason": "one short sentence explaining why"}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (response.content[0] as any)?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        passed: Boolean(parsed.passed),
        reason: String(parsed.reason ?? ""),
      };
    }
    return { passed: false, reason: `Could not parse judge response: ${text.slice(0, 100)}` };
  } catch (err: any) {
    return { passed: false, reason: `Judge error: ${err?.message ?? String(err)}` };
  }
}
