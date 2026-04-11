import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createAuditLog } from "../lib/audit";
import { checkRateLimit, recordFailedAttempt, clearAttempts } from "../lib/rate-limiter";

const router: IRouter = Router();

function getClientKey(req: any): string {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const mobile = req.body?.mobile || "unknown";
  return `${ip}:${mobile}`;
}

function minutesLeft(ms: number): string {
  return Math.ceil(ms / 60000).toString();
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const { mobile, password } = req.body || {};

  if (!mobile || typeof mobile !== "string" || mobile.length < 10) {
    res.status(400).json({ error: "सही मोबाइल नंबर डालें।" });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 1) {
    res.status(400).json({ error: "पासवर्ड आवश्यक है।" });
    return;
  }
  const clientKey = getClientKey(req);

  const rateCheck = checkRateLimit(clientKey);
  if (!rateCheck.allowed) {
    const mins = minutesLeft(rateCheck.remainingMs!);
    await createAuditLog({
      action: "LOGIN_BLOCKED",
      details: `Rate limit exceeded for mobile ${mobile}. Locked for ${mins} more minute(s).`,
      ipAddress: req.ip,
    });
    res.status(429).json({
      error: `बहुत अधिक गलत प्रयास। ${mins} मिनट बाद दोबारा कोशिश करें।`,
    });
    return;
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.mobile, mobile)).then(r => r[0]);

  if (!user) {
    const result = recordFailedAttempt(clientKey);
    await createAuditLog({
      action: "LOGIN_FAILED",
      details: `Login attempt with unregistered mobile: ${mobile}`,
      ipAddress: req.ip,
    });
    const attemptsMsg = result.locked
      ? "15 मिनट के लिए account block हो गया।"
      : `${result.attemptsLeft} प्रयास शेष।`;
    res.status(401).json({ error: `गलत मोबाइल नंबर या पासवर्ड। ${attemptsMsg}` });
    return;
  }

  if (!user.password) {
    const result = recordFailedAttempt(clientKey);
    await createAuditLog({
      action: "LOGIN_FAILED",
      details: `User ${user.name} has no password set, access denied.`,
      ipAddress: req.ip,
    });
    res.status(401).json({ error: "इस account का पासवर्ड सेट नहीं है। Super Admin से संपर्क करें।" });
    return;
  }

  if (password !== user.password) {
    const result = recordFailedAttempt(clientKey);
    await createAuditLog({
      action: "LOGIN_FAILED",
      details: `Wrong password attempt for user ${user.name} (${user.mobile})`,
      ipAddress: req.ip,
    });
    const attemptsMsg = result.locked
      ? " 15 मिनट के लिए account block हो गया।"
      : ` ${result.attemptsLeft} प्रयास शेष।`;
    res.status(401).json({ error: `गलत पासवर्ड।${attemptsMsg}` });
    return;
  }

  if (!user.isActive) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      details: `Inactive account login attempt: ${user.name} (${user.mobile})`,
      ipAddress: req.ip,
    });
    res.status(401).json({ error: "यह account निष्क्रिय कर दिया गया है। Super Admin से संपर्क करें।" });
    return;
  }

  if (user.isSuspended) {
    await createAuditLog({
      action: "LOGIN_FAILED",
      details: `Suspended account login attempt: ${user.name} (${user.mobile})`,
      ipAddress: req.ip,
    });
    res.status(401).json({ error: "यह account निलंबित (Suspended) है। Super Admin से संपर्क करें।" });
    return;
  }

  clearAttempts(clientKey);

  const token = Buffer.from(JSON.stringify({ userId: user.id, role: user.role })).toString("base64");

  await createAuditLog({
    userId: user.id,
    action: "LOGIN",
    details: `${user.name} (${user.role}) successfully logged in`,
    ipAddress: req.ip,
  });

  res.json({
    user: {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8")) as { userId: number; role: string };
    const user = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).then(r => r[0]);

    if (!user || !user.isActive || user.isSuspended) {
      res.status(401).json({ error: "Access denied" });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      role: user.role,
      isActive: user.isActive,
      isSuspended: user.isSuspended,
      createdAt: user.createdAt.toISOString(),
    });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
