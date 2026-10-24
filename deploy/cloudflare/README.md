# Deploying Solana Token Creator to Cloudflare Pages

This platform is configured for **Cloudflare Pages** with zero-cost edge hosting, global CDN, and automated Git-push deployments.

---

### Step-by-Step Setup Guide

#### 1. Connect GitHub Repository in Cloudflare Dashboard

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Compute (Workers & Pages)** > **Create application** > **Pages** > **Connect to Git**.
3. Select your repository: `shamim244/solana-token-creator`.

#### 2. Configure Build & Deployment Settings

- **Framework preset:** `Next.js`
- **Build command:** `bun run build` (or `npx @cloudflare/next-on-pages` if using edge runtime adapter)
- **Build output directory:** `.next`
- **Root directory:** `/`

#### 3. Environment Variables (in Cloudflare Dashboard)

Under **Settings** > **Environment variables**, configure:

- `NEXT_PUBLIC_DEFAULT_CLUSTER` = `mainnet` (or `devnet`)
- `PLATFORM_TREASURY_WALLET` = `YOUR_SOLANA_TREASURY_BASE58_ADDRESS`
- `ADMIN_PASSWORD` = `YOUR_SECURE_ADMIN_PASSCODE`
- `MAINNET_RPC_URL` = `YOUR_HELIUS_OR_QUICKNODE_RPC_URL`

#### 4. Automatic Continuous Deployment

Every time you run `git push origin main`, Cloudflare will automatically build and deploy your updates within 60 seconds with a preview link.
