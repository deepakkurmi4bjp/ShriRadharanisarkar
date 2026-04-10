import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const donationsTable = pgTable("donations", {
  id: serial("id").primaryKey(),
  donationId: text("donation_id").notNull().unique(),
  name: text("name").notNull(),
  mobile: text("mobile").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  purpose: text("purpose"),
  collectorId: integer("collector_id").references(() => usersTable.id),
  hash: text("hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDonationSchema = createInsertSchema(donationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donationsTable.$inferSelect;
