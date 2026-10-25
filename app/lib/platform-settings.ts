import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db, ensureDbInitialized } from "./db";
import { platformSettingsTable } from "./db/schema";

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
  referralDiscountPercent: number;
  partnerFeeSharePercent: number;
  partnerDiscountPercent: number;

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
  referralProgramActive: true,
  referralFeeSharePercent: 15,
  referralDiscountPercent: 5,
  partnerFeeSharePercent: 30,
  partnerDiscountPercent: 10,

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

// In-memory cache for sub-millisecond synchronous reads
let inMemorySettingsCache: PlatformSettings | null = null;

function loadFallbackFileSettings(): PlatformSettings {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data) as Partial<PlatformSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Ignore error
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Asynchronously loads settings from SQLite, seeding from config file if empty.
 */
export async function getPlatformSettingsAsync(): Promise<PlatformSettings> {
  await ensureDbInitialized();

  try {
    const rows = await db
      .select()
      .from(platformSettingsTable)
      .where(eq(platformSettingsTable.id, "default"));

    if (rows.length > 0 && rows[0].settingsJson) {
      const parsed = JSON.parse(
        rows[0].settingsJson
      ) as Partial<PlatformSettings>;
      inMemorySettingsCache = { ...DEFAULT_SETTINGS, ...parsed };
      return inMemorySettingsCache;
    }

    // Seed from JSON file or defaults
    const initial = loadFallbackFileSettings();
    await db
      .insert(platformSettingsTable)
      .values({
        id: "default",
        settingsJson: JSON.stringify(initial),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: platformSettingsTable.id,
        set: {
          settingsJson: JSON.stringify(initial),
          updatedAt: new Date().toISOString(),
        },
      });

    inMemorySettingsCache = initial;
    return inMemorySettingsCache;
  } catch (err) {
    console.warn(
      "Notice: SQLite read failed, falling back to cached settings:",
      err
    );
    if (!inMemorySettingsCache) {
      inMemorySettingsCache = loadFallbackFileSettings();
    }
    return inMemorySettingsCache;
  }
}

/**
 * Synchronous access for performance-critical client/SSR contexts.
 */
export function getPlatformSettings(): PlatformSettings {
  if (inMemorySettingsCache) {
    return inMemorySettingsCache;
  }

  inMemorySettingsCache = loadFallbackFileSettings();

  // Trigger background async refresh from SQLite
  getPlatformSettingsAsync().catch(() => {});

  return inMemorySettingsCache;
}

/**
 * Saves updated platform settings to SQLite via Drizzle ORM and mirror files.
 */
export async function savePlatformSettingsAsync(
  newSettings: Partial<PlatformSettings>
): Promise<PlatformSettings> {
  await ensureDbInitialized();

  const current = await getPlatformSettingsAsync();
  const updated: PlatformSettings = {
    ...current,
    ...newSettings,
  };

  inMemorySettingsCache = updated;

  try {
    await db
      .insert(platformSettingsTable)
      .values({
        id: "default",
        settingsJson: JSON.stringify(updated),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: platformSettingsTable.id,
        set: {
          settingsJson: JSON.stringify(updated),
          updatedAt: new Date().toISOString(),
        },
      });
  } catch (err) {
    console.error("Failed to persist settings to SQLite:", err);
  }

  // Mirror to file for offline dev/recovery
  try {
    const configDir = path.dirname(CONFIG_FILE_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(
      CONFIG_FILE_PATH,
      JSON.stringify(updated, null, 2) + "\n",
      "utf-8"
    );
  } catch {
    // Ignore in read-only environments
  }

  return updated;
}

/**
 * Synchronous compatibility wrapper for savePlatformSettings.
 */
export function savePlatformSettings(
  newSettings: Partial<PlatformSettings>
): PlatformSettings {
  const current = getPlatformSettings();
  const updated: PlatformSettings = {
    ...current,
    ...newSettings,
  };
  inMemorySettingsCache = updated;

  savePlatformSettingsAsync(newSettings).catch((err) => {
    console.error("Background SQLite save error:", err);
  });

  return updated;
}
