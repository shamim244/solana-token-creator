import fs from "fs";
import path from "path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    // Ignore in read-only filesystems or environments
  }
}

// Primary database URL determination
const remoteUrl =
  process.env.TURSO_DATABASE_URL ||
  process.env.LIBSQL_DATABASE_URL ||
  process.env.DATABASE_URL;

const authToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

// Local SQLite database file path
const localDbPath = path.join(DATA_DIR, "solana_studio.db");

let clientInstance: ReturnType<typeof createClient>;

if (remoteUrl && authToken) {
  // Production Replicated Mode: Embedded local replica file synced with remote cluster
  const replicaPath = path.join(DATA_DIR, "replica.db");
  clientInstance = createClient({
    url: `file:${replicaPath}`,
    syncUrl: remoteUrl,
    authToken: authToken,
    syncInterval: 60, // Background sync every 60 seconds
  });
} else if (remoteUrl && !remoteUrl.startsWith("file:")) {
  // Remote Direct Mode
  clientInstance = createClient({
    url: remoteUrl,
    authToken: authToken,
  });
} else {
  // Standalone Local Development Mode (Default)
  // Uses local SQLite database with Write-Ahead Logging (WAL)
  clientInstance = createClient({
    url: `file:${localDbPath}`,
  });
}

export const rawDbClient = clientInstance;
export const db = drizzle(clientInstance, { schema });

/**
 * Initializes database tables automatically if they do not exist.
 */
let isInitialized = false;

export async function ensureDbInitialized(): Promise<void> {
  if (isInitialized) return;

  try {
    // Enable WAL mode and busy timeout for high concurrent throughput on local files
    if (!remoteUrl || remoteUrl.startsWith("file:")) {
      try {
        await clientInstance.execute("PRAGMA busy_timeout = 5000;");
        await clientInstance.execute("PRAGMA journal_mode = WAL;");
        await clientInstance.execute("PRAGMA synchronous = NORMAL;");
      } catch {
        // Ignore if already set or locked
      }
    }

    // Create Platform Settings table
    await clientInstance.execute(`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id TEXT PRIMARY KEY,
        settings_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Create Partners table
    await clientInstance.execute(`
      CREATE TABLE IF NOT EXISTS partners (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        contact_handle TEXT NOT NULL,
        platform_url TEXT NOT NULL,
        audience_size TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        payout_wallet TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending',
        custom_commission_percent REAL,
        audience_discount_percent REAL,
        clicks INTEGER NOT NULL DEFAULT 0,
        wallets_connected INTEGER NOT NULL DEFAULT 0,
        conversions_count INTEGER NOT NULL DEFAULT 0,
        total_volume_sol REAL NOT NULL DEFAULT 0.0,
        lifetime_earnings_sol REAL NOT NULL DEFAULT 0.0,
        unclaimed_balance_sol REAL NOT NULL DEFAULT 0.0,
        claimed_payouts_sol REAL NOT NULL DEFAULT 0.0,
        created_at TEXT NOT NULL,
        approved_at TEXT,
        last_active_at TEXT
      );
    `);

    // Create indexes for Partners
    await clientInstance.execute(`
      CREATE INDEX IF NOT EXISTS partner_slug_idx ON partners(slug);
    `);
    await clientInstance.execute(`
      CREATE INDEX IF NOT EXISTS partner_wallet_idx ON partners(payout_wallet);
    `);
    await clientInstance.execute(`
      CREATE INDEX IF NOT EXISTS partner_status_idx ON partners(status);
    `);

    // Create Partner Conversions table
    await clientInstance.execute(`
      CREATE TABLE IF NOT EXISTS partner_conversions (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL REFERENCES partners(id),
        partner_slug TEXT NOT NULL,
        type TEXT NOT NULL,
        user_wallet TEXT NOT NULL,
        tx_signature TEXT,
        total_fee_sol REAL NOT NULL,
        commission_sol REAL NOT NULL,
        commission_percent REAL NOT NULL,
        timestamp TEXT NOT NULL
      );
    `);

    // Create indexes for Conversions
    await clientInstance.execute(`
      CREATE INDEX IF NOT EXISTS conversion_partner_idx ON partner_conversions(partner_id);
    `);
    await clientInstance.execute(`
      CREATE INDEX IF NOT EXISTS conversion_slug_idx ON partner_conversions(partner_slug);
    `);

    // Create Partner Payouts table
    await clientInstance.execute(`
      CREATE TABLE IF NOT EXISTS partner_payouts (
        id TEXT PRIMARY KEY,
        partner_id TEXT NOT NULL REFERENCES partners(id),
        partner_slug TEXT NOT NULL,
        payout_wallet TEXT NOT NULL,
        amount_sol REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        tx_signature TEXT,
        requested_at TEXT NOT NULL,
        processed_at TEXT
      );
    `);

    // Create indexes for Payouts
    await clientInstance.execute(`
      CREATE INDEX IF NOT EXISTS payout_partner_idx ON partner_payouts(partner_id);
    `);
    await clientInstance.execute(`
      CREATE INDEX IF NOT EXISTS payout_status_idx ON partner_payouts(status);
    `);

    isInitialized = true;
  } catch (err) {
    console.error("Failed to auto-bootstrap SQLite tables:", err);
  }
}
