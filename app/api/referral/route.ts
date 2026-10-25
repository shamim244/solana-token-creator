import { NextResponse } from "next/server";
import {
  getOrCreateWalletReferrer,
  getPartnersStore,
  getPartnerRates,
  requestPartnerClaim,
} from "../../lib/partner-service";
import { getPlatformSettings } from "../../lib/platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    if (!wallet || !wallet.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Connected Solana wallet address is required.",
        },
        { status: 400 }
      );
    }

    const cleanWallet = wallet.trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanWallet)) {
      return NextResponse.json(
        { success: false, error: "Invalid Solana wallet address format." },
        { status: 400 }
      );
    }

    // Auto-generates or retrieves the self-serve referrer account
    const referrer = await getOrCreateWalletReferrer(cleanWallet);
    const settings = getPlatformSettings();
    const rates = getPartnerRates(referrer, settings);

    const store = await getPartnersStore();
    const conversions = store.conversions
      .filter((c) => c.partnerId === referrer.id)
      .slice(-30)
      .reverse();

    const payouts = store.payouts
      .filter((p) => p.partnerId === referrer.id)
      .slice(-15)
      .reverse();

    return NextResponse.json({
      success: true,
      referrer: {
        id: referrer.id,
        name: referrer.name,
        slug: referrer.slug,
        payoutWallet: referrer.payoutWallet,
        status: referrer.status,
        tier: "referrer" as const,
        clicks: referrer.clicks,
        walletsConnected: referrer.walletsConnected,
        conversionsCount: referrer.conversionsCount,
        totalVolumeSol: referrer.totalVolumeSol,
        lifetimeEarningsSol: referrer.lifetimeEarningsSol,
        unclaimedBalanceSol: referrer.unclaimedBalanceSol,
        claimedPayoutsSol: referrer.claimedPayoutsSol,
        createdAt: referrer.createdAt,
      },
      rates: {
        commissionPercent: rates.commissionPercent,
        discountPercent: rates.audienceDiscountPercent,
      },
      conversions,
      payouts,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to load referral account data",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const wallet = body.wallet;

    if (!wallet || typeof wallet !== "string") {
      return NextResponse.json(
        { success: false, error: "Solana wallet address is required." },
        { status: 400 }
      );
    }

    const payout = await requestPartnerClaim(wallet.trim());
    return NextResponse.json({ success: true, payout });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to submit referral withdrawal claim",
      },
      { status: 400 }
    );
  }
}
