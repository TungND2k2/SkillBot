/**
 * Convert a string that may contain Markdown-like formatting into
 * Telegram HTML (the only safe parse_mode for bot messages).
 *
 * Supported inputs:
 *   **bold**        → <b>bold</b>
 *   *italic*        → <i>italic</i>
 *   _italic_        → <i>italic</i>
 *   `code`          → <code>code</code>
 *   ```block```     → <pre>block</pre>
 *   [text](url)     → <a href="url">text</a>
 *   # Heading       → <b>Heading</b>
 *   - item / * item → • item  (Telegram has no <ul>)
 *
 * Also escapes bare < > & that are NOT already inside an HTML tag.
 */
export function mdToTelegramHtml(input: string): string {
  let text = input;

  // 1. Fenced code blocks  ```...``` (multi-line)
  text = text.replace(/```([^`]*?)```/gs, (_, code) => {
    return `<pre>${escapeHtml(code.trim())}</pre>`;
  });

  // 2. Inline code  `...`
  text = text.replace(/`([^`\n]+?)`/g, (_, code) => {
    return `<code>${escapeHtml(code)}</code>`;
  });

  // 3. Bold  **...**
  text = text.replace(/\*\*(.+?)\*\*/gs, "<b>$1</b>");

  // 4. Italic  *...* or _..._  (non-greedy, single line)
  text = text.replace(/\*([^*\n]+?)\*/g, "<i>$1</i>");
  text = text.replace(/_([^_\n]+?)_/g, "<i>$1</i>");

  // 5. Markdown links  [text](url)
  text = text.replace(
    /\[([^\]]+?)\]\((https?:\/\/[^\)]+?)\)/g,
    '<a href="$2">$1</a>'
  );

  // 6. ATX headings  # Heading  /  ## Heading
  text = text.replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>");

  // 7. Unordered list items  - item  or  * item  (at line start)
  text = text.replace(/^[\-\*]\s+(.+)$/gm, "• $1");

  // 8. Escape stray < > & outside existing HTML tags
  text = escapeOutsideTags(text);

  return text;
}

// ── Helpers ───────────────────────────────────────────────────

/** Escape HTML special characters in a plain string */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Escape < > & that stand alone (i.e. are not part of an HTML tag or entity).
 * We do a simple state-machine scan rather than a full parser.
 */
function escapeOutsideTags(input: string): string {
  // Split on existing tags/entities, escape the text nodes
  return input.replace(
    /(<[^>]*>|&(?:[a-z]+|#\d+|#x[\da-f]+);)|([<>&])/gi,
    (match, tag, bare) => {
      if (tag) return tag;          // leave existing HTML alone
      if (bare === "<") return "&lt;";
      if (bare === ">") return "&gt;";
      if (bare === "&") return "&amp;";
      return match;
    }
  );
}

/**
 * Truncate a Telegram message to Telegram's 4096-char limit.
 * Appends "…" when truncated.
 */
export function truncate(text: string, limit = 4096): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit - 1) + "…";
}

/**
 * Split a long message into chunks that each fit within `limit` chars.
 * Tries to split on newlines to avoid breaking mid-sentence.
 */
export function splitMessage(text: string, limit = 4096): string[] {
  if (text.length <= limit) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > limit) {
    // Find last newline within limit
    let split = remaining.lastIndexOf("\n", limit);
    if (split <= 0) split = limit;
    chunks.push(remaining.slice(0, split));
    remaining = remaining.slice(split).trimStart();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}
