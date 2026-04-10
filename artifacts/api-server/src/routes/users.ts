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

  const [user] = await db.insert(usersTable).values(parsed.data).returning();

  await createAuditLog({
    action: "USER_CREATED",
    details: `User ${user.name} created with role ${user.role}`,
    ipAddress: req.ip,
  });

  res.status(201).json({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    isActive: user.isActive,
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

  const updateData: Partial<{ name: string; role: string; isActive: boolean }> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.role != null) updateData.role = parsed.data.role;
  if (parsed.data.isActive != null) updateData.isActive = parsed.data.isActive;

  const [user] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, params.data.id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await createAuditLog({
    action: "USER_UPDATED",
    details: `User ${user.name} updated`,
    ipAddress: req.ip,
  });

  res.json({
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    isActive: user.isActive,
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
    details: `User ${user.name} deleted`,
    ipAddress: req.ip,
  });

  res.sendStatus(204);
});

export default router;
