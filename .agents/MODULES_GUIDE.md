# Solana Token Studio — Modules & Features Guide

This guide provides deep technical documentation for each core subsystem in **Solana Token Studio**.

---

## 1. Token Creation Wizard

**Source Files:**
- [`app/components/wizard/token-wizard.tsx`](file:///p:/Solana/Solana-Token-Creation/app/components/wizard/token-wizard.tsx)
- [`app/components/wizard/steps/step-details.tsx`](file:///p:/Solana/Solana-Token-Creation/app/components/wizard/steps/step-details.tsx)
- [`app/components/wizard/steps/step-socials.tsx`](file:///p:/Solana/Solana-Token-Creation/app/components/wizard/steps/step-socials.tsx)
- [`app/components/wizard/steps/step-authorities.tsx`](file:///p:/Solana/Solana-Token-Creation/app/components/wizard/steps/step-authorities.tsx)
- [`app/components/wizard/steps/step-review.tsx`](file:///p:/Solana/Solana-Token-Creation/app/components/wizard/steps/step-review.tsx)
- [`app/components/wizard/steps/step-success.tsx`](file:///p:/Solana/Solana-Token-Creation/app/components/wizard/steps/step-success.tsx)
- [`app/components/preview/token-preview-card.tsx`](file:///p:/Solana/Solana-Token-Creation/app/components/preview/token-preview-card.tsx)
- [`app/lib/solana-token-creator.ts`](file:///p:/Solana/Solana-Token-Creation/app/lib/solana-token-creator.ts)

### Step-by-Step Flow

```mermaid
flowchart LR
    Step1["Step 1: Details\n(Name, Symbol, Decimals, Supply, Image)"]
    Step2["Step 2: Socials\n(Website, Twitter, Telegram, Discord, Tags)"]
    Step3["Step 3: Security\n(Freeze, Mint, Update Authorities)"]
    Step4["Step 4: Review\n(Discounts, Rent Absorption, Signing)"]
    Step5["Step 5: Success\n(Mint Address, Explorer, Pool Shortcuts)"]

    Step1 --> Step2 --> Step3 --> Step4 --> Step5
```

### 1.1. Step 1: Token Details
- Collects `name`, `symbol` (e.g. `BONK`), `decimals` (default: 9, customizable 0-9), `supply` (human-readable string e.g. `1000000000`), and `description`.
- **Image Upload & Compression**: Client-side canvas compression (`app/lib/image-compressor.ts`) compresses logos to WebP/PNG under 100KB before uploading to decentralized Arweave storage via Irys.

### 1.2. Step 2: Social Links & Tags
- Stores `website`, `twitter`, `telegram`, `discord`, and customizable tag chips (e.g., `MEME`, `DEFI`, `UTILITY`, `AI`).
- Serialized into standard off-chain Metaplex metadata JSON standard.

### 1.3. Step 3: Authority Revocations
- **Revoke Freeze Authority**: Critical for meme coins and DEX liquidity; prevents the creator from ever freezing token holder accounts.
- **Revoke Mint Authority**: Caps the initial supply permanently, ensuring no additional tokens can ever be minted.
- **Revoke Update Authority**: Immutably locks the token name, symbol, and metadata permanently on-chain.

### 1.4. Step 4: Review, Pricing & On-Chain Execution
- Dynamic fee calculation incorporating:
  - Base creation fee (e.g. 0.3 SOL)
  - Revocation fees (e.g. 0.1 SOL each)
  - Global promotional discount % (configured via Admin)
  - Partner referral discount % (via `usePartnerAttribution`)
  - Platform rent absorption (if enabled, Platform treasury absorbs rent costs)
- Constructs atomic transaction message using `@solana/kit`:
  1. `getCreateAccountInstruction` (allocates mint account with rent exemption)
  2. `getInitializeMintInstruction`
  3. `getCreateAssociatedTokenInstruction` (allocates creator's ATA)
  4. `getMintToInstruction` (mints total supply into creator's ATA)
  5. `createMetadataAccountV3` (registers Metaplex on-chain PDA metadata)
  6. Optional `getSetAuthorityInstruction` for Freeze and Mint
  7. Optional platform fee transfer to `treasuryWalletAddress`
- Signs with new mint keypair and user wallet signer in one atomic transaction.

### 1.5. Step 5: Post-Mint Launch Hub
- Displays mint address with copy and explorer buttons (Solana Explorer, Solscan).
- Offers quick 1-click launch buttons to create liquidity pools on Raydium or Meteora.

---

## 2. Post-Launch Utilities Suite

Located under `app/components/actions/` and powered by `app/lib/solana-token-utilities.ts` and `app/lib/solana-airdrop-utilities.ts`.

### 2.1. Batch Multi-Sender Airdrop (`airdrop-multi-sender-card.tsx`)
- **Dual Mode**: Supports both native SOL distributions and any custom SPL token airdrops.
- **Input Parsing & Validation**:
  - Accepts CSV, comma, tab, or space-separated lists (`address,amount` or `address amount`).
  - Strict Base58 public key validation with error highlighting per row.
  - Automatic duplicate address detection and summation or deduplication warnings.
- **Transaction Batching**:
  - Native SOL: **15 recipients per transaction**.
  - SPL Tokens: **8 recipients per transaction** (to stay within the 1232-byte legacy transaction size limit while including ATA idempotent creation instructions).
- **Safe Execution**: Uses `getCreateAssociatedTokenIdempotentInstruction` to ensure recipients without an existing ATA have one created automatically without failing if it already exists.

### 2.2. Standalone Authority Revoker (`authority-revoker-card.tsx`)
- Allows any token creator to inspect an existing mint and revoke:
  - **Freeze Authority** -> `AuthorityType.FreezeAccount = null`
  - **Mint Authority** -> `AuthorityType.MintTokens = null`
  - **Update Authority** -> Metaplex metadata update instruction setting `isMutable: false` and authority to null address.

### 2.3. Metadata Updater (`metadata-updater-card.tsx`)
- Fetches existing Metaplex metadata from the on-chain PDA (`metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`).
- Verifies connected wallet matches `updateAuthority`.
- Allows updating Token Name, Symbol, and off-chain Metadata URI.

### 2.4. Token Burner (`token-burner-card.tsx`)
- Executes `getBurnCheckedInstruction` to safely burn tokens directly from the connected wallet's ATA.
- Permanently decreases total on-chain supply and displays updated supply in real time.

### 2.5. DEX Liquidity Launcher (`dex-launcher-card.tsx`)
- Step-by-step pool creation walkthroughs and pre-populated links for:
  - **Raydium CPMM & AMM V4**
  - **Meteora DLMM**
  - **DexScreener & Birdeye** listing trackers

---

## 3. Partner & Affiliate Marketing Engine

**Source Files:**
- [`app/partners/page.tsx`](file:///p:/Solana/Solana-Token-Creation/app/partners/page.tsx): Partner information & application page.
- [`app/partners/dashboard/page.tsx`](file:///p:/Solana/Solana-Token-Creation/app/partners/dashboard/page.tsx): Self-serve affiliate analytics dashboard.
- [`app/lib/partner-service.ts`](file:///p:/Solana/Solana-Token-Creation/app/lib/partner-service.ts): Database service for partners, conversions, and payouts.
- [`app/lib/hooks/use-partner-attribution.ts`](file:///p:/Solana/Solana-Token-Creation/app/lib/hooks/use-partner-attribution.ts): Client-side attribution and cookie window hook.

### 3.1. Tracking & Attribution Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Visitor
    participant Browser
    participant API as Next.js API (/api/partners/*)
    participant DB as LibSQL / SQLite DB
    actor Partner

    Visitor->>Browser: Enters site via ?partner=cryptoking
    Browser->>API: GET /api/partners/lookup?slug=cryptoking
    API->>DB: Query partners table by slug
    DB-->>API: Partner details (discount %, custom commission %)
    API-->>Browser: Return partner info
    Browser->>Browser: Store in localStorage (30-day attribution window)
    Browser->>API: POST /api/partners/click { slug }
    API->>DB: Increment partner.clicks
    Visitor->>Browser: Connects Wallet
    Browser->>API: POST /api/partners/connect { slug }
    API->>DB: Increment partner.wallets_connected
    Visitor->>Browser: Mints Token or Uses Utility (pays fee)
    Browser->>API: POST /api/partners/convert { slug, txSignature, totalFeeSol, type }
    API->>DB: Record conversion & atomically credit unclaimed_balance_sol
    Partner->>Browser: Opens /partners/dashboard
    Partner->>API: POST /api/partners/claim { slug, payoutWallet }
    API->>DB: Deduct balance & create pending partner_payouts record
```

### 3.2. Dual-Tier Model: General Referrer vs. Verified VIP Partner
The system operates on a dual-tier "give-to-get" model ensuring **both promoters and end-users receive financial benefits**:

| Feature | Tier 1: General Referrer (Standard) | Tier 2: Verified Partner (VIP / Creator) |
| :--- | :--- | :--- |
| **Target Audience** | Casual users, community members, developers | Influencers, YouTubers, launchpads, alpha callers |
| **Code Generation** | Instant 1-click self-serve generation with any wallet | Application on `/partners` approved via `/admin` |
| **Promoter Commission** | Global standard rate (default: `15%`, set in Admin) | Global starting rate (`30%`) or custom per-partner override |
| **Buyer / User Discount** | Global standard discount (default: `5%`, set in Admin) | Global starting discount (`10%`) or custom per-partner override |
| **Checkout UI Badge** | `🏷️ Referral Discount Code Applied (5% Off)` | `🌟 Verified Partner Code Applied (10% Off)` |

### 3.3. Code Resolution & Promo Box Integration
- **Universal URL Aliases**: Supports `?code=slug`, `?partner=slug`, `?ref=slug`, `?creator=slug`, and `?discount=slug`.
- **Address Bar Cleanup**: Once attribution is captured, `window.history.replaceState` removes tracking query parameters for clean user UX.
- **Interactive Promo Input**: The Token Creation Review step (`step-review.tsx`) provides an interactive code input box so users who didn't click a link can manually apply codes (e.g. `BONK`) to unlock fee discounts.

### 3.4. Payout Settlement
- Partners and referrers submit self-serve withdrawal requests when their unclaimed balance exceeds the minimum threshold (default: 0.05 SOL).
- Admins review pending claims in `/admin`, execute the SOL transfer, paste the transaction signature, and mark the payout as `completed`.

### 3.5. Community Referral Hub (`/referral` & `/api/referral`)
To prevent conflation between VIP KOL partnerships and casual peer-to-peer sharing, the platform provides a dedicated, high-converting Community Referral Hub:
- **Permissionless**: Any connected Solana wallet automatically retrieves or creates a clean 8-character referral code (`tier: "referrer"`).
- **Self-Serve Dashboard**: Displays real-time clicks, wallets connected, paid conversions, volume driven, lifetime earnings, and unclaimed balance.
- **1-Click Actions**: Quick copy buttons for referral code, shareable link (`?ref=...`), and direct social share triggers for X / Twitter and Telegram.
- **Direct Claims**: Users can submit withdrawal claims directly to their connected wallet once reaching 0.05 SOL unclaimed commission balance.
- **Upgrade Pathway**: High-volume referrers with >1,000 members are prompted to apply for the VIP Partner Program for custom vanity codes and higher commission brackets.

---

## 4. Admin Control Center

**Source Files:**
- [`app/admin/page.tsx`](file:///p:/Solana/Solana-Token-Creation/app/admin/page.tsx)
- [`app/api/admin/settings/route.ts`](file:///p:/Solana/Solana-Token-Creation/app/api/admin/settings/route.ts)
- [`app/api/admin/partners/route.ts`](file:///p:/Solana/Solana-Token-Creation/app/api/admin/partners/route.ts)
- [`app/lib/platform-settings.ts`](file:///p:/Solana/Solana-Token-Creation/app/lib/platform-settings.ts)

### 4.1. Access Security
- Admin endpoints require authentication via `Authorization: Bearer <password>`, `x-admin-key`, or `x-admin-password`, matched against `ADMIN_PASSWORD` or `ADMIN_SECRET_KEY` in environment variables (fallback: `admin123`).

### 4.2. Capabilities
1. **Fee Management**:
   - Mainnet Base Fee (SOL)
   - Devnet Base Fee (SOL)
   - Authority Revocation Fees (Freeze, Mint, Update)
   - Standalone Utility Fees (Airdrop, Metadata Update, Standalone Revocation)
   - Rent Absorption Toggle (`absorbNetworkRent`)
   - Platform Treasury Wallet Address
2. **Growth & Marketing**:
   - Global Promotional Discount %
   - Announcement Banner text and active state
   - Referral program active state and default commission rate
3. **RPC & Infrastructure**:
   - Mainnet RPC endpoint override
   - Devnet RPC endpoint override
   - Maintenance mode toggle
4. **Partner & Referral Administration**:
   - **VIP Applications Tab**: Review pending creator applications with channel URLs and audience reach; 1-click approval with negotiated commission % and discount %.
   - **Active VIP Partners Tab**: Manage verified creators, monitor live traffic, adjust custom terms, and access branded test links.
   - **Community Referrers Tab**: Inspect all auto-generated community referrer codes, wallet addresses, clicks, and conversions without cluttering VIP creator queues.
   - **Payout Claims Tab**: Settle pending commission withdrawals for both VIP partners and community referrers with on-chain transaction hash verification.
   - **Conversions Ledger Tab**: Inspect full conversion audit trail per partner and referrer.

---

## 5. API Reference Matrix

| Route | Method | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `/api/settings` | `GET` | Fetches public platform settings (fees, discounts, banner) | No |
| `/api/admin/settings` | `GET`, `POST` | Fetches/updates sensitive platform settings | Yes (`x-admin-key` / `Authorization`) |
| `/api/admin/partners` | `GET`, `POST` | Manages partners, approvals, splits, payouts | Yes (`x-admin-key` / `Authorization`) |
| `/api/referral` | `GET`, `POST` | Self-serve community referrer stats, link generation, and claims | No |
| `/api/partners/apply` | `POST` | Submits VIP partner application | No |
| `/api/partners/lookup` | `GET` | Looks up partner or referrer by slug or wallet address | No |
| `/api/partners/click` | `POST` | Records link click for partner attribution | No |
| `/api/partners/connect` | `POST` | Records wallet connection under partner referral | No |
| `/api/partners/convert` | `POST` | Records paid on-chain action and credits commission | No |
| `/api/partners/claim` | `POST` | Submits payout withdrawal claim for unclaimed earnings | No |
| `/api/upload-metadata` | `POST` | Uploads metadata JSON and images to Irys/Arweave | No |
| `/api/upload-metadata/status` | `GET` | Checks Irys upload node status and network balance | No |
