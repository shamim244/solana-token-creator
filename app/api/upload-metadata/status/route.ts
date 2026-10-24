import { NextResponse } from "next/server";
import { Uploader } from "@irys/upload";
import { Solana } from "@irys/upload-solana";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configuredKey =
      process.env.IRYS_WALLET_PRIVATE_KEY?.trim() ||
      process.env.SOLANA_PRIVATE_KEY?.trim();
    const isDedicatedWalletConfigured = Boolean(configuredKey);

    let address = "Ephemeral (Generated on-demand for free tier)";
    let irysBalanceAtomic = "0";
    let irysBalanceFormatted = "0.00 SOL";

    if (configuredKey) {
      try {
        const uploader = await Uploader(Solana)
          .withRpc(
            process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com"
          )
          .devnet()
          .withWallet(configuredKey);

        address = uploader.address;
        const bal = await uploader.getBalance();
        irysBalanceAtomic = bal.toString();
        irysBalanceFormatted = `${Number(bal) / 1e9} SOL`;
      } catch {
        address = "Configured (Error connecting to RPC)";
      }
    }

    return NextResponse.json({
      status: "operational",
      isDedicatedWalletConfigured,
      platformAddress: address,
      irysBalance: irysBalanceFormatted,
      irysBalanceAtomic,
      tiers: {
        tier1_irys_free: {
          status: "active",
          limit: "100 KiB",
          cost: "0 SOL (100% Free)",
        },
        tier2_irys_funded: {
          status: isDedicatedWalletConfigured ? "ready" : "optional",
          description:
            "Used automatically for >100 KiB payloads if dedicated key provided",
        },
        tier3_ipfs_pinata: {
          status: process.env.PINATA_JWT ? "active" : "standby",
          description: "Decentralized IPFS failover",
        },
        tier4_self_hosted: {
          status: "active",
          description:
            "Zero-dependency local/CDN fallback guaranteed 100% uptime",
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Diagnostics failed";
    return NextResponse.json({ status: "error", error: msg }, { status: 500 });
  }
}
