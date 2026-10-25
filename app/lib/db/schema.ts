import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";

/**
 * Platform Settings: Persists dynamic fees, RPC URLs, banner settings, etc.
 */
export const platformSettingsTable = sqliteTable("platform_settings", {
  id: text("id").primaryKey(), // "default"
  settingsJson: text("settings_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/**
 * Partners Directory: Stores registered creator/VIP partners with tailored commission splits.
 */
export const partnersTable = sqliteTable(
  "partners",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    contactHandle: text("contact_handle").notNull(),
    platformUrl: text("platform_url").notNull(),
    audienceSize: text("audience_size").notNull(),
    slug: text("slug").notNull().unique(),
    payoutWallet: text("payout_wallet").notNull().unique(),
    status: text("status", { enum: ["pending", "approved", "rejected"] })
      .notNull()
      .default("pending"),
    tier: text("tier", { enum: ["referrer", "partner"] })
      .notNull()
      .default("partner"),
    customCommissionPercent: real("custom_commission_percent"),
    audienceDiscountPercent: real("audience_discount_percent"),
    clicks: integer("clicks").notNull().default(0),
    walletsConnected: integer("wallets_connected").notNull().default(0),
    conversionsCount: integer("conversions_count").notNull().default(0),
    totalVolumeSol: real("total_volume_sol").notNull().default(0.0),
    lifetimeEarningsSol: real("lifetime_earnings_sol").notNull().default(0.0),
    unclaimedBalanceSol: real("unclaimed_balance_sol").notNull().default(0.0),
    claimedPayoutsSol: real("claimed_payouts_sol").notNull().default(0.0),
    createdAt: text("created_at").notNull(),
    approvedAt: text("approved_at"),
    lastActiveAt: text("last_active_at"),
  },
  (table) => [
    index("partner_slug_idx").on(table.slug),
    index("partner_wallet_idx").on(table.payoutWallet),
    index("partner_status_idx").on(table.status),
  ]
);

/**
 * Conversions Ledger: Immutable audit trail of every paid transaction credited to a partner.
 */
export const partnerConversionsTable = sqliteTable(
  "partner_conversions",
  {
    id: text("id").primaryKey(),
    partnerId: text("partner_id")
      .notNull()
      .references(() => partnersTable.id),
    partnerSlug: text("partner_slug").notNull(),
    type: text("type").notNull(), // "token_create" | "revoke_authority" | "metadata_update" | "airdrop"
    userWallet: text("user_wallet").notNull(),
    txSignature: text("tx_signature"),
    totalFeeSol: real("total_fee_sol").notNull(),
    commissionSol: real("commission_sol").notNull(),
    commissionPercent: real("commission_percent").notNull(),
    timestamp: text("timestamp").notNull(),
  },
  (table) => [
    index("conversion_partner_idx").on(table.partnerId),
    index("conversion_slug_idx").on(table.partnerSlug),
    index("conversion_timestamp_idx").on(table.timestamp),
  ]
);

/**
 * Payout Claims: Self-serve withdrawal requests submitted by partners.
 */
export const partnerPayoutsTable = sqliteTable(
  "partner_payouts",
  {
    id: text("id").primaryKey(),
    partnerId: text("partner_id")
      .notNull()
      .references(() => partnersTable.id),
    partnerSlug: text("partner_slug").notNull(),
    payoutWallet: text("payout_wallet").notNull(),
    amountSol: real("amount_sol").notNull(),
    status: text("status", { enum: ["pending", "completed", "rejected"] })
      .notNull()
      .default("pending"),
    txSignature: text("tx_signature"),
    requestedAt: text("requested_at").notNull(),
    processedAt: text("processed_at"),
  },
  (table) => [
    index("payout_partner_idx").on(table.partnerId),
    index("payout_status_idx").on(table.status),
  ]
);
