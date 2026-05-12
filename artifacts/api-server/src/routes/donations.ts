import { Router, type IRouter } from "express";
import { db, donationsTable, usersTable } from "@workspace/db";
import { eq, desc, sql, ilike, or } from "drizzle-orm";
import {
  CreateDonationBody,
  GetDonationParams,
  DeleteDonationParams,
  VerifyDonationParams,
  ListDonationsQueryParams,
} from "@workspace/api-zod";
import { generateDonationHash, verifyDonationHash } from "../lib/hash";
import { createAuditLog } from "../lib/audit";

const router: IRouter = Router();

router.get("/donations", async (req, res): Promise<void> => {
  const params = ListDonationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { page = 1, limit = 20, collector_id, search } = params.data;
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (collector_id != null) {
    conditions.push(eq(donationsTable.collectorId, collector_id));
  }

  const baseQuery = db
    .select({
      id: donationsTable.id,
      donationId: donationsTable.donationId,
      name: donationsTable.name,
      mobile: donationsTable.mobile,
      amount: donationsTable.amount,
      purpose: donationsTable.purpose,
      collectorId: donationsTable.collectorId,
      collectorName: usersTable.name,
      hash: donationsTable.hash,
      createdAt: donationsTable.createdAt,
    })
    .from(donationsTable)
    .leftJoin(usersTable, eq(donationsTable.collectorId, usersTable.id));

  let rows: typeof baseQuery extends Promise<infer T> ? T : never;

  if (search) {
    rows = await baseQuery
      .where(or(ilike(donationsTable.name, `%${search}%`), ilike(donationsTable.mobile, `%${search}%`)))
      .orderBy(desc(donationsTable.createdAt))
      .limit(limit)
      .offset(offset) as any;
  } else if (conditions.length > 0) {
    rows = await baseQuery
      .where(conditions[0])
      .orderBy(desc(donationsTable.createdAt))
      .limit(limit)
      .offset(offset) as any;
  } else {
    rows = await baseQuery
      .orderBy(desc(donationsTable.createdAt))
      .limit(limit)
      .offset(offset) as any;
  }

  const totalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(donationsTable);

  const total = totalResult[0]?.count ?? 0;

  res.json({
    donations: (rows as any[]).map((d: any) => ({
      id: d.id,
      donationId: d.donationId,
      name: d.name,
      mobile: d.mobile,
      amount: parseFloat(d.amount),
      purpose: d.purpose ?? null,
      collectorId: d.collectorId ?? null,
      collectorName: d.collectorName ?? null,
      hash: d.hash,
      isVerified: true,
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    })),
    total,
    page,
    limit,
  });
});

router.post("/donations", async (req, res): Promise<void> => {
  const parsed = CreateDonationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, mobile, amount, purpose, collectorId } = parsed.data;
  const donationId = `DON${Date.now()}${Math.floor(Math.random() * 1000)}`;
  // Normalize to remove trailing zeros (e.g. DB numeric returns "2100.00" but we need "2100")
  const amountStr = String(parseFloat(String(amount)));
  const hash = generateDonationHash(donationId, amountStr);

  const [donation] = await db
    .insert(donationsTable)
    .values({
      donationId,
      name,
      mobile,
      amount: amountStr,
      purpose: purpose ?? null,
      collectorId: collectorId ?? null,
      hash,
    })
    .returning();

  const collector = collectorId
    ? await db.select().from(usersTable).where(eq(usersTable.id, collectorId)).then(r => r[0])
    : null;

  await createAuditLog({
    userId: collectorId ?? null,
    action: "DONATION_CREATED",
    details: `Donation ${donationId} of ₹${amount} by ${name}`,
    ipAddress: req.ip,
  });

  res.status(201).json({
    id: donation.id,
    donationId: donation.donationId,
    name: donation.name,
    mobile: donation.mobile,
    amount: parseFloat(donation.amount),
    purpose: donation.purpose ?? null,
    collectorId: donation.collectorId ?? null,
    collectorName: collector?.name ?? null,
    hash: donation.hash,
    isVerified: true,
    createdAt: donation.createdAt instanceof Date ? donation.createdAt.toISOString() : donation.createdAt,
  });
});

router.get("/donations/:id", async (req, res): Promise<void> => {
  const params = GetDonationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: donationsTable.id,
      donationId: donationsTable.donationId,
      name: donationsTable.name,
      mobile: donationsTable.mobile,
      amount: donationsTable.amount,
      purpose: donationsTable.purpose,
      collectorId: donationsTable.collectorId,
      collectorName: usersTable.name,
      hash: donationsTable.hash,
      createdAt: donationsTable.createdAt,
    })
    .from(donationsTable)
    .leftJoin(usersTable, eq(donationsTable.collectorId, usersTable.id))
    .where(eq(donationsTable.id, params.data.id));

  const d = rows[0];
  if (!d) {
    res.status(404).json({ error: "Donation not found" });
    return;
  }

  res.json({
    id: d.id,
    donationId: d.donationId,
    name: d.name,
    mobile: d.mobile,
    amount: parseFloat(d.amount),
    purpose: d.purpose ?? null,
    collectorId: d.collectorId ?? null,
    collectorName: (d as any).collectorName ?? null,
    hash: d.hash,
    isVerified: true,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
  });
});

router.delete("/donations/:id", async (req, res): Promise<void> => {
  const params = DeleteDonationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(donationsTable)
    .where(eq(donationsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Donation not found" });
    return;
  }

  await createAuditLog({
    action: "DONATION_DELETED",
    details: `Donation ${deleted.donationId} deleted`,
    ipAddress: req.ip,
  });

  res.sendStatus(204);
});

router.get("/donations/:id/verify", async (req, res): Promise<void> => {
  const params = VerifyDonationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: donationsTable.id,
      donationId: donationsTable.donationId,
      name: donationsTable.name,
      mobile: donationsTable.mobile,
      amount: donationsTable.amount,
      purpose: donationsTable.purpose,
      collectorId: donationsTable.collectorId,
      collectorName: usersTable.name,
      hash: donationsTable.hash,
      createdAt: donationsTable.createdAt,
    })
    .from(donationsTable)
    .leftJoin(usersTable, eq(donationsTable.collectorId, usersTable.id))
    .where(eq(donationsTable.id, params.data.id));

  const d = rows[0];
  if (!d) {
    res.status(404).json({ error: "Donation not found" });
    return;
  }

  // Normalize amount: DB numeric column returns "2100.00" but hash was computed with "2100"
  const normalizedAmount = String(parseFloat(d.amount));
  const isValid = verifyDonationHash(d.donationId, normalizedAmount, d.hash);

  const donation = {
    id: d.id,
    donationId: d.donationId,
    name: d.name,
    mobile: d.mobile,
    amount: parseFloat(d.amount),
    purpose: d.purpose ?? null,
    collectorId: d.collectorId ?? null,
    collectorName: (d as any).collectorName ?? null,
    hash: d.hash,
    isVerified: isValid,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
  };

  res.json({
    valid: isValid,
    donation,
    message: isValid ? "Receipt is authentic and verified" : "Receipt hash mismatch - possible tampering detected",
  });
});

export default router;
