import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  username: text("username"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  goal: decimal("goal", { precision: 18, scale: 8 }).notNull(),
  raised: decimal("raised", { precision: 18, scale: 8 }).default("0"),
  creator: text("creator").notNull(),
  contractAddress: text("contract_address"),
  imageUrl: text("image_url"),
  duration: integer("duration").notNull(), // in days
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(true),
  acceptedTokens: text("accepted_tokens").array().default(["ETH", "USDC"]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  donor: text("donor").notNull(),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  token: text("token").notNull(),
  txHash: text("tx_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  raised: true,
  contractAddress: true,
  createdAt: true,
});

export const insertDonationSchema = createInsertSchema(donations).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;
export type Donation = typeof donations.$inferSelect;
