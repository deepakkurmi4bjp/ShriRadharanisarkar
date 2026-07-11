import { db, otpCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtp(userId: number): Promise<string> {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any existing unused OTPs for this user
  await db
    .update(otpCodesTable)
    .set({ used: true })
    .where(and(eq(otpCodesTable.userId, userId), eq(otpCodesTable.used, false)));

  await db.insert(otpCodesTable).values({ userId, code, expiresAt });
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
        eq(otpCodesTable.code, code),
        eq(otpCodesTable.used, false),
        gt(otpCodesTable.expiresAt, now),
      ),
    );

  if (rows.length === 0) return false;

  await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, rows[0].id));
  return true;
}
