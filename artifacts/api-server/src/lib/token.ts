import crypto from "crypto";

const TOKEN_SECRET =
  process.env.SESSION_SECRET ||
  process.env.TOKEN_SECRET ||
  "donation-platform-secret-key-2024";

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

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
    const dot = token.lastIndexOf(".");
    if (dot < 1) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = sign(data);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
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
