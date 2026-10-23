import fs from "fs";
import path from "path";

export interface PlatformSettings {
  // Fees (in SOL)
  mainnetBaseFeeSol: number;
  devnetBaseFeeSol: number;
  revokeFreezeFeeSol: number;
  revokeMintFeeSol: number;
  revokeUpdateFeeSol: number;
  absorbNetworkRent: boolean;

  // Treasury
  treasuryWalletAddress: string;

  // Network & RPCs
  mainnetRpcUrl: string;
  devnetRpcUrl: string;

  // Storage
  irysNetwork: "devnet" | "mainnet";
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  mainnetBaseFeeSol: 0.15,
  devnetBaseFeeSol: 0,
  revokeFreezeFeeSol: 0.1,
  revokeMintFeeSol: 0.1,
  revokeUpdateFeeSol: 0.1,
  absorbNetworkRent: true,
  treasuryWalletAddress:
    process.env.PLATFORM_TREASURY_WALLET ||
    "54Xn6d6X4wHrkZ9eHnC8F2v56yZ8K5j2Q8s7J3k4L5m6",
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
