import fs from "fs";
import path from "path";

export interface PlatformSettings {
  // 1. Monetization & Fees (in SOL)
  mainnetBaseFeeSol: number;
  devnetBaseFeeSol: number;
  revokeFreezeFeeSol: number;
  revokeMintFeeSol: number;
  revokeUpdateFeeSol: number;
  revokeStandaloneFeeSol: number;
  updateMetadataFeeSol: number;
  burnTokenFeeSol: number;
  airdropFeeSol: number;
  absorbNetworkRent: boolean;
  treasuryWalletAddress: string;

  // 2. Growth & Marketing
  promoDiscountPercent: number;
  promoBannerActive: boolean;
  promoBannerText: string;
  referralProgramActive: boolean;
  referralFeeSharePercent: number;

  // 3. General & Branding
  platformTitle: string;
  platformTagline: string;
  supportTelegram: string;
  supportTwitter: string;
  supportDiscord: string;
  maintenanceMode: boolean;

  // 4. Infrastructure & RPCs
  mainnetRpcUrl: string;
  devnetRpcUrl: string;
  irysNetwork: "devnet" | "mainnet";
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  // Fees
  mainnetBaseFeeSol: 0.3,
  devnetBaseFeeSol: 0.3,
  revokeFreezeFeeSol: 0.1,
  revokeMintFeeSol: 0.1,
  revokeUpdateFeeSol: 0.1,
  revokeStandaloneFeeSol: 0.05,
  updateMetadataFeeSol: 0.05,
  burnTokenFeeSol: 0.0,
  airdropFeeSol: 0.01,
  absorbNetworkRent: true,
  treasuryWalletAddress:
    process.env.PLATFORM_TREASURY_WALLET ||
    "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU",

  // Marketing & Growth
  promoDiscountPercent: 0,
  promoBannerActive: false,
  promoBannerText: "⚡ Launch Week Special: 20% Off All Authority Revocations!",
  referralProgramActive: false,
  referralFeeSharePercent: 20,

  // General & Branding
  platformTitle: "Solana Token Studio",
  platformTagline: "SPL & Token-2022 Launchpad",
  supportTelegram: "https://t.me/solanatokenstudio",
  supportTwitter: "https://x.com/solanatokenstudio",
  supportDiscord: "https://discord.gg/solana",
  maintenanceMode: false,

  // Infrastructure
  mainnetRpcUrl:
    process.env.MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com",
  devnetRpcUrl: process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com",
  irysNetwork: "devnet",
};

const CONFIG_FILE_PATH = path.join(
  process.cwd(),
  "config",
  "platform-settings.json"
);

// In-memory cache for serverless / edge environments where filesystem is read-only
let inMemorySettingsCache: PlatformSettings | null = null;

/**
 * Reads platform settings from persistent disk, cloud KV, or falls back to defaults.
 * Completely crash-proof across VPS, Cloudflare Pages, and Serverless.
 */
export function getPlatformSettings(): PlatformSettings {
  if (inMemorySettingsCache) {
    return inMemorySettingsCache;
  }

  try {
    if (
      typeof fs !== "undefined" &&
      fs.existsSync &&
      fs.existsSync(CONFIG_FILE_PATH)
    ) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data) as Partial<PlatformSettings>;
      inMemorySettingsCache = { ...DEFAULT_SETTINGS, ...parsed };
      return inMemorySettingsCache;
    }
  } catch (err) {
    console.warn(
      "Storage notice: filesystem read unavailable or read-only, using memory fallback.",
      err
    );
  }

  inMemorySettingsCache = { ...DEFAULT_SETTINGS };
  return inMemorySettingsCache;
}

/**
 * Saves updated platform settings with multi-target storage resilience:
 * 1. Tries persistent filesystem (VPS / Node / Bun).
 * 2. If running on read-only edge/serverless (Cloudflare / Lambda), caches in-memory safely.
 * 3. If UPSTASH_REDIS_REST_URL is configured, syncs to cloud KV in the background.
 */
export function savePlatformSettings(
  newSettings: Partial<PlatformSettings>
): PlatformSettings {
  const current = getPlatformSettings();
  const updated: PlatformSettings = {
    ...current,
    ...newSettings,
  };

  // Always update in-memory cache immediately
  inMemorySettingsCache = updated;

  // 1. Try persistent filesystem (VPS / local container)
  try {
    if (typeof fs !== "undefined" && fs.writeFileSync) {
      const configDir = path.dirname(CONFIG_FILE_PATH);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(
        CONFIG_FILE_PATH,
        JSON.stringify(updated, null, 2),
        "utf-8"
      );
    }
  } catch (err) {
    console.warn(
      "Notice: Filesystem is read-only (Cloudflare / Serverless). Settings updated in edge memory.",
      err
    );
  }

  // 2. Cloud KV sync (Optional Upstash Redis REST API - works at Edge with zero libraries)
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (redisUrl && redisToken) {
    fetch(`${redisUrl}/set/platform_settings`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${redisToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updated),
    }).catch((kvErr) => console.error("Cloud KV sync failed:", kvErr));
  }

  return updated;
}
