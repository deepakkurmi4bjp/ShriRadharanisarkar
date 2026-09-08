import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    const data = HealthCheckResponse.parse({ status: "ok" });
    res.json(data);
  } catch (error) {
    req.log?.error({ err: error }, "Health check database probe failed");
    res.status(503).json({ status: "degraded" });
  }
});

export default router;
