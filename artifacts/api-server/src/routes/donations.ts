import { Router, type IRouter } from "express";
import { db, donationsTable, usersTable } from "@workspace/db";
import { eq, desc, sql, ilike, or } from "drizzle-orm";
import crypto from "crypto";
import {
  CreateDonationBody,
  GetDonationParams,
  DeleteDonationParams,
  VerifyDonationParams,
  ListDonationsQueryParams,
} from "@workspace/api-zod";
import { generateDonationHash, verifyDonationHash } from "../lib/hash";
import { createAuditLog } from "../lib/audit";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

function maskTransactionId(transactionId: string | null): string | null {
  if (!transactionId) return null;
  return `••••${transactionId.slice(-4)}`;
}

// Public — shown on dashboard
router.get("/donations", async (req, res): Promise<void> => {
  const params = ListDonationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { page = 1, limit = 20, collector_id, search } = params.data;
  const offset = (page - 1) * limit;

  const baseQuery = db
    .select({
      id: donationsTable.id,
      donationId: donationsTable.donationId,
      name: donationsTable.name,
      mobile: donationsTable.mobile,
      amount: donationsTable.amount,
      purpose: donationsTable.purpose,
      paymentMethod: donationsTable.paymentMethod,
      transactionId: donationsTable.transactionId,
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
  } else if (collector_id != null) {
    rows = await baseQuery
      .where(eq(donationsTable.collectorId, collector_id))
      .orderBy(desc(donationsTable.createdAt))
      .limit(limit)
      .offset(offset) as any;
  } else {
    rows = await baseQuery
      .orderBy(desc(donationsTable.createdAt))
      .limit(limit)
      .offset(offset) as any;
  }

  const totalQuery = db
    .select({ count: sql<number>`count(*)::int` })
    .from(donationsTable);
  const totalResult = search
    ? await totalQuery.where(
        or(
          ilike(donationsTable.name, `%${search}%`),
          ilike(donationsTable.mobile, `%${search}%`),
        ),
      )
    : collector_id != null
      ? await totalQuery.where(eq(donationsTable.collectorId, collector_id))
      : await totalQuery;

  const total = totalResult[0]?.count ?? 0;

  res.json({
    donations: (rows as any[]).map((d: any) => ({
      id: d.id,
      donationId: d.donationId,
      name: d.name,
       mobile: `******${d.mobile.slice(-4)}`,
      amount: parseFloat(d.amount),
      purpose: d.purpose ?? null,
       paymentMethod: d.paymentMethod,
       transactionId: maskTransactionId(d.transactionId),
      collectorId: d.collectorId ?? null,
      collectorName: d.collectorName ?? null,
      hash: d.hash,
       isVerified: verifyDonationHash(
         d.donationId,
         String(parseFloat(d.amount)),
         d.hash,
       ),
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    })),
    total,
    page,
    limit,
  });
});

// Collector+ required to add donations
router.post("/donations", requireAuth("collector"), async (req, res): Promise<void> => {
  const parsed = CreateDonationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    name,
    mobile,
    amount,
    purpose,
    paymentMethod = "cash",
  } = parsed.data;
  const transactionId = parsed.data.transactionId?.trim().toUpperCase() || null;

  if (paymentMethod === "upi" && !transactionId) {
    res.status(400).json({ error: "UPI payment के लिए transaction ID आवश्यक है।" });
    return;
  }

  if (paymentMethod === "cash" && transactionId) {
    res.status(400).json({ error: "Cash payment में transaction ID नहीं होनी चाहिए।" });
    return;
  }

  if (transactionId) {
    const existingTransaction = await db
      .select({ id: donationsTable.id })
      .from(donationsTable)
      .where(eq(donationsTable.transactionId, transactionId))
      .limit(1);

    if (existingTransaction.length > 0) {
      res.status(409).json({ error: "यह transaction ID पहले से दर्ज है। Duplicate entry नहीं बनाई गई।" });
      return;
    }
  }

  const collectorId = req.authUser!.id;
  const donationId = `DON${Date.now()}${crypto.randomInt(100, 1000)}`;
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
      paymentMethod,
      transactionId,
      collectorId: collectorId ?? null,
      hash,
    })
    .returning()
    .catch((error: unknown) => {
      if ((error as { code?: string })?.code === "23505" && transactionId) {
        res.status(409).json({ error: "यह transaction ID पहले से दर्ज है। Duplicate entry नहीं बनाई गई।" });
        return [];
      }
      throw error;
    });

  if (!donation) return;

  const collector = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, collectorId))
    .then((r) => r[0]);

  await createAuditLog({
    userId: collectorId,
    action: "DONATION_CREATED",
    details: `Donation ${donationId} of ₹${amount} by ${name} (collector: ${collector?.name ?? "unknown"})`,
    ipAddress: req.ip,
  });

  res.status(201).json({
    id: donation.id,
    donationId: donation.donationId,
    name: donation.name,
    mobile: donation.mobile,
    amount: parseFloat(donation.amount),
    purpose: donation.purpose ?? null,
    paymentMethod: donation.paymentMethod,
    transactionId: donation.transactionId,
    collectorId: donation.collectorId ?? null,
    collectorName: collector?.name ?? null,
    hash: donation.hash,
    isVerified: true,
    createdAt: donation.createdAt instanceof Date ? donation.createdAt.toISOString() : donation.createdAt,
  });
});

// Public — used by verify page
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
      paymentMethod: donationsTable.paymentMethod,
      transactionId: donationsTable.transactionId,
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
       mobile: `******${d.mobile.slice(-4)}`,
    amount: parseFloat(d.amount),
    purpose: d.purpose ?? null,
    paymentMethod: d.paymentMethod,
    transactionId: maskTransactionId(d.transactionId),
    collectorId: d.collectorId ?? null,
    collectorName: (d as any).collectorName ?? null,
    hash: d.hash,
    isVerified: verifyDonationHash(
      d.donationId,
      String(parseFloat(d.amount)),
      d.hash,
    ),
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
  });
});

// Admin+ required to delete
router.delete("/donations/:id", requireAuth("admin"), async (req, res): Promise<void> => {
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
    userId: req.authUser?.id,
    action: "DONATION_DELETED",
    details: `Donation ${deleted.donationId} deleted by ${req.authUser?.name ?? "Admin"}`,
    ipAddress: req.ip,
  });

  res.sendStatus(204);
});

// Public — QR verify page
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
      paymentMethod: donationsTable.paymentMethod,
      transactionId: donationsTable.transactionId,
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

  const normalizedAmount = String(parseFloat(d.amount));
  const isValid = verifyDonationHash(d.donationId, normalizedAmount, d.hash);

  res.json({
    valid: isValid,
    donation: {
      id: d.id,
      donationId: d.donationId,
      name: d.name,
       mobile: `******${d.mobile.slice(-4)}`,
      amount: parseFloat(d.amount),
      purpose: d.purpose ?? null,
      paymentMethod: d.paymentMethod,
      transactionId: maskTransactionId(d.transactionId),
      collectorId: d.collectorId ?? null,
      collectorName: (d as any).collectorName ?? null,
      hash: d.hash,
      isVerified: isValid,
      createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    },
    message: isValid
      ? "Receipt is authentic and verified"
      : "Receipt hash mismatch - possible tampering detected",
  });
});

export default router;
