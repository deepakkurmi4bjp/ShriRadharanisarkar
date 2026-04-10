import crypto from "crypto";

const SECRET_KEY = process.env.SESSION_SECRET || "donation-platform-secret-key-2024";

export function generateDonationHash(donationId: string, amount: string): string {
  const data = JSON.stringify({ id: donationId, amount });
  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(data)
    .digest("hex");
}

export function verifyDonationHash(donationId: string, amount: string, hash: string): boolean {
  const expected = generateDonationHash(donationId, amount);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(hash));
}
