// Drizzle definitions for the Whop platform-payments tables.
// They are also created idempotently at startup (server/whopPlatform.ts). They must be declared
// here too, because `drizzle-kit push --force` on deploy drops any table missing from the schema.
import { sql } from "drizzle-orm";
import { pgTable, varchar, integer, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const whopPlatformAccounts = pgTable("whop_platform_accounts", {
  userId: varchar("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  whopAccountId: varchar("whop_account_id", { length: 64 }).notNull(),
  environment: varchar("environment", { length: 12 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const whopPlatformCheckouts = pgTable("whop_platform_checkouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 16 }).notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 80 }).notNull(),
  description: varchar("description", { length: 500 }),
  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("usd"),
  redirectUrl: varchar("redirect_url", { length: 500 }),
  buttonColor: varchar("button_color", { length: 7 }),
  webinarFunnelId: varchar("webinar_funnel_id"),
  buttonLabel: varchar("button_label", { length: 40 }),
  offerLive: boolean("offer_live").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ userIdx: index("idx_whop_platform_checkouts_user").on(t.userId) }));

export const whopPlatformPayments = pgTable("whop_platform_payments", {
  whopPaymentId: varchar("whop_payment_id", { length: 64 }).primaryKey(),
  checkoutId: varchar("checkout_id").notNull().references(() => whopPlatformCheckouts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  registrationId: varchar("registration_id"),
  amountCents: integer("amount_cents").notNull(),
  feeCents: integer("fee_cents").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 24 }).notNull(),
  refundedCents: integer("refunded_cents").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({ userIdx: index("idx_whop_platform_payments_user").on(t.userId) }));

export const whopPlatformEvents = pgTable("whop_platform_events", {
  webhookId: varchar("webhook_id", { length: 128 }).primaryKey(),
  type: varchar("type", { length: 64 }).notNull(),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
});

export const whopLogins = pgTable("whop_logins", {
  whopUserId: varchar("whop_user_id", { length: 64 }).primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
