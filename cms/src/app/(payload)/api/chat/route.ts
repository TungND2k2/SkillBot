/**
 * Web chat proxy: browser ↔ bot.
 *
 * Browser POST /api/chat { message, reset? } → check Payload session
 * → forward POST http://localhost:4001/api/chat with INTERNAL_SECRET +
 *   sessionKey="web:<userId>" → stream SSE response back.
 *
 * INTERNAL_SECRET ở server-side, không lộ ra browser.
 */
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: req.headers });
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { message, reset } = body as { message?: string; reset?: boolean };

  if (!reset && (!message || typeof message !== "string" || !message.trim())) {
    return NextResponse.json({ error: "missing-message" }, { status: 400 });
  }

  const botUrl =
    process.env.BOT_INTERNAL_URL ?? "http://localhost:4001";
  const secret = process.env.INTERNAL_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "no-internal-secret" }, { status: 500 });
  }

  const sessionKey = `web:${user.id}`;
  // Pass current user context để bot inject vào pipeline. AI biết:
  //  - ai đang chat (xưng hô, không lộ data sai role)
  //  - role gì (sales chỉ thấy đơn của mình → AI không trả đơn của người khác)
  const currentUser = {
    id: String(user.id),
    email: (user as { email?: string }).email ?? "",
    displayName: (user as { displayName?: string }).displayName ?? "",
    role: (user as { role?: string }).role ?? "",
  };

  const upstream = await fetch(`${botUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": secret,
    },
    body: JSON.stringify({
      message: message ?? "",
      sessionKey,
      reset: !!reset,
      currentUser,
    }),
  });

  if (reset) {
    const json = await upstream.json().catch(() => ({}));
    return NextResponse.json(json, { status: upstream.status });
  }

  // Forward SSE stream xuống browser
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
