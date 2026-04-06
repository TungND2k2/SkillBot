import type { DbInstance } from "../db/connection.js";
import type { Config } from "../config.js";
import { runPipeline } from "../pipeline/pipeline.js";
import { logger } from "../utils/logger.js";
import type { TestScenario, ScenarioResult, TurnResult } from "./types.js";
import { SaleAgent } from "./sale-agent.js";
import { TelegramReporter } from "./reporter.js";

const DEFAULT_MAX_TURNS = 40;

/**
 * Run a single test scenario: SaleAgent ↔ SkillBot loop.
 * Both sides are Claude. Results are streamed live to Telegram.
 */
export async function runScenario(
  scenario: TestScenario,
  db: DbInstance,
  config: Config,
  reporter: TelegramReporter
): Promise<ScenarioResult> {
  const start = Date.now();
  const maxTurns = scenario.maxTurns ?? DEFAULT_MAX_TURNS;

  await reporter.scenarioStart(scenario.name, scenario.description);

  // Stable fake user ID so session persists across turns
  const fakeUserId = `test_${scenario.tenantId}_${scenario.name.replace(/\s+/g, "_").slice(0, 20)}`;

  const agent = new SaleAgent(scenario);
  const turns: TurnResult[] = [];
  let completed = false;
  let errorMsg: string | undefined;

  // First message from sale agent (no bot reply yet)
  let saleMessage: string;
  try {
    saleMessage = await agent.nextMessage(null);
  } catch (err: any) {
    errorMsg = `SaleAgent init error: ${err?.message ?? err}`;
    await reporter.log(`❌ ${errorMsg}`);
    return {
      scenarioName: scenario.name, completed: false,
      totalTurns: 0, turns: [], totalMs: Date.now() - start, error: errorMsg,
    };
  }

  for (let turn = 1; turn <= maxTurns; turn++) {
    if (saleMessage === "__DONE__") {
      completed = true;
      break;
    }
    if (saleMessage === "__STUCK__") {
      errorMsg = "SaleAgent reported it is stuck";
      break;
    }

    const turnStart = Date.now();

    // Show sale agent message
    await reporter.saleMessage(turn, saleMessage);

    // Send to real SkillBot pipeline
    let botReply = "";
    try {
      const output = await runPipeline({
        tenantId: scenario.tenantId,
        channel: "test",
        channelUserId: fakeUserId,
        userName: scenario.userName,
        userRole: scenario.userRole,
        message: saleMessage,
        db,
        config,
      });
      botReply = output.reply;
    } catch (err: any) {
      errorMsg = `Pipeline error on turn ${turn}: ${err?.message ?? err}`;
      await reporter.log(`❌ ${errorMsg}`);
      break;
    }

    const durationMs = Date.now() - turnStart;

    // Show bot reply
    await reporter.botReply(turn, botReply, durationMs);

    turns.push({ turn, saleMessage, botReply, durationMs });

    // Get next sale agent message
    try {
      saleMessage = await agent.nextMessage(botReply);
    } catch (err: any) {
      errorMsg = `SaleAgent error on turn ${turn}: ${err?.message ?? err}`;
      await reporter.log(`❌ ${errorMsg}`);
      break;
    }
  }

  // Check if last sale message was __DONE__
  if (saleMessage === "__DONE__") completed = true;

  const totalMs = Date.now() - start;
  const result: ScenarioResult = {
    scenarioName: scenario.name,
    completed,
    totalTurns: turns.length,
    turns,
    totalMs,
    error: errorMsg,
  };

  await reporter.scenarioEnd(result);

  // Cleanup test session
  if (scenario.cleanupAfter !== false) {
    try {
      await db.collection("conversation_sessions").deleteOne({
        tenantId: scenario.tenantId, channel: "test", channelUserId: fakeUserId,
      });
    } catch {
      logger.warn("TestRunner", `Could not cleanup session for ${fakeUserId}`);
    }
  }

  return result;
}

/**
 * Run multiple scenarios sequentially.
 */
export async function runAllScenarios(
  scenarios: TestScenario[],
  db: DbInstance,
  config: Config,
  reporter: TelegramReporter
): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = [];
  for (const scenario of scenarios) {
    results.push(await runScenario(scenario, db, config, reporter));
  }
  await reporter.summary(results);
  return results;
}
