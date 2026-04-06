// ── Test scenario types ──────────────────────────────────────

export interface TestScenario {
  /** Display name shown in Telegram reports */
  name: string;
  /** Short description of what is being tested */
  description: string;
  /** Real tenant ID from the DB */
  tenantId: string;

  // ── SaleBot persona ────────────────────────────────────────
  /** Role the sale agent plays in the conversation */
  saleRole: string;
  /** instructions for the sale agent — what task to accomplish, what data to use */
  saleInstructions: string;
  /** Sample data the sale agent should use when filling in fields */
  saleData?: Record<string, string>;

  // ── SkillBot side ──────────────────────────────────────────
  /** Display name shown to SkillBot */
  userName: string;
  /** Role granted to the simulated user in SkillBot */
  userRole: string;

  // ── Termination ────────────────────────────────────────────
  /** Max number of back-and-forth turns before giving up */
  maxTurns?: number;
  /** Natural-language description of what "done" looks like — agent stops when this is true */
  doneWhen: string;

  /** Whether to clean up the test session from DB after the run. Defaults to true. */
  cleanupAfter?: boolean;
}

// ── Result types ─────────────────────────────────────────────

export interface TurnResult {
  turn: number;
  saleMessage: string;
  botReply: string;
  durationMs: number;
}

export interface ScenarioResult {
  scenarioName: string;
  /** True if doneWhen condition was met before maxTurns */
  completed: boolean;
  totalTurns: number;
  turns: TurnResult[];
  totalMs: number;
  error?: string;
}
