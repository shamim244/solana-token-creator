# Solana Token Studio — Development & Operations Playbook

This playbook contains essential operational instructions for building, testing, deploying, and maintaining **Solana Token Studio**.

---

## 1. Package Manager Mandate

> [!IMPORTANT]
> **Strict Bun Mandate**: This repository strictly uses `bun` and `bunx`. Never execute `npm`, `npx`, `yarn`, or `pnpm`.

```bash
# Correct:
bun install
bun run dev
bun test
bunx drizzle-kit generate

# Strictly Avoid:
npm install / yarn / pnpm
```

---

## 2. Scripts & Verification Pipeline

| Command | Purpose |
| :--- | :--- |
| `bun run dev` | Starts local Next.js development server with Turbopack (http://localhost:3000) |
| `bun run build` | Builds optimized production Next.js application |
| `bun run build:static` | Builds static export of the frontend (when `EXPORT_STATIC=true`) |
| `bun run typecheck` | Validates TypeScript types across the entire project (`tsc --noEmit`) |
| `bun run lint` | Runs ESLint 9 checks |
| `bun run format:check` | Verifies code formatting with Prettier |
| `bun run format` | Automatically formats all source code with Prettier |
| `bun test` | Runs the test suite via Vitest (`vitest run`) |
| `bun run ci` | Full end-to-end CI pipeline: build + typecheck + lint + format:check + test |

---

## 3. Environment Variables Reference

Create a `.env.local` file in the project root:

```ini
# ==============================================================================
# Security & Administration
# ==============================================================================
# Secret key required to access /admin and execute administrative endpoints
ADMIN_SECRET_KEY="replace_with_a_secure_random_string"

# Platform Treasury wallet that receives token creation and utility fees
PLATFORM_TREASURY_WALLET="9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU"

# ==============================================================================
# Distributed Database (LibSQL / Turso Cloud - Optional)
# ==============================================================================
# Leave blank for local SQLite (data/solana_studio.db)
# Or provide Turso credentials to enable Edge Replicas & distributed sync:
# TURSO_DATABASE_URL="libsql://your-database.turso.io"
# TURSO_AUTH_TOKEN="your-turso-jwt-token"

# ==============================================================================
# Solana RPC Endpoints
# ==============================================================================
NEXT_PUBLIC_SOLANA_RPC_DEVNET="https://api.devnet.solana.com"
NEXT_PUBLIC_SOLANA_RPC_MAINNET="https://api.mainnet-beta.solana.com"

# ==============================================================================
# Decentralized Storage (Irys / Arweave - Optional)
# ==============================================================================
# IRYS_PRIVATE_KEY="your_solana_keypair_for_metadata_uploads"
# IRYS_NETWORK="devnet" # or "mainnet"
```

---

## 4. Testing Architecture & Guidelines

Unit and integration tests are placed in `tests/`:

- `tests/partners.test.ts`: Tests partner applications, custom commission splits, conversion attribution, atomic balances, and payout claims.
- `tests/platform-settings.test.ts`: Tests fallback defaults, database overrides, and validation.
- `tests/metadata.test.ts`: Tests Irys and gateway metadata uploads.
- `tests/mock-wallet.ts`: Non-custodial mock wallet signer for headless testing.

### Concurrency & SQLite Safety
Vitest is configured with `fileParallelism: false` in `vitest.config.mts`:
```ts
export default defineConfig({
  test: {
    environment: "jsdom",
    fileParallelism: false, // Prevents SQLite file lock contention during parallel test runs
  },
});
```
This guarantees that database operations and table resets run sequentially without encountering `SQLITE_BUSY: database is locked`.

---

## 5. Database Scaling & Migration Guide

### 5.1. Phase 1: Local SQLite Baseline (Current)
- Uses local file at `data/solana_studio.db`.
- Configured with `PRAGMA journal_mode = WAL;` and `PRAGMA busy_timeout = 5000;`.
- Excellent performance for single-node deployments (capable of thousands of reads/writes per second).

### 5.2. Phase 2: Distributed Replicas via Turso / LibSQL (Zero Code Changes)
If application traffic spikes due to marketing campaigns or influencer promotions:
1. Create a Turso database: `turso db create solana-studio`
2. Obtain URL and Auth Token: `turso db tokens create solana-studio`
3. Set in production environment:
   ```ini
   TURSO_DATABASE_URL=libsql://solana-studio-[user].turso.io
   TURSO_AUTH_TOKEN=your-token
   ```
4. **Behavior**: `app/lib/db/index.ts` automatically switches to embedded replica mode.
   - Every server replica caches reads locally at `data/replica.db` (0ms network latency).
   - Writes are forwarded automatically to the primary database over TLS.
   - Syncs every 60 seconds automatically.

### 5.3. Phase 3: Migrating to PostgreSQL or MySQL
Because the application uses Drizzle ORM, migrating to PostgreSQL or MySQL requires minimal code changes:

1. **Install Driver & Dialect**:
   - For PostgreSQL: `bun add drizzle-orm postgres` and `bun add -d @types/postgres`
   - For MySQL: `bun add drizzle-orm mysql2`
2. **Update Schema Types (`app/lib/db/schema.ts`)**:
   - Replace `sqliteTable`, `text`, `integer`, `real` with `pgTable` / `mysqlTable`.
   - Table and column names remain identical.
3. **Update Database Client (`app/lib/db/index.ts`)**:
   - For Postgres:
     ```ts
     import { drizzle } from "drizzle-orm/postgres-js";
     import postgres from "postgres";
     const client = postgres(process.env.DATABASE_URL!);
     export const db = drizzle(client, { schema });
     ```
4. **Update `drizzle.config.ts`**:
   - Change `dialect: "sqlite"` to `dialect: "postgresql"`.
5. Run migrations: `bunx drizzle-kit push`.
6. All application logic in `partner-service.ts` and `platform-settings.ts` will continue functioning without any changes because Drizzle ORM queries (`db.select()`, `db.insert()`, `db.update()`, `db.transaction()`) are dialect-agnostic!
