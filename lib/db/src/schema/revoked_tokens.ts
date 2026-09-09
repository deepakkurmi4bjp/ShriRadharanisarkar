import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const revokedTokensTable = pgTable(
  "revoked_tokens",
  {
    id: serial("id").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("revoked_tokens_token_hash_unique").on(table.tokenHash),
  }),
);

export type RevokedToken = typeof revokedTokensTable.$inferSelect;