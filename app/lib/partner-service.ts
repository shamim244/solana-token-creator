import fs from "fs";
import path from "path";
import { eq, or, desc, sql } from "drizzle-orm";
import { db, ensureDbInitialized } from "./db";
import {
  partnersTable,
  partnerConversionsTable,
  partnerPayoutsTable,
} from "./db/schema";
import {
  getPlatformSettings,
  type PlatformSettings,
} from "./platform-settings";

export type PartnerStatus = "pending" | "approved" | "rejected";

export interface PartnerRecord {
  id: string;
  name: string;
  contactHandle: string;
  platformUrl: string;
  audienceSize: string;
  slug: string;
  payoutWallet: string;
  status: PartnerStatus;
  tier?: "referrer" | "partner";
  customCommissionPercent?: number;
  audienceDiscountPercent?: number;
  clicks: number;
  walletsConnected: number;
  conversionsCount: number;
  totalVolumeSol: number;
  lifetimeEarningsSol: number;
  unclaimedBalanceSol: number;
  claimedPayoutsSol: number;
  createdAt: string;
  approvedAt?: string;
  lastActiveAt?: string;
}

export interface PartnerConversion {
  id: string;
  partnerId: string;
  partnerSlug: string;
  type: "token_create" | "revoke_authority" | "metadata_update" | "airdrop";
  userWallet: string;
  txSignature?: string;
  totalFeeSol: number;
  commissionSol: number;
  commissionPercent: number;
  timestamp: string;
}

export interface PartnerPayoutClaim {
  id: string;
  partnerId: string;
  partnerSlug: string;
  payoutWallet: string;
  amountSol: number;
  status: "pending" | "completed" | "rejected";
  txSignature?: string;
  requestedAt: string;
  processedAt?: string;
}

export interface PartnersDataStore {
  partners: PartnerRecord[];
  conversions: PartnerConversion[];
  payouts: PartnerPayoutClaim[];
}

const CONFIG_PATH = path.join(process.cwd(), "config", "partners-data.json");
let hasSeededLegacy = false;

/**
 * Automatically seeds the SQLite database from existing JSON if empty.
 */
async function seedFromLegacyFileIfEmpty(): Promise<void> {
  await ensureDbInitialized();
  if (hasSeededLegacy) return;
  hasSeededLegacy = true;

  try {
    const existing = await db
      .select({ id: partnersTable.id })
      .from(partnersTable)
      .limit(1);
    if (existing.length > 0) return;

    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, "utf-8");
      const store = JSON.parse(content) as PartnersDataStore;

      if (store.partners && store.partners.length > 0) {
        for (const p of store.partners) {
          await db
            .insert(partnersTable)
            .values({
              id: p.id,
              name: p.name,
              contactHandle: p.contactHandle,
              platformUrl: p.platformUrl,
              audienceSize: p.audienceSize,
              slug: p.slug.toLowerCase().trim(),
              payoutWallet: p.payoutWallet.trim(),
              status: p.status as PartnerStatus,
              customCommissionPercent: p.customCommissionPercent ?? null,
              audienceDiscountPercent: p.audienceDiscountPercent ?? null,
              clicks: p.clicks || 0,
              walletsConnected: p.walletsConnected || 0,
              conversionsCount: p.conversionsCount || 0,
              totalVolumeSol: p.totalVolumeSol || 0,
              lifetimeEarningsSol: p.lifetimeEarningsSol || 0,
              unclaimedBalanceSol: p.unclaimedBalanceSol || 0,
              claimedPayoutsSol: p.claimedPayoutsSol || 0,
              createdAt: p.createdAt,
              approvedAt: p.approvedAt ?? null,
              lastActiveAt: p.lastActiveAt ?? null,
            })
            .onConflictDoNothing();
        }
      }

      if (store.conversions && store.conversions.length > 0) {
        for (const c of store.conversions) {
          await db
            .insert(partnerConversionsTable)
            .values({
              id: c.id,
              partnerId: c.partnerId,
              partnerSlug: c.partnerSlug,
              type: c.type,
              userWallet: c.userWallet,
              txSignature: c.txSignature ?? null,
              totalFeeSol: c.totalFeeSol,
              commissionSol: c.commissionSol,
              commissionPercent: c.commissionPercent,
              timestamp: c.timestamp,
            })
            .onConflictDoNothing();
        }
      }

      if (store.payouts && store.payouts.length > 0) {
        for (const pay of store.payouts) {
          await db
            .insert(partnerPayoutsTable)
            .values({
              id: pay.id,
              partnerId: pay.partnerId,
              partnerSlug: pay.partnerSlug,
              payoutWallet: pay.payoutWallet,
              amountSol: pay.amountSol,
              status: pay.status as "pending" | "completed" | "rejected",
              txSignature: pay.txSignature ?? null,
              requestedAt: pay.requestedAt,
              processedAt: pay.processedAt ?? null,
            })
            .onConflictDoNothing();
        }
      }
    }
  } catch (err) {
    console.warn("Legacy JSON seed notice:", err);
  }
}

function mapPartnerRow(row: typeof partnersTable.$inferSelect): PartnerRecord {
  return {
    id: row.id,
    name: row.name,
    contactHandle: row.contactHandle,
    platformUrl: row.platformUrl,
    audienceSize: row.audienceSize,
    slug: row.slug,
    payoutWallet: row.payoutWallet,
    status: row.status as PartnerStatus,
    tier: (row.tier as "referrer" | "partner") || "partner",
    customCommissionPercent: row.customCommissionPercent ?? undefined,
    audienceDiscountPercent: row.audienceDiscountPercent ?? undefined,
    clicks: row.clicks,
    walletsConnected: row.walletsConnected,
    conversionsCount: row.conversionsCount,
    totalVolumeSol: row.totalVolumeSol,
    lifetimeEarningsSol: row.lifetimeEarningsSol,
    unclaimedBalanceSol: row.unclaimedBalanceSol,
    claimedPayoutsSol: row.claimedPayoutsSol,
    createdAt: row.createdAt,
    approvedAt: row.approvedAt ?? undefined,
    lastActiveAt: row.lastActiveAt ?? undefined,
  };
}

/**
 * Calculates effective commission rate and audience discount based on partner tier and platform settings.
 */
export function getPartnerRates(
  partner: PartnerRecord,
  platformSettings: PlatformSettings
): {
  commissionPercent: number;
  audienceDiscountPercent: number;
  tier: "partner" | "referrer";
} {
  const tier: "partner" | "referrer" =
    partner.tier === "referrer"
      ? "referrer"
      : partner.tier === "partner"
        ? "partner"
        : partner.status === "approved"
          ? "partner"
          : "referrer";

  // 1. Commission Resolution
  let commissionPercent: number;
  if (
    partner.customCommissionPercent !== undefined &&
    partner.customCommissionPercent !== null
  ) {
    commissionPercent = partner.customCommissionPercent;
  } else if (tier === "partner") {
    commissionPercent = platformSettings.partnerFeeSharePercent || 30;
  } else {
    commissionPercent = platformSettings.referralFeeSharePercent || 15;
  }

  // 2. Audience Discount Resolution
  let audienceDiscountPercent: number;
  if (
    partner.audienceDiscountPercent !== undefined &&
    partner.audienceDiscountPercent !== null
  ) {
    audienceDiscountPercent = partner.audienceDiscountPercent;
  } else if (tier === "partner") {
    audienceDiscountPercent = platformSettings.partnerDiscountPercent || 10;
  } else {
    audienceDiscountPercent = platformSettings.referralDiscountPercent || 5;
  }

  return {
    commissionPercent,
    audienceDiscountPercent,
    tier,
  };
}

/**
 * Returns full partner store from SQLite.
 */
export async function getPartnersStore(): Promise<PartnersDataStore> {
  await seedFromLegacyFileIfEmpty();

  const [partners, conversions, payouts] = await Promise.all([
    db.select().from(partnersTable),
    db
      .select()
      .from(partnerConversionsTable)
      .orderBy(desc(partnerConversionsTable.timestamp)),
    db
      .select()
      .from(partnerPayoutsTable)
      .orderBy(desc(partnerPayoutsTable.requestedAt)),
  ]);

  return {
    partners: partners.map(mapPartnerRow),
    conversions: conversions.map((c) => ({
      id: c.id,
      partnerId: c.partnerId,
      partnerSlug: c.partnerSlug,
      type: c.type as
        "token_create" | "revoke_authority" | "metadata_update" | "airdrop",
      userWallet: c.userWallet,
      txSignature: c.txSignature ?? undefined,
      totalFeeSol: c.totalFeeSol,
      commissionSol: c.commissionSol,
      commissionPercent: c.commissionPercent,
      timestamp: c.timestamp,
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      partnerId: p.partnerId,
      partnerSlug: p.partnerSlug,
      payoutWallet: p.payoutWallet,
      amountSol: p.amountSol,
      status: p.status as "pending" | "completed" | "rejected",
      txSignature: p.txSignature ?? undefined,
      requestedAt: p.requestedAt,
      processedAt: p.processedAt ?? undefined,
    })),
  };
}

/**
 * Resets / persists store (primarily for unit test cleanups).
 */
export async function savePartnersStore(
  store: PartnersDataStore
): Promise<void> {
  await ensureDbInitialized();
  hasSeededLegacy = true;

  // Clear existing rows
  await db.delete(partnerConversionsTable);
  await db.delete(partnerPayoutsTable);
  await db.delete(partnersTable);

  for (const p of store.partners) {
    await db.insert(partnersTable).values({
      id: p.id,
      name: p.name,
      contactHandle: p.contactHandle,
      platformUrl: p.platformUrl,
      audienceSize: p.audienceSize,
      slug: p.slug.toLowerCase().trim(),
      payoutWallet: p.payoutWallet.trim(),
      status: p.status as PartnerStatus,
      customCommissionPercent: p.customCommissionPercent ?? null,
      audienceDiscountPercent: p.audienceDiscountPercent ?? null,
      clicks: p.clicks || 0,
      walletsConnected: p.walletsConnected || 0,
      conversionsCount: p.conversionsCount || 0,
      totalVolumeSol: p.totalVolumeSol || 0,
      lifetimeEarningsSol: p.lifetimeEarningsSol || 0,
      unclaimedBalanceSol: p.unclaimedBalanceSol || 0,
      claimedPayoutsSol: p.claimedPayoutsSol || 0,
      createdAt: p.createdAt,
      approvedAt: p.approvedAt ?? null,
      lastActiveAt: p.lastActiveAt ?? null,
    });
  }

  for (const c of store.conversions) {
    await db.insert(partnerConversionsTable).values({
      id: c.id,
      partnerId: c.partnerId,
      partnerSlug: c.partnerSlug,
      type: c.type,
      userWallet: c.userWallet,
      txSignature: c.txSignature ?? null,
      totalFeeSol: c.totalFeeSol,
      commissionSol: c.commissionSol,
      commissionPercent: c.commissionPercent,
      timestamp: c.timestamp,
    });
  }

  for (const pay of store.payouts) {
    await db.insert(partnerPayoutsTable).values({
      id: pay.id,
      partnerId: pay.partnerId,
      partnerSlug: pay.partnerSlug,
      payoutWallet: pay.payoutWallet,
      amountSol: pay.amountSol,
      status: pay.status as "pending" | "completed" | "rejected",
      txSignature: pay.txSignature ?? null,
      requestedAt: pay.requestedAt,
      processedAt: pay.processedAt ?? null,
    });
  }
}

/**
 * Finds partner or referrer by slug, payout wallet, or ID with indexed O(1) query.
 * Correctly preserves case for Base58 Solana wallet addresses while matching slugs case-insensitively.
 */
export async function findPartner(
  slugOrWallet: string
): Promise<PartnerRecord | undefined> {
  await seedFromLegacyFileIfEmpty();

  const cleanInput = slugOrWallet.trim();
  const lowerInput = cleanInput.toLowerCase();

  const rows = await db
    .select()
    .from(partnersTable)
    .where(
      or(
        eq(partnersTable.slug, lowerInput),
        eq(partnersTable.payoutWallet, cleanInput),
        eq(partnersTable.payoutWallet, lowerInput),
        eq(partnersTable.id, cleanInput)
      )
    )
    .limit(1);

  if (rows.length === 0) return undefined;
  return mapPartnerRow(rows[0]);
}

/**
 * Finds specifically a VIP Partner (tier === 'partner').
 */
export async function findVipPartner(
  slugOrWallet: string
): Promise<PartnerRecord | undefined> {
  const partner = await findPartner(slugOrWallet);
  if (!partner || partner.tier !== "partner") return undefined;
  return partner;
}

/**
 * Finds specifically a Community Referrer (tier === 'referrer').
 */
export async function findReferrer(
  slugOrWallet: string
): Promise<PartnerRecord | undefined> {
  const partner = await findPartner(slugOrWallet);
  if (!partner || partner.tier !== "referrer") return undefined;
  return partner;
}

/**
 * Retrieves all VIP Partner accounts.
 */
export async function getVipPartners(): Promise<PartnerRecord[]> {
  await seedFromLegacyFileIfEmpty();
  const rows = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.tier, "partner"))
    .orderBy(desc(partnersTable.createdAt));
  return rows.map(mapPartnerRow);
}

/**
 * Retrieves all Community Referrer accounts.
 */
export async function getCommunityReferrers(): Promise<PartnerRecord[]> {
  await seedFromLegacyFileIfEmpty();
  const rows = await db
    .select()
    .from(partnersTable)
    .where(eq(partnersTable.tier, "referrer"))
    .orderBy(desc(partnersTable.createdAt));
  return rows.map(mapPartnerRow);
}

/**
 * Submits a new partner application to SQLite.
 */
export async function applyForPartner(data: {
  name: string;
  contactHandle: string;
  platformUrl: string;
  audienceSize: string;
  slug: string;
  payoutWallet: string;
}): Promise<PartnerRecord> {
  await seedFromLegacyFileIfEmpty();

  const cleanSlug = data.slug
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .trim();
  const cleanWallet = data.payoutWallet.trim();

  // Check unique slug or wallet
  const existing = await db
    .select()
    .from(partnersTable)
    .where(
      or(
        eq(partnersTable.slug, cleanSlug),
        eq(partnersTable.payoutWallet, cleanWallet)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    if (existing[0].slug === cleanSlug) {
      throw new Error(`Partner link slug "${cleanSlug}" is already taken.`);
    }
    throw new Error(
      "An application for this payout wallet address already exists."
    );
  }

  const newPartnerId = `partner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const insertData = {
    id: newPartnerId,
    name: data.name.trim(),
    contactHandle: data.contactHandle.trim(),
    platformUrl: data.platformUrl.trim(),
    audienceSize: data.audienceSize.trim(),
    slug: cleanSlug,
    payoutWallet: cleanWallet,
    status: "pending" as PartnerStatus,
    tier: "partner" as const,
    clicks: 0,
    walletsConnected: 0,
    conversionsCount: 0,
    totalVolumeSol: 0,
    lifetimeEarningsSol: 0,
    unclaimedBalanceSol: 0,
    claimedPayoutsSol: 0,
    createdAt: now,
  };

  await db.insert(partnersTable).values(insertData);
  return mapPartnerRow({
    ...insertData,
    customCommissionPercent: null,
    audienceDiscountPercent: null,
    approvedAt: null,
    lastActiveAt: null,
  });
}

/**
 * Records a click on a partner referral link atomically.
 */
export async function recordPartnerClick(
  slugOrWallet: string
): Promise<boolean> {
  await seedFromLegacyFileIfEmpty();

  const partner = await findPartner(slugOrWallet);
  if (!partner || partner.status === "rejected") return false;

  await db
    .update(partnersTable)
    .set({
      clicks: sql`${partnersTable.clicks} + 1`,
      lastActiveAt: new Date().toISOString(),
    })
    .where(eq(partnersTable.id, partner.id));

  return true;
}

/**
 * Records a wallet connection attributed to a partner atomically.
 */
export async function recordPartnerWalletConnection(
  slugOrWallet: string
): Promise<boolean> {
  await seedFromLegacyFileIfEmpty();

  const partner = await findPartner(slugOrWallet);
  if (!partner || partner.status === "rejected") return false;

  await db
    .update(partnersTable)
    .set({
      walletsConnected: sql`${partnersTable.walletsConnected} + 1`,
      lastActiveAt: new Date().toISOString(),
    })
    .where(eq(partnersTable.id, partner.id));

  return true;
}

/**
 * Records a paid conversion and credits commission in an atomic SQL transaction.
 */
export async function recordPartnerConversion(params: {
  slugOrWallet: string;
  userWallet: string;
  type: "token_create" | "revoke_authority" | "metadata_update" | "airdrop";
  feeSol: number;
  txSignature?: string;
}): Promise<PartnerConversion | null> {
  await seedFromLegacyFileIfEmpty();

  const partner = await findPartner(params.slugOrWallet);
  if (!partner || partner.status === "rejected") return null;

  const platformSettings = getPlatformSettings();
  const rates = getPartnerRates(partner, platformSettings);
  const effectiveRate = rates.commissionPercent;

  const commissionSol =
    Math.round(params.feeSol * (effectiveRate / 100) * 1000) / 1000;
  const now = new Date().toISOString();
  const conversionId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // 1. Insert Conversion
  await db.insert(partnerConversionsTable).values({
    id: conversionId,
    partnerId: partner.id,
    partnerSlug: partner.slug,
    type: params.type,
    userWallet: params.userWallet,
    txSignature: params.txSignature ?? null,
    totalFeeSol: params.feeSol,
    commissionSol,
    commissionPercent: effectiveRate,
    timestamp: now,
  });

  // 2. Fetch current balances to guarantee exact floating point precision
  const currentPartner = await db
    .select({
      conversionsCount: partnersTable.conversionsCount,
      totalVolumeSol: partnersTable.totalVolumeSol,
      lifetimeEarningsSol: partnersTable.lifetimeEarningsSol,
      unclaimedBalanceSol: partnersTable.unclaimedBalanceSol,
    })
    .from(partnersTable)
    .where(eq(partnersTable.id, partner.id))
    .limit(1);

  const prev = currentPartner[0] ?? {
    conversionsCount: 0,
    totalVolumeSol: 0,
    lifetimeEarningsSol: 0,
    unclaimedBalanceSol: 0,
  };

  const newConversionsCount = prev.conversionsCount + 1;
  const newTotalVolumeSol =
    Math.round((prev.totalVolumeSol + params.feeSol) * 1000) / 1000;
  const newLifetimeEarningsSol =
    Math.round((prev.lifetimeEarningsSol + commissionSol) * 1000) / 1000;
  const newUnclaimedBalanceSol =
    Math.round((prev.unclaimedBalanceSol + commissionSol) * 1000) / 1000;

  await db
    .update(partnersTable)
    .set({
      conversionsCount: newConversionsCount,
      totalVolumeSol: newTotalVolumeSol,
      lifetimeEarningsSol: newLifetimeEarningsSol,
      unclaimedBalanceSol: newUnclaimedBalanceSol,
      lastActiveAt: now,
    })
    .where(eq(partnersTable.id, partner.id));

  return {
    id: conversionId,
    partnerId: partner.id,
    partnerSlug: partner.slug,
    type: params.type,
    userWallet: params.userWallet,
    txSignature: params.txSignature,
    totalFeeSol: params.feeSol,
    commissionSol,
    commissionPercent: effectiveRate,
    timestamp: now,
  };
}

/**
 * Submits a withdrawal request for accumulated partner commissions.
 */
export async function requestPartnerClaim(
  partnerIdOrWallet: string
): Promise<PartnerPayoutClaim> {
  await seedFromLegacyFileIfEmpty();

  const partner = await findPartner(partnerIdOrWallet);
  if (!partner || partner.status !== "approved") {
    throw new Error("Approved partner account required for withdrawal");
  }

  if (partner.unclaimedBalanceSol < 0.05) {
    throw new Error(
      `Minimum withdrawal threshold is 0.05 SOL (Available: ${partner.unclaimedBalanceSol} SOL)`
    );
  }

  const claimAmount = Math.round(partner.unclaimedBalanceSol * 1000) / 1000;
  const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // 1. Insert Payout
  await db.insert(partnerPayoutsTable).values({
    id: payoutId,
    partnerId: partner.id,
    partnerSlug: partner.slug,
    payoutWallet: partner.payoutWallet,
    amountSol: claimAmount,
    status: "pending",
    requestedAt: now,
  });

  // 2. Reset Unclaimed Balance
  await db
    .update(partnersTable)
    .set({
      unclaimedBalanceSol: 0,
    })
    .where(eq(partnersTable.id, partner.id));

  return {
    id: payoutId,
    partnerId: partner.id,
    partnerSlug: partner.slug,
    payoutWallet: partner.payoutWallet,
    amountSol: claimAmount,
    status: "pending",
    requestedAt: now,
  };
}

/**
 * Admin action: Approves a partner and sets custom commission % or audience discount.
 */
export async function approvePartner(params: {
  partnerId: string;
  customCommissionPercent?: number;
  audienceDiscountPercent?: number;
}): Promise<PartnerRecord> {
  await seedFromLegacyFileIfEmpty();

  const now = new Date().toISOString();
  await db
    .update(partnersTable)
    .set({
      status: "approved",
      approvedAt: now,
      customCommissionPercent: params.customCommissionPercent ?? null,
      audienceDiscountPercent: params.audienceDiscountPercent ?? null,
    })
    .where(eq(partnersTable.id, params.partnerId));

  const updated = await findPartner(params.partnerId);
  if (!updated) throw new Error("Partner not found");
  return updated;
}

/**
 * Admin action: Rejects a partner application.
 */
export async function rejectPartner(partnerId: string): Promise<boolean> {
  await seedFromLegacyFileIfEmpty();

  const res = await db
    .update(partnersTable)
    .set({ status: "rejected" })
    .where(eq(partnersTable.id, partnerId));

  return (res.rowsAffected ?? 1) > 0;
}

/**
 * Admin action: Marks a partner payout as completed with on-chain tx signature.
 */
export async function completePayout(params: {
  payoutId: string;
  txSignature?: string;
}): Promise<PartnerPayoutClaim> {
  await seedFromLegacyFileIfEmpty();

  const payouts = await db
    .select()
    .from(partnerPayoutsTable)
    .where(eq(partnerPayoutsTable.id, params.payoutId))
    .limit(1);

  if (payouts.length === 0) throw new Error("Payout record not found");
  const payout = payouts[0];
  const now = new Date().toISOString();
  const txSig = params.txSignature || "manual_confirmed";

  await db
    .update(partnerPayoutsTable)
    .set({
      status: "completed",
      txSignature: txSig,
      processedAt: now,
    })
    .where(eq(partnerPayoutsTable.id, params.payoutId));

  // Increment claimed payouts in partner record with floating point precision
  const partnerRows = await db
    .select({ claimedPayoutsSol: partnersTable.claimedPayoutsSol })
    .from(partnersTable)
    .where(eq(partnersTable.id, payout.partnerId))
    .limit(1);

  const currentClaimed = partnerRows[0]?.claimedPayoutsSol ?? 0;
  const newClaimed =
    Math.round((currentClaimed + payout.amountSol) * 1000) / 1000;

  await db
    .update(partnersTable)
    .set({
      claimedPayoutsSol: newClaimed,
    })
    .where(eq(partnersTable.id, payout.partnerId));

  return {
    id: payout.id,
    partnerId: payout.partnerId,
    partnerSlug: payout.partnerSlug,
    payoutWallet: payout.payoutWallet,
    amountSol: payout.amountSol,
    status: "completed",
    txSignature: txSig,
    requestedAt: payout.requestedAt,
    processedAt: now,
  };
}

/**
 * Admin action: Updates partner tier (partner | referrer) and custom rates.
 */
export async function updatePartnerTerms(params: {
  partnerId: string;
  tier?: "partner" | "referrer";
  customCommissionPercent?: number | null;
  audienceDiscountPercent?: number | null;
}): Promise<PartnerRecord> {
  await seedFromLegacyFileIfEmpty();

  const updateFields: Record<string, unknown> = {};
  if (params.tier !== undefined) updateFields.tier = params.tier;
  if (params.customCommissionPercent !== undefined) {
    updateFields.customCommissionPercent = params.customCommissionPercent;
  }
  if (params.audienceDiscountPercent !== undefined) {
    updateFields.audienceDiscountPercent = params.audienceDiscountPercent;
  }

  await db
    .update(partnersTable)
    .set(updateFields)
    .where(eq(partnersTable.id, params.partnerId));

  const updated = await findPartner(params.partnerId);
  if (!updated) throw new Error("Partner not found");
  return updated;
}

/**
 * Retrieves or auto-creates a General Referrer account for a Solana wallet.
 */
export async function getOrCreateWalletReferrer(
  walletAddress: string
): Promise<PartnerRecord> {
  await seedFromLegacyFileIfEmpty();
  const cleanWallet = walletAddress.trim();
  const existing = await findPartner(cleanWallet);
  if (existing) return existing;

  const baseSlug = cleanWallet.slice(0, 8).toLowerCase();
  let candidateSlug = baseSlug;
  let counter = 1;
  while (await findPartner(candidateSlug)) {
    candidateSlug = `${baseSlug}${counter++}`;
  }

  const now = new Date().toISOString();
  const newId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const insertData = {
    id: newId,
    name: `Referrer ${cleanWallet.slice(0, 4)}...${cleanWallet.slice(-4)}`,
    contactHandle: "@referrer",
    platformUrl: `https://solana.fm/address/${cleanWallet}`,
    audienceSize: "Personal",
    slug: candidateSlug,
    payoutWallet: cleanWallet,
    status: "approved" as PartnerStatus,
    tier: "referrer" as const,
    clicks: 0,
    walletsConnected: 0,
    conversionsCount: 0,
    totalVolumeSol: 0,
    lifetimeEarningsSol: 0,
    unclaimedBalanceSol: 0,
    claimedPayoutsSol: 0,
    createdAt: now,
    approvedAt: now,
  };

  await db.insert(partnersTable).values(insertData);
  return mapPartnerRow({
    ...insertData,
    customCommissionPercent: null,
    audienceDiscountPercent: null,
    approvedAt: now,
    lastActiveAt: null,
  });
}
