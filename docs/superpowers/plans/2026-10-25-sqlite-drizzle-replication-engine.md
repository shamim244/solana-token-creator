# SQLite (LibSQL) Replicated Database & Drizzle ORM Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Solana Token Studio from local JSON file storage to a high-throughput, horizontal-ready, connected SQLite replica database powered by LibSQL and Drizzle ORM. This eliminates JSON write-lock race conditions during influencer traffic spikes, enables embedded local read replicas (<0.5ms latency), and guarantees a 10-minute migration path to PostgreSQL/MySQL in the future.

**Architecture:**
The application accesses data through Drizzle ORM atop LibSQL (`@libsql/client`). In development and single-server deployments, it operates on a local file database with Write-Ahead Logging (WAL) and atomic SQL transactions. In multi-replica production environments, the LibSQL driver mounts a local embedded replica file for sub-millisecond local reads while forwarding writes and streaming WAL deltas to and from the primary cluster node automatically.

**Tech Stack:**

- Database Engine: LibSQL (`@libsql/client` - SQLite with embedded replication)
- ORM: Drizzle ORM (`drizzle-orm/libsql`)
- Schema & Migration Tooling: Drizzle Kit (`drizzle-kit`)
- Runtime & Package Manager: Bun (`bun`, `bunx`)
- Testing: Vitest (`vitest run`)

---

## Global Constraints

- Package manager: Always use `bun` and `bunx` instead of `npm`, `npx`, `yarn`, or `pnpm`.
- Database storage directory: Store database files under `data/` (e.g. `data/solana_studio.db`) and add `data/*.db*` to `.gitignore`.
- Backwards compatibility: Existing JSON data in `config/partners-data.json` and `config/platform-settings.json` must be automatically seeded on first database initialization so no existing settings or partners are lost.
- Future-proofing: Define all Drizzle schemas using portable SQLite types that map 1:1 to PostgreSQL and MySQL without dialect-specific hacks.

---

## Tasks

- [ ] **Task 1: Database Client Factory & Schema Setup**
  - Create `app/lib/db/schema.ts` defining `partners`, `partnerConversions`, `partnerPayouts`, and `platformSettings` tables.
  - Create `app/lib/db/index.ts` initializing the LibSQL client and Drizzle instance with WAL mode and dual-mode configuration (standalone local file vs. synced replica).
  - Create `drizzle.config.ts` for schema management.
  - Update `.gitignore` to ignore SQLite database files (`data/*.db`, `data/*.db-wal`, `data/*.db-shm`).

- [ ] **Task 2: Platform Settings Service Migration**
  - Migrate `app/lib/platform-settings.ts` to read and write from SQLite via Drizzle ORM with automatic seed fallback from `config/platform-settings.json`.
  - Add unit test in `tests/platform-settings.test.ts` to verify read, update, and persistence.

- [ ] **Task 3: Partner Service SQL & Transaction Migration**
  - Refactor `app/lib/partner-service.ts` to use Drizzle ORM transactions:
    - `applyForPartner`: atomic insert with unique constraint handling on `slug` and `payout_wallet`.
    - `findPartner`: indexed O(1) query by slug, wallet, or ID.
    - `recordPartnerClick`: atomic SQL increment (`clicks = clicks + 1`).
    - `recordPartnerWalletConnection`: atomic SQL increment (`wallets_connected = wallets_connected + 1`).
    - `recordPartnerConversion`: ACID transaction computing commission and updating partner volume and balance in a single atomic step.
    - `requestPartnerClaim`: atomic balance check (>= 0.05 SOL) and payout claim insertion.
    - `approvePartner`, `rejectPartner`, `completePayout`.
  - Ensure automatic seeding from `config/partners-data.json` if database tables are empty.

- [ ] **Task 4: Unit Test Suite Update & Verification**
  - Update `tests/partners.test.ts` to execute cleanly against the new Drizzle SQLite engine with isolated in-memory or temporary test database.
  - Run all tests to confirm 100% pass rate.

- [ ] **Task 5: End-to-End Build Verification & Git Sync**
  - Run `bun run typecheck`, `bun run lint`, `bun run format:check`, and `bun run test`.
  - Verify API endpoints (`/api/partners/lookup`, `/api/admin/partners`).
  - Commit and push to `origin/main`.
