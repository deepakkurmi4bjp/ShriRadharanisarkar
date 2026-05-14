import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/token";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthUser {
  id: number;
  name: string;
  role: string;
}

declare module "express" {
  interface Request {
    authUser?: AuthUser;
  }
}

type Role = "super_admin" | "admin" | "collector" | "public";

const ROLE_RANK: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  collector: 2,
  public: 1,
};

export function requireAuth(minRole: Role = "collector") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const user = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .then((r) => r[0]);

    if (!user || !user.isActive || user.isSuspended) {
      res.status(401).json({ error: "Account is inactive or suspended" });
      return;
    }

    if ((ROLE_RANK[user.role] ?? 0) < (ROLE_RANK[minRole] ?? 0)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    req.authUser = { id: user.id, name: user.name, role: user.role };
    next();
  };
}
