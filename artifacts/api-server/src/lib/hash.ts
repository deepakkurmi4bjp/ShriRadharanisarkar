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
  const actual = Buffer.from(hash);
  const expectedBuffer = Buffer.from(expected);
  return (
    actual.length === expectedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actual)
  );
}
