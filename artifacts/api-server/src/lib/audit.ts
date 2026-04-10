import { db, auditLogsTable } from "@workspace/db";
import { logger } from "./logger";

export async function createAuditLog(params: {
  userId?: number | null;
  action: string;
  details?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await db.insert(auditLogsTable).values({
      userId: params.userId ?? null,
      action: params.action,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    logger.error({ err }, "Failed to write audit log");
  }
}
