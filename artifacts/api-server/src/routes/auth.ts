import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody } from "@workspace/api-zod";
import { createAuditLog } from "../lib/audit";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { mobile, role, name, password } = parsed.data;

  let user = await db.select().from(usersTable).where(eq(usersTable.mobile, mobile)).then(r => r[0]);

  if (!user) {
    if (password) {
      res.status(401).json({ error: "गलत मोबाइल नंबर या पासवर्ड" });
      return;
    }
    const [created] = await db.insert(usersTable).values({ name, mobile, role }).returning();
    user = created;
  } else {
    if (user.password) {
      if (!password || password !== user.password) {
        res.status(401).json({ error: "गलत पासवर्ड। कृपया सही पासवर्ड डालें।" });
        return;
      }
    }
  }

  if (!user.isActive) {
    res.status(401).json({ error: "यह account निष्क्रिय कर दिया गया है।" });
    return;
  }

  if (user.isSuspended) {
    res.status(401).json({ error: "यह account निलंबित (Suspended) है। Super Admin से संपर्क करें।" });
    return;
  }

  const token = Buffer.from(JSON.stringify({ userId: user.id, role: user.role })).toString("base64");

  req.session = req.session || {};
  (req as any).session.userId = user.id;
  (req as any).session.role = user.role;

  await createAuditLog({
    userId: user.id,
    action: "LOGIN",
    details: `User ${user.name} logged in as ${user.role}`,
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

    if (!user) {
      res.status(401).json({ error: "User not found" });
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
