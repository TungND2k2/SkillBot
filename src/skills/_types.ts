import type { z } from "zod";
import type { DbInstance } from "../db/connection.js";

/** Context passed to every skill handler */
export interface SkillContext {
  tenantId: string;
  userId: string;
  channelUserId: string;
  userName: string;
  userRole: string;
  sessionId: string;
  db: DbInstance;
}

/** Result format matching MCP CallToolResult */
export interface SkillResult {
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

/** Skill definition — each skill file exports one of these as default */
export interface SkillDef {
  name: string;
  description: string;
  category: string;
  inputSchema: z.ZodRawShape;
  requiredRoles?: string[];
  mutating?: boolean;
  handler: (args: Record<string, unknown>, ctx: SkillContext) => Promise<SkillResult>;
}

/** Helper to create a success result */
export function ok(data: unknown): SkillResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

/** Helper to create an error result */
export function err(message: string): SkillResult {
  return { content: [{ type: "text", text: JSON.stringify({ error: message }) }], isError: true };
}
