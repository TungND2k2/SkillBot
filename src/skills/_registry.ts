import { z } from "zod";
import type { SkillDef, SkillContext } from "./_types.js";
import { logger } from "../utils/logger.js";

const skills = new Map<string, SkillDef>();

/** Load all skills into the registry — called once at startup */
export async function loadSkills(): Promise<void> {
  const modules = await Promise.all([
    // collections
    import("./collections/list-collections.js"),
    import("./collections/create-collection.js"),
    import("./collections/add-row.js"),
    import("./collections/list-rows.js"),
    import("./collections/update-row.js"),
    import("./collections/delete-row.js"),
    import("./collections/search-rows.js"),
    // workflows
    import("./workflows/list-workflows.js"),
    import("./workflows/create-workflow.js"),
    import("./workflows/start-workflow.js"),
    import("./workflows/approve-workflow.js"),
    // forms
    import("./forms/list-forms.js"),
    import("./forms/create-form.js"),
    import("./forms/update-form.js"),
    import("./forms/delete-form.js"),
    import("./forms/start-form.js"),
    import("./forms/update-form-field.js"),
    import("./forms/cancel-form.js"),
    // rules
    import("./rules/list-rules.js"),
    import("./rules/create-rule.js"),
    import("./rules/delete-rule.js"),
    // users
    import("./users/list-users.js"),
    import("./users/list-roles.js"),
    import("./users/set-user-role.js"),
    import("./users/request-permission.js"),
    import("./users/approve-permission.js"),
    // files
    import("./files/list-files.js"),
    import("./files/read-file.js"),
    import("./files/upload-file.js"),
    // knowledge
    import("./knowledge/save-knowledge.js"),
    import("./knowledge/get-knowledge.js"),
    // scheduling
    import("./scheduling/create-cron.js"),
    import("./scheduling/list-crons.js"),
    import("./scheduling/delete-cron.js"),
    // admin
    import("./admin/update-instructions.js"),
    import("./admin/get-dashboard.js"),
    import("./admin/search-all.js"),
  ]);

  for (const mod of modules) {
    const skill = mod.default as SkillDef;
    if (skills.has(skill.name)) {
      logger.warn("Skills", `Duplicate skill name: ${skill.name}`);
    }
    skills.set(skill.name, skill);
  }

  logger.info("Skills", `${skills.size} skills loaded`);
}

/** Build SDK tool definitions for createSdkMcpServer() */
export async function buildSdkTools(ctxFactory: () => SkillContext) {
  const { tool } = await import("@anthropic-ai/claude-agent-sdk");

  return Array.from(skills.values()).map((s) =>
    tool(
      s.name,
      s.description,
      s.inputSchema,
      async (args: Record<string, unknown>) => {
        const ctx = ctxFactory();

        // Role check
        if (s.requiredRoles && !s.requiredRoles.includes(ctx.userRole)) {
          return {
            content: [{ type: "text" as const, text: `Permission denied: requires ${s.requiredRoles.join("/")}` }],
            isError: true,
          };
        }

        try {
          return await s.handler(args, ctx) as never;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          logger.error("Skills", `${s.name} failed: ${msg}`, error);
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: msg }) }],
            isError: true,
          };
        }
      }
    )
  );
}

/** Get skill by name */
export function getSkill(name: string): SkillDef | undefined {
  return skills.get(name);
}

/** Get all registered skills */
export function getAllSkills(): SkillDef[] {
  return Array.from(skills.values());
}

/** Get names of all mutating skills (for cache invalidation) */
export function getMutatingSkillNames(): Set<string> {
  return new Set(
    Array.from(skills.values())
      .filter((s) => s.mutating)
      .map((s) => s.name)
  );
}
