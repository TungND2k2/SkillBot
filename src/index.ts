import "dotenv/config";
import { loadConfig } from "./config.js";
import { initDb, connectDb, getDb } from "./db/connection.js";
import { runMigrations } from "./db/migrate.js";
import { loadSkills, getAllSkills } from "./skills/_registry.js";
import { TelegramChannel } from "./channel/telegram/telegram.channel.js";
import { CronService } from "./cron/cron.service.js";
import { initStorage } from "./storage/s3.js";
import { logger } from "./utils/logger.js";

let telegramChannel: TelegramChannel | null = null;
let cronService: CronService | null = null;

async function main() {
  // 1. Config
  const config = loadConfig();
  logger.info("Boot", `SkillBot starting (${config.NODE_ENV})`);

  // 2. Database
  initDb(config.DATABASE_URL);
  await connectDb();
  await runMigrations();
  const db = getDb();

  // 3. Skills
  await loadSkills();
  logger.info("Boot", `${getAllSkills().length} skills ready`);
  logger.info("Boot", `Model: ${config.CLAUDE_MODEL}`);

  // 4. Storage (S3)
  initStorage(config);

  // 4. Cron service
  cronService = new CronService(db, config);
  cronService.start();

  // 5. Telegram channel
  telegramChannel = new TelegramChannel(db, config);
  await telegramChannel.start();

  // 6. Dashboard
  if (config.HTTP_PORT) {
    logger.info("Boot", `Dashboard HTTP not yet implemented (port ${config.HTTP_PORT})`);
  }

  logger.info("Boot", "SkillBot ready");
}

// ── Graceful shutdown ─────────────────────────────────────────

function shutdown(signal: string) {
  logger.info("Boot", `${signal} received — shutting down`);
  telegramChannel?.stop();
  cronService?.stop();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
