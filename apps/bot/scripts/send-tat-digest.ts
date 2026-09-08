/**
 * Bắn digest cảnh báo TAT ngay lập tức (không chờ cron 8h sáng).
 * Dùng để test hoặc khi quản lý muốn xem tình hình ngay.
 *
 *   cd apps/bot && npx tsx scripts/send-tat-digest.ts
 */
import "dotenv/config";
import { setDefaultAutoSelectFamily } from "node:net";

setDefaultAutoSelectFamily(false); // cùng lý do như src/index.ts (IPv6 hỏng trên VM)

import { loadConfig } from "../src/config.js";
import { TelegramChannel } from "../src/telegram/channel.js";
import { runDailyOrderReport } from "../src/cron/tat-alerts.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN chưa set");
  process.exit(1);
}

const telegram = new TelegramChannel(token, loadConfig());
await runDailyOrderReport({ telegram });
console.log("done");
process.exit(0);
