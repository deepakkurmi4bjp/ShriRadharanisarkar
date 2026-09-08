import { db, otpCodesTable } from "@workspace/db";
import { eq, and, gt, desc } from "drizzle-orm";
import crypto from "crypto";

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function createOtp(userId: number): Promise<string> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any existing unused OTPs for this user
  await db
    .update(otpCodesTable)
    .set({ used: true })
    .where(and(eq(otpCodesTable.userId, userId), eq(otpCodesTable.used, false)));

  await db.insert(otpCodesTable).values({ userId, code: hashOtp(code), expiresAt });
  return code;
}

export async function verifyOtp(userId: number, code: string): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .select()
    .from(otpCodesTable)
    .where(
      and(
        eq(otpCodesTable.userId, userId),
        eq(otpCodesTable.used, false),
        gt(otpCodesTable.expiresAt, now),
      ),
    )
    .orderBy(desc(otpCodesTable.createdAt));

  if (rows.length === 0) return false;

  const storedCode = rows[0].code;
  const expectedHash = hashOtp(code);
  const isHashMatch =
    storedCode.length === expectedHash.length &&
    crypto.timingSafeEqual(Buffer.from(storedCode), Buffer.from(expectedHash));
  // Accept pre-existing six-digit records once so deployments can rotate
  // without invalidating an OTP already sent before this fix.
  const isLegacyMatch = storedCode.length === 6 && storedCode === code;
  if (!isHashMatch && !isLegacyMatch) return false;

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, rows[0].id));
  return true;
}
