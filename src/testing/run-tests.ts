import "dotenv/config";
import { loadConfig } from "../config.js";
import { initDb, connectDb, getDb } from "../db/connection.js";
import { loadSkills } from "../skills/_registry.js";
import { runAllScenarios } from "./runner.js";
import { TelegramReporter } from "./reporter.js";
import { logger } from "../utils/logger.js";

// ── CONFIG ───────────────────────────────────────────────────
// Tenant to test against
const TENANT_ID = process.env.TEST_TENANT_ID ?? "69d346f7682cc9e3f837f72b";
// Your personal Telegram chat ID — results/live feed go here
const OBSERVER_CHAT_ID = Number(process.env.TEST_OBSERVER_CHAT_ID ?? "1963992425");
// ─────────────────────────────────────────────────────────────

async function main() {
  const config = loadConfig();
  initDb(config.DATABASE_URL);
  await connectDb();
  await loadSkills();

  const db = getDb();

  logger.info("TestRunner", `Tenant: ${TENANT_ID} | Observer: ${OBSERVER_CHAT_ID}`);

  // Build reporter — sends live updates to your Telegram
  const reporter = await TelegramReporter.create(db, TENANT_ID, OBSERVER_CHAT_ID);
  await reporter.log(`🚀 Test runner started — loading scenarios...`);

  // Dynamically import all scenario files
  const scenarioFiles: string[] = process.argv.slice(2);
  const scenarios = [];

  if (scenarioFiles.length === 0) {
    // Default: run all scenarios from the scenarios/ folder
    const { readdirSync } = await import("fs");
    const { join, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const __dir = dirname(fileURLToPath(import.meta.url));
    const scenariosDir = join(__dir, "scenarios");
    let files: string[] = [];
    try {
      files = readdirSync(scenariosDir).filter(f => f.endsWith(".ts") || f.endsWith(".js"));
    } catch {
      await reporter.log("⚠️ No scenarios/ folder found. Create src/testing/scenarios/*.ts files.");
      process.exit(1);
    }

    for (const file of files) {
      const mod = await import(`./scenarios/${file.replace(/\.ts$/, ".js")}`);
      if (mod.default) scenarios.push(mod.default);
    }
  } else {
    for (const file of scenarioFiles) {
      const mod = await import(file);
      if (mod.default) scenarios.push(mod.default);
    }
  }

  if (scenarios.length === 0) {
    await reporter.log("⚠️ No scenarios found.");
    process.exit(1);
  }

  await reporter.log(`📋 ${scenarios.length} scenario(s) to run`);

  await runAllScenarios(scenarios, db, config, reporter);

  process.exit(0);
}

main().catch(async err => {
  logger.error("TestRunner", "Fatal error", err);
  process.exit(1);
});
