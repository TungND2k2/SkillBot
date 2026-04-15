/**
 * Extract text content from files via MarkItDown service.
 * MarkItDown handles: PDF, DOCX, XLSX, PPTX, HTML, images (OCR), audio, etc.
 */

const MAX_CHARS = 15_000;
const MARKITDOWN_URL = process.env.MARKITDOWN_URL ?? "http://localhost:8080";

export interface ExtractResult {
  content: string;
  truncated: boolean;
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ExtractResult> {
  // Images still passed as base64 directly to Claude — no OCR needed here
  if (mimeType.startsWith("image/")) {
    return { content: `[Image: ${fileName}]`, truncated: false };
  }

  // Plain text/JSON/CSV — decode directly, skip service call
  if (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "text/csv"
  ) {
    let content = buffer.toString("utf-8");
    const truncated = content.length > MAX_CHARS;
    if (truncated) content = content.slice(0, MAX_CHARS) + "\n… [truncated]";
    return { content, truncated };
  }

  // Everything else → MarkItDown
  try {
    const form = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: mimeType || "application/octet-stream" });
    form.append("file", blob, fileName);

    const res = await fetch(`${MARKITDOWN_URL}/convert`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        content: `[Không đọc được file: ${fileName} — ${res.status} ${errText.slice(0, 120)}]`,
        truncated: false,
      };
    }

    const data = (await res.json()) as { content?: string; title?: string };
    let content = (data.content ?? "").trim();
    if (!content) content = `[File rỗng hoặc không trích xuất được: ${fileName}]`;

    const truncated = content.length > MAX_CHARS;
    if (truncated) content = content.slice(0, MAX_CHARS) + "\n… [truncated]";
    return { content, truncated };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: `[Lỗi kết nối MarkItDown service: ${msg}]`,
      truncated: false,
    };
  }
}
