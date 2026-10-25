# Solana Token Studio — Agent & Developer Knowledge Base

Welcome to the **Solana Token Studio** knowledge base. This directory contains comprehensive technical documentation engineered specifically for AI coding agents, autonomous subagents, and human contributors.

---

## 📚 Documentation Index

1. **[System Architecture](file:///p:/Solana/Solana-Token-Creation/.agents/ARCHITECTURE.md)**:
   - High-level system overview & data flow diagrams.
   - Non-custodial client-side execution model.
   - Database layer (LibSQL/SQLite, WAL mode, concurrency safeguards, Turso edge replication).
   - Technology stack versions and rationale.
   - Solana RPC and cluster topology.

2. **[Modules & Subsystems Guide](file:///p:/Solana/Solana-Token-Creation/.agents/MODULES_GUIDE.md)**:
   - **Token Creation Wizard**: 5-step minting engine, Metaplex V3, rent absorption, freeze/mint/update revocations, real-time live preview.
   - **Post-Launch Utilities Suite**: Batch Multi-Sender airdrop (SOL & SPL with CSV parsing & auto-batching), Standalone Authority Revoker, Metadata Updater, Token Burner, DEX Launcher.
   - **Partner & Affiliate Marketing Engine**: Attribution window, click & conversion tracking, custom commission tiers, self-serve partner dashboard, payout claims.
   - **Admin Control Center**: Dynamic fee controls, platform discounts, RPC overrides, partner approvals, payout settlement.
   - **API Reference Matrix**: Complete catalog of all platform endpoints.

3. **[Development & Operations Playbook](file:///p:/Solana/Solana-Token-Creation/.agents/DEVELOPMENT_PLAYBOOK.md)**:
   - Bun package manager mandate (`bun`, `bunx`).
   - Development, test, lint, and CI pipeline commands.
   - Environment variables reference guide.
   - Vitest concurrency and testing safety rules.
   - Scaling & Migration Playbook: Scaling SQLite via Turso replicas and step-by-step guide for migrating to PostgreSQL/MySQL.

4. **Specialized Agent Skills**:
   - `solana-dev` ([`SKILL.md`](file:///p:/Solana/Solana-Token-Creation/.agents/skills/solana-dev/SKILL.md)): Solana best practices, Anchor/Pinocchio programs, `@solana/kit` v7, Codama clients, Surfpool testing.
   - `ui-ux-pro-max` ([`SKILL.md`](file:///p:/Solana/Solana-Token-Creation/.agents/skills/ui-ux-pro-max/SKILL.md)): UI/UX design intelligence, typography, accessible color schemes, Tailwind CSS layout patterns.

---

## ⚡ Quick Operational Reminders for Any Agent

- **Always use `bun` and `bunx`**: Do not use `npm`, `npx`, `yarn`, or `pnpm`.
- **Preserve Non-Custodial Guarantee**: Transactions must always be constructed and signed on the client. Never store private keys on the server.
- **Run the Full CI Check**: Before concluding any task, always verify with:
  ```bash
  bun run ci
  ```
