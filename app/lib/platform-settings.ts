import fs from "fs";
import path from "path";

export interface PlatformSettings {
  // 1. Monetization & Fees (in SOL)
  mainnetBaseFeeSol: number;
  devnetBaseFeeSol: number;
  revokeFreezeFeeSol: number;
  revokeMintFeeSol: number;
  revokeUpdateFeeSol: number;
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
  mainnetBaseFeeSol: 0.15,
  devnetBaseFeeSol: 0,
  revokeFreezeFeeSol: 0.1,
  revokeMintFeeSol: 0.1,
  revokeUpdateFeeSol: 0.1,
  absorbNetworkRent: true,
  treasuryWalletAddress:
    process.env.PLATFORM_TREASURY_WALLET ||
    "54Xn6d6X4wHrkZ9eHnC8F2v56yZ8K5j2Q8s7J3k4L5m6",

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
  devnetRpcUrl:
    process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com",
  irysNetwork: "devnet",
};

const CONFIG_FILE_PATH = path.join(process.cwd(), "config", "platform-settings.json");

/**
 * Reads platform settings from persistent disk or falls back to environment/defaults.
 */
export function getPlatformSettings(): PlatformSettings {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const data = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      const parsed = JSON.parse(data) as Partial<PlatformSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (err) {
    console.warn("Failed to read platform-settings.json, using defaults:", err);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Saves updated platform settings to disk.
 */
export function savePlatformSettings(newSettings: Partial<PlatformSettings>): PlatformSettings {
  const current = getPlatformSettings();
  const updated: PlatformSettings = {
    ...current,
    ...newSettings,
  };

  const configDir = path.dirname(CONFIG_FILE_PATH);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}
