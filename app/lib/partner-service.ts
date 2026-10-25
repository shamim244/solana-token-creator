import fs from "fs";
import path from "path";
import { getPlatformSettings } from "./platform-settings";

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
  customCommissionPercent?: number; // if set, overrides global default
  audienceDiscountPercent?: number; // % discount for creators who use their link
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

let memoryStore: PartnersDataStore = {
  partners: [],
  conversions: [],
  payouts: [],
};

export function getPartnersStore(): PartnersDataStore {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, "utf-8");
      memoryStore = JSON.parse(content) as PartnersDataStore;
      return memoryStore;
    }
  } catch (err) {
    console.warn("Failed to read partners config, using memory store:", err);
  }
  return memoryStore;
}

export function savePartnersStore(store: PartnersDataStore): void {
  memoryStore = store;
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to persist partners config:", err);
  }
}

/**
 * Submits a new partner application.
 */
export function applyForPartner(data: {
  name: string;
  contactHandle: string;
  platformUrl: string;
  audienceSize: string;
  slug: string;
  payoutWallet: string;
}): PartnerRecord {
  const store = getPartnersStore();
  const cleanSlug = data.slug
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .trim();

  // Check if slug or wallet already exists
  const existing = store.partners.find(
    (p) =>
      p.slug.toLowerCase() === cleanSlug ||
      p.payoutWallet.toLowerCase() === data.payoutWallet.toLowerCase()
  );

  if (existing) {
    if (existing.slug.toLowerCase() === cleanSlug) {
      throw new Error(`Partner link slug "${cleanSlug}" is already taken.`);
    }
    throw new Error(
      "An application for this payout wallet address already exists."
    );
  }

  const newPartner: PartnerRecord = {
    id: `partner_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: data.name.trim(),
    contactHandle: data.contactHandle.trim(),
    platformUrl: data.platformUrl.trim(),
    audienceSize: data.audienceSize.trim(),
    slug: cleanSlug,
    payoutWallet: data.payoutWallet.trim(),
    status: "pending",
    clicks: 0,
    walletsConnected: 0,
    conversionsCount: 0,
    totalVolumeSol: 0,
    lifetimeEarningsSol: 0,
    unclaimedBalanceSol: 0,
    claimedPayoutsSol: 0,
    createdAt: new Date().toISOString(),
  };

  store.partners.push(newPartner);
  savePartnersStore(store);
  return newPartner;
}

/**
 * Internal helper to find a partner within an existing store instance.
 */
function findPartnerInStore(
  store: PartnersDataStore,
  slugOrWallet: string
): PartnerRecord | undefined {
  const query = slugOrWallet.toLowerCase().trim();
  return store.partners.find(
    (p) =>
      p.slug.toLowerCase() === query ||
      p.payoutWallet.toLowerCase() === query ||
      p.id.toLowerCase() === query
  );
}

/**
 * Finds partner by slug or wallet address.
 */
export function findPartner(slugOrWallet: string): PartnerRecord | undefined {
  const store = getPartnersStore();
  return findPartnerInStore(store, slugOrWallet);
}

/**
 * Records a click on a partner referral link.
 */
export function recordPartnerClick(slugOrWallet: string): boolean {
  const store = getPartnersStore();
  const partner = findPartnerInStore(store, slugOrWallet);
  if (!partner || partner.status !== "approved") return false;

  partner.clicks += 1;
  partner.lastActiveAt = new Date().toISOString();
  savePartnersStore(store);
  return true;
}

/**
 * Records a wallet connection attributed to a partner.
 */
export function recordPartnerWalletConnection(slugOrWallet: string): boolean {
  const store = getPartnersStore();
  const partner = findPartnerInStore(store, slugOrWallet);
  if (!partner || partner.status !== "approved") return false;

  partner.walletsConnected += 1;
  partner.lastActiveAt = new Date().toISOString();
  savePartnersStore(store);
  return true;
}

/**
 * Records a paid conversion (token created, authority revoked) and credits partner commission.
 */
export function recordPartnerConversion(params: {
  slugOrWallet: string;
  userWallet: string;
  type: "token_create" | "revoke_authority" | "metadata_update" | "airdrop";
  feeSol: number;
  txSignature?: string;
}): PartnerConversion | null {
  const store = getPartnersStore();
  const partner = findPartnerInStore(store, params.slugOrWallet);
  if (!partner || partner.status !== "approved") return null;

  const platformSettings = getPlatformSettings();
  const defaultRate = platformSettings.referralFeeSharePercent || 20;
  const effectiveRate =
    partner.customCommissionPercent !== undefined
      ? partner.customCommissionPercent
      : defaultRate;

  const commissionSol =
    Math.round(params.feeSol * (effectiveRate / 100) * 1000) / 1000;

  partner.conversionsCount += 1;
  partner.totalVolumeSol =
    Math.round((partner.totalVolumeSol + params.feeSol) * 1000) / 1000;
  partner.lifetimeEarningsSol =
    Math.round((partner.lifetimeEarningsSol + commissionSol) * 1000) / 1000;
  partner.unclaimedBalanceSol =
    Math.round((partner.unclaimedBalanceSol + commissionSol) * 1000) / 1000;
  partner.lastActiveAt = new Date().toISOString();

  const conversion: PartnerConversion = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    partnerId: partner.id,
    partnerSlug: partner.slug,
    type: params.type,
    userWallet: params.userWallet,
    txSignature: params.txSignature,
    totalFeeSol: params.feeSol,
    commissionSol,
    commissionPercent: effectiveRate,
    timestamp: new Date().toISOString(),
  };

  store.conversions.push(conversion);
  savePartnersStore(store);
  return conversion;
}

/**
 * Submits a withdrawal request for accumulated partner commissions.
 */
export function requestPartnerClaim(
  partnerIdOrWallet: string
): PartnerPayoutClaim {
  const store = getPartnersStore();
  const partner = findPartnerInStore(store, partnerIdOrWallet);
  if (!partner || partner.status !== "approved") {
    throw new Error("Approved partner account required for withdrawal");
  }

  if (partner.unclaimedBalanceSol < 0.05) {
    throw new Error(
      `Minimum withdrawal threshold is 0.05 SOL (Available: ${partner.unclaimedBalanceSol} SOL)`
    );
  }

  const claimAmount = partner.unclaimedBalanceSol;
  partner.unclaimedBalanceSol = 0;

  const payout: PartnerPayoutClaim = {
    id: `payout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    partnerId: partner.id,
    partnerSlug: partner.slug,
    payoutWallet: partner.payoutWallet,
    amountSol: claimAmount,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };

  store.payouts.push(payout);
  savePartnersStore(store);
  return payout;
}

/**
 * Admin action: Approves a partner and sets custom commission % or audience discount.
 */
export function approvePartner(params: {
  partnerId: string;
  customCommissionPercent?: number;
  audienceDiscountPercent?: number;
}): PartnerRecord {
  const store = getPartnersStore();
  const partner = store.partners.find((p) => p.id === params.partnerId);
  if (!partner) throw new Error("Partner not found");

  partner.status = "approved";
  partner.approvedAt = new Date().toISOString();
  if (params.customCommissionPercent !== undefined) {
    partner.customCommissionPercent = params.customCommissionPercent;
  }
  if (params.audienceDiscountPercent !== undefined) {
    partner.audienceDiscountPercent = params.audienceDiscountPercent;
  }

  savePartnersStore(store);
  return partner;
}

/**
 * Admin action: Rejects a partner application.
 */
export function rejectPartner(partnerId: string): boolean {
  const store = getPartnersStore();
  const partner = store.partners.find((p) => p.id === partnerId);
  if (!partner) return false;

  partner.status = "rejected";
  savePartnersStore(store);
  return true;
}

/**
 * Admin action: Marks a partner payout as completed with on-chain tx signature.
 */
export function completePayout(params: {
  payoutId: string;
  txSignature?: string;
}): PartnerPayoutClaim {
  const store = getPartnersStore();
  const payout = store.payouts.find((p) => p.id === params.payoutId);
  if (!payout) throw new Error("Payout record not found");

  payout.status = "completed";
  payout.txSignature = params.txSignature || "manual_confirmed";
  payout.processedAt = new Date().toISOString();

  // Increment claimed payouts in partner record
  const partner = store.partners.find((p) => p.id === payout.partnerId);
  if (partner) {
    partner.claimedPayoutsSol =
      Math.round((partner.claimedPayoutsSol + payout.amountSol) * 1000) / 1000;
  }

  savePartnersStore(store);
  return payout;
}
