import { NextResponse } from "next/server";
import {
  findPartner,
  getPartnersStore,
  getPartnerRates,
  getOrCreateWalletReferrer,
} from "../../../lib/partner-service";
import { getPlatformSettings } from "../../../lib/platform-settings";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");
    const slug = searchParams.get("slug") || searchParams.get("code");

    if (!wallet && !slug) {
      return NextResponse.json(
        { success: false, error: "Provide wallet, slug, or code parameter." },
        { status: 400 }
      );
    }

    const settings = getPlatformSettings();

    // 1. PUBLIC CODE / SLUG LOOKUP (Visitor redeeming a discount code)
    if (slug && !wallet) {
      const cleanSlug = slug.trim();
      let partner = await findPartner(cleanSlug);

      // If not found and input looks like a valid Solana address, auto-register as community referrer
      if (!partner && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(cleanSlug)) {
        partner = await getOrCreateWalletReferrer(cleanSlug);
      }

      if (!partner) {
        return NextResponse.json(
          { success: false, error: "Invalid discount or referral code." },
          { status: 404 }
        );
      }

      const rates = getPartnerRates(partner, settings);
      return NextResponse.json({
        success: true,
        partner: {
          slug: partner.slug,
          name: partner.name,
          tier: rates.tier,
          audienceDiscountPercent: rates.audienceDiscountPercent,
          commissionPercent: rates.commissionPercent,
          status: partner.status,
        },
      });
    }

    // 2. PRIVATE PARTNER DASHBOARD LOOKUP (By wallet)
    if (wallet) {
      const cleanWallet = wallet.trim();
      const partner = await findPartner(cleanWallet);

      if (!partner) {
        return NextResponse.json(
          {
            success: false,
            notFound: true,
            error: "No partner or referral account found for this wallet.",
          },
          { status: 404 }
        );
      }

      const rates = getPartnerRates(partner, settings);
      const store = await getPartnersStore();
      const partnerConversions = store.conversions
        .filter((c) => c.partnerId === partner.id)
        .slice(-20)
        .reverse();

      const partnerPayouts = store.payouts
        .filter((p) => p.partnerId === partner.id)
        .slice(-10)
        .reverse();

      return NextResponse.json({
        success: true,
        isVipPartner: rates.tier === "partner",
        isReferrer: rates.tier === "referrer",
        partner: {
          ...partner,
          tier: rates.tier,
          effectiveCommissionPercent: rates.commissionPercent,
          effectiveAudienceDiscountPercent: rates.audienceDiscountPercent,
        },
        rates,
        conversions: partnerConversions,
        payouts: partnerPayouts,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Lookup failed",
      },
      { status: 500 }
    );
  }
}
