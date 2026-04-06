import { z } from "zod";

const configSchema = z.object({
  // Core
  DATABASE_URL: z.string(),
  NODE_ENV: z.enum(["development", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),

  // Claude Agent SDK — free via Max subscription, no API key needed
  CLAUDE_MODEL: z.string().default("claude-sonnet-4-20250514"),

  // S3 Storage
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),

  // Queue
  QUEUE_CONCURRENCY: z.coerce.number().default(5),
  QUEUE_MAX_SIZE: z.coerce.number().default(100),
  QUEUE_JOB_TIMEOUT_MS: z.coerce.number().default(120_000),

  // Pipeline
  MAX_TOOL_LOOPS: z.coerce.number().default(10),
  SUMMARY_THRESHOLD: z.coerce.number().default(24),
  KEEP_RECENT_MESSAGES: z.coerce.number().default(10),

  // Dashboard
  HTTP_PORT: z.coerce.number().optional(),

  // Cron
  CRON_TICK_MS: z.coerce.number().default(5000),
});

export type Config = z.infer<typeof configSchema>;

let _config: Config | null = null;

export function loadConfig(): Config {
  if (_config) return _config;
  _config = configSchema.parse(process.env);
  return _config;
}

export function getConfig(): Config {
  if (!_config) return loadConfig();
  return _config;
}
