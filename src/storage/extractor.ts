/**
 * Extract text content from various file types.
 * Used to feed file content into Claude for analysis.
 */

const MAX_CHARS = 15_000;

export interface ExtractResult {
  content: string;
  truncated: boolean;
}

export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<ExtractResult> {
  let content = "";

  if (mimeType.startsWith("text/") || mimeType === "application/json" || mimeType === "text/csv") {
    content = buffer.toString("utf-8");
  } else if (mimeType.includes("wordprocessingml") || fileName.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    content = result.value;
  } else if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    content = await extractPdf(buffer, fileName);
  } else if (
    mimeType.includes("spreadsheetml") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls")
  ) {
    content = await extractXlsx(buffer, fileName);
  } else if (mimeType.startsWith("image/")) {
    // Images are passed as base64 directly to Claude — no text extraction needed
    content = `[Image: ${fileName}]`;
  } else {
    content = `[Binary file: ${fileName} (${mimeType})]`;
  }

  const truncated = content.length > MAX_CHARS;
  if (truncated) content = content.slice(0, MAX_CHARS) + "\n… [truncated]";

  return { content, truncated };
}

async function extractPdf(buffer: Buffer, fileName: string): Promise<string> {
  // Try pdf-parse first (fast, works on text-based PDFs)
  try {
    const pdfModule = await import("pdf-parse");
    const pdfParse = ((pdfModule as any).default ?? pdfModule) as (buf: Buffer) => Promise<{ text: string }>;
    const result = await pdfParse(buffer);
    const text = result.text?.trim() ?? "";
    if (text.length > 10) return text;
  } catch {
    // fall through
  }

  // Fallback: mupdf — handles scanned PDFs and image-based pages
  try {
    const mupdf = (await import("mupdf")).default;
    const doc = mupdf.Document.openDocument(buffer, "application/pdf");
    const pageCount = doc.countPages();
    const pages: string[] = [];
    for (let i = 0; i < pageCount; i++) {
      const page = doc.loadPage(i);
      const st = page.toStructuredText("preserve-whitespace");
      const text = st.asText().trim();
      if (text) pages.push(text);
    }
    const combined = pages.join("\n\n").trim();
    if (combined.length > 10) return combined;
  } catch {
    // fall through
  }

  return `[PDF không đọc được: ${fileName}]`;
}

async function extractXlsx(buffer: Buffer, fileName: string): Promise<string> {
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheets = workbook.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      return `=== ${name} ===\n${csv}`;
    });
    return sheets.join("\n\n");
  } catch {
    return `[Excel không đọc được: ${fileName}]`;
  }
}
