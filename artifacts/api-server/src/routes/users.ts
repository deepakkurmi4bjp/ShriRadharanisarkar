import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateUserBody, UpdateUserBody, UpdateUserParams, DeleteUserParams } from "@workspace/api-zod";
import { createAuditLog } from "../lib/audit";

const router: IRouter = Router();

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(
    users.map(u => ({
      id: u.id,
      name: u.name,
      mobile: u.mobile,
      role: u.role,
      isActive: u.isActive,
      isSuspended: u.isSuspended,
      createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
    }))
  );
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.mobile, parsed.data.mobile)).then(r => r[0]);
  if (existing) {
    res.status(409).json({ error: "इस मोबाइल नंबर से पहले से account मौजूद है।" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    name: parsed.data.name,
    mobile: parsed.data.mobile,
    role: parsed.data.role,
    password: parsed.data.password ?? null,
  }).returning();

  await createAuditLog({
    action: "USER_CREATED",
    details: `User ${user.name} created with role ${user.role} by Super Admin`,
    ipAddress: req.ip,
  });

  res.status(201).json({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    isActive: user.isActive,
    isSuspended: user.isSuspended,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  });
});

router.patch("/users/:id", async (req, res): Promise<void> => {
  const params = UpdateUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Partial<{ name: string; role: string; isActive: boolean; isSuspended: boolean }> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.role != null) updateData.role = parsed.data.role;
  if (parsed.data.isActive != null) updateData.isActive = parsed.data.isActive;
  if (parsed.data.isSuspended != null) updateData.isSuspended = parsed.data.isSuspended;

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const action = parsed.data.isSuspended != null
    ? (parsed.data.isSuspended ? "USER_SUSPENDED" : "USER_UNSUSPENDED")
    : "USER_UPDATED";

  await createAuditLog({
    action,
    details: `User ${user.name} ${action.toLowerCase().replace("_", " ")}`,
    ipAddress: req.ip,
  });

  res.json({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    isActive: user.isActive,
    isSuspended: user.isSuspended,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  });
});

router.delete("/users/:id", async (req, res): Promise<void> => {
  const params = DeleteUserParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [user] = await db.delete(usersTable).where(eq(usersTable.id, params.data.id)).returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await createAuditLog({
    action: "USER_DELETED",
    details: `User ${user.name} permanently deleted by Super Admin`,
    ipAddress: req.ip,
  });

  res.sendStatus(204);
});

export default router;
