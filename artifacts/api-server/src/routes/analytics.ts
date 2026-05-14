import { Router, type IRouter } from "express";
import { db, donationsTable, usersTable } from "@workspace/db";
import { sql, eq, desc, gte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

// Public — used by the public dashboard
router.get("/analytics/summary", async (_req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totals] = await db
    .select({
      totalAmount: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
      totalDonations: sql<number>`COUNT(*)::int`,
      totalDonors: sql<number>`COUNT(DISTINCT mobile)::int`,
    })
    .from(donationsTable);

  const [todayStats] = await db
    .select({
      todayAmount: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
      todayDonations: sql<number>`COUNT(*)::int`,
    })
    .from(donationsTable)
    .where(gte(donationsTable.createdAt, today));

  const [collectorCount] = await db
    .select({ count: sql<number>`COUNT(DISTINCT collector_id)::int` })
    .from(donationsTable);

  const totalDonations = totals?.totalDonations ?? 0;
  const totalAmount = totals?.totalAmount ?? 0;

  res.json({
    totalAmount,
    totalDonations,
    totalCollectors: collectorCount?.count ?? 0,
    totalDonors: totals?.totalDonors ?? 0,
    todayAmount: todayStats?.todayAmount ?? 0,
    todayDonations: todayStats?.todayDonations ?? 0,
    avgDonation: totalDonations > 0 ? totalAmount / totalDonations : 0,
  });
});

// Admin-only analytics
router.get("/analytics/daily", requireAuth("admin"), async (_req, res): Promise<void> => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const rows = await db
    .select({
      date: sql<string>`DATE(created_at)::text`,
      amount: sql<number>`SUM(amount::numeric)::float`,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(donationsTable)
    .where(gte(donationsTable.createdAt, thirtyDaysAgo))
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);

  res.json(rows.map((r) => ({ date: r.date, amount: r.amount, count: r.count })));
});

router.get("/analytics/top-collectors", requireAuth("admin"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      collectorId: donationsTable.collectorId,
      collectorName: usersTable.name,
      totalAmount: sql<number>`SUM(amount::numeric)::float`,
      donationCount: sql<number>`COUNT(*)::int`,
    })
    .from(donationsTable)
    .leftJoin(usersTable, eq(donationsTable.collectorId, usersTable.id))
    .where(sql`collector_id IS NOT NULL`)
    .groupBy(donationsTable.collectorId, usersTable.name)
    .orderBy(desc(sql`SUM(amount::numeric)`))
    .limit(10);

  res.json(
    rows.map((r) => ({
      collectorId: r.collectorId!,
      collectorName: r.collectorName ?? "Unknown",
      totalAmount: r.totalAmount,
      donationCount: r.donationCount,
    }))
  );
});

router.get("/analytics/amount-distribution", requireAuth("admin"), async (_req, res): Promise<void> => {
  const buckets = [
    { range: "Under ₹100", min: 0, max: 99 },
    { range: "₹100 - ₹500", min: 100, max: 500 },
    { range: "₹501 - ₹1000", min: 501, max: 1000 },
    { range: "₹1001 - ₹5000", min: 1001, max: 5000 },
    { range: "Above ₹5000", min: 5001, max: 9999999 },
  ];

  const result = await Promise.all(
    buckets.map(async (bucket) => {
      const [row] = await db
        .select({
          count: sql<number>`COUNT(*)::int`,
          amount: sql<number>`COALESCE(SUM(amount::numeric), 0)::float`,
        })
        .from(donationsTable)
        .where(sql`amount::numeric >= ${bucket.min} AND amount::numeric <= ${bucket.max}`);

      return { range: bucket.range, count: row?.count ?? 0, amount: row?.amount ?? 0 };
    })
  );

  res.json(result);
});

export default router;
