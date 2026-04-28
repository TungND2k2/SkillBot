import { getDb } from "../../db/connection.js";
import type { DashboardStatsDto } from "../../shared/dto.js";

/**
 * Aggregates counts across collections for the dashboard overview.
 *
 * This service queries multiple collections directly (no per-entity repo)
 * because every count is a one-shot aggregation — adding 8 thin repos for
 * one stat each would be more code, not less.
 */
export class DashboardService {
  async getStats(tenantId: string | null): Promise<DashboardStatsDto> {
    const db = getDb();
    const filter = tenantId ? { tenantId } : {};

    const [
      collections,
      rows,
      activeWorkflows,
      activeForms,
      users,
      activeCrons,
      files,
      auditLast24h,
    ] = await Promise.all([
      db.collection("collections").countDocuments(filter),
      this.countRows(tenantId),
      db.collection("workflow_instances").countDocuments({ ...filter, status: "active" }),
      db.collection("form_templates").countDocuments({ ...filter, status: "active" }),
      db.collection("tenant_users").countDocuments(
        tenantId ? { tenantId, isActive: true } : { isActive: true },
      ),
      db.collection("cron_jobs").countDocuments({ ...filter, status: "active" }),
      db.collection("files").countDocuments(filter),
      db.collection("audit_logs").countDocuments({
        createdAt: { $gte: Date.now() - 24 * 60 * 60 * 1000 },
      }),
    ]);

    return {
      collections,
      rows,
      activeWorkflows,
      activeForms,
      users,
      activeCrons,
      files,
      auditLast24h,
    };
  }

  /**
   * Rows belong to collections (which carry tenantId). For a tenant-scoped
   * count we have to join via aggregation; cross-tenant just counts everything.
   */
  private async countRows(tenantId: string | null): Promise<number> {
    const db = getDb();
    if (!tenantId) {
      return db.collection("collection_rows").countDocuments({});
    }
    const result = await db
      .collection("collection_rows")
      .aggregate([
        {
          $lookup: {
            from: "collections",
            localField: "collectionId",
            foreignField: "_id",
            as: "c",
          },
        },
        { $match: { "c.tenantId": tenantId } },
        { $count: "n" },
      ])
      .toArray();
    return (result[0] as { n?: number } | undefined)?.n ?? 0;
  }
}
