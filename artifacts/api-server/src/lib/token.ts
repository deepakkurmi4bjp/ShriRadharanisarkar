import crypto from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { db, revokedTokensTable } from "@workspace/db";

const TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  process.env.TOKEN_SECRET ||
  "donation-platform-secret-key-2024";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const revokedTokens = new Set<string>();

export interface TokenPayload {
  userId: number;
  role: string;
  iat: number;
  exp: number;
}

function b64url(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function sign(data: string): string {
  return crypto.createHmac("sha256", TOKEN_SECRET).update(data).digest("hex");
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createToken(userId: number, role: string): string {
  const now = Date.now();
  const payload: TokenPayload = {
    userId,
    role,
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const data = b64url(JSON.stringify(payload));
  const sig = sign(data);
  return `${data}.${sig}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    if (revokedTokens.has(token)) return null;
    const dot = token.lastIndexOf(".");
    if (dot < 1) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = sign(data);
    const signature = Buffer.from(sig);
    const expectedSignature = Buffer.from(expected);
    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(signature, expectedSignature)
    ) {
      return null;
    }
    const payload = JSON.parse(
      Buffer.from(data, "base64").toString("utf-8"),
    ) as TokenPayload;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function verifyTokenWithRevocation(token: string): Promise<TokenPayload | null> {
  const payload = verifyToken(token);
  if (!payload) return null;

  try {
    const [revokedToken] = await db
      .select({ id: revokedTokensTable.id })
      .from(revokedTokensTable)
      .where(
        and(
          eq(revokedTokensTable.tokenHash, hashToken(token)),
          gt(revokedTokensTable.expiresAt, new Date()),
        ),
      )
      .limit(1);

    return revokedToken ? null : payload;
  } catch {
    // Authentication must fail closed if the revocation store is unavailable.
    return null;
  }
}

export async function revokeToken(token: string): Promise<void> {
  revokedTokens.add(token);

  await db
    .insert(revokedTokensTable)
    .values({
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    })
    .onConflictDoNothing({ target: revokedTokensTable.tokenHash });
}
