import Anthropic from "@anthropic-ai/sdk";
import type { TestScenario } from "./types.js";

const client = new Anthropic();

export interface SaleAgentMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * The SaleAgent is a Claude instance that plays the role of a sales employee.
 * It receives SkillBot's replies and generates the next message a real sales
 * person would send — including answering questions, providing data, uploading files, etc.
 *
 * Special return values:
 *   "__DONE__"  → task is complete, stop the loop
 *   "__STUCK__" → agent is stuck / cannot proceed
 */
export class SaleAgent {
  private history: SaleAgentMessage[] = [];
  private readonly systemPrompt: string;

  constructor(private readonly scenario: TestScenario) {
    const dataBlock = scenario.saleData
      ? `\n\nDữ liệu mẫu của bạn:\n${Object.entries(scenario.saleData)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}`
      : "";

    this.systemPrompt =
      `Bạn là một nhân viên ${scenario.saleRole} đang làm việc với một chatbot quản lý nội bộ.\n\n` +
      `Nhiệm vụ của bạn: ${scenario.saleInstructions}${dataBlock}\n\n` +
      `Quy tắc:\n` +
      `- Trả lời tự nhiên như người thật, ngắn gọn\n` +
      `- Khi bot hỏi thông tin, cung cấp đúng dữ liệu mẫu ở trên\n` +
      `- Khi bot hỏi xác nhận (ví dụ: "confirm?", "đúng không?"), trả lời đồng ý\n` +
      `- Điều kiện hoàn thành: ${scenario.doneWhen}\n` +
      `- Khi nhiệm vụ hoàn thành, CHỈ trả về đúng token: __DONE__\n` +
      `- Nếu bot báo lỗi hoặc bạn không thể tiếp tục, trả về đúng token: __STUCK__\n` +
      `- KHÔNG giải thích gì thêm khi trả __DONE__ hoặc __STUCK__`;
  }

  /**
   * Send SkillBot's reply to the SaleAgent and get the next sale message.
   * Pass null as the first call to get the opening message.
   */
  async nextMessage(botReply: string | null): Promise<string> {
    if (botReply !== null) {
      // Record bot reply as "assistant" from sale agent's POV (it's the other side)
      this.history.push({ role: "assistant", content: botReply });
    }

    const messages: Anthropic.MessageParam[] = this.history.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // First turn: prime the agent with an instruction to start
    if (messages.length === 0) {
      messages.push({
        role: "user",
        content: "Bắt đầu cuộc trò chuyện với bot. Gửi tin nhắn đầu tiên để bắt đầu nhiệm vụ.",
      });
    }

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: this.systemPrompt,
      messages,
    });

    const text = ((response.content[0] as any)?.text ?? "").trim();

    // Record sale agent's message as "user" for next turn
    this.history.push({ role: "user", content: text });

    return text;
  }
}
