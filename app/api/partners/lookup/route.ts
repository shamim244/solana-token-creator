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

    const queryKey = (wallet || slug || "").trim();
    let partner = await findPartner(queryKey);

    // If not found and input looks like a valid Solana address, auto-register as general referrer
    if (!partner && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(queryKey)) {
      partner = await getOrCreateWalletReferrer(queryKey);
    }

    if (!partner) {
      return NextResponse.json(
        { success: false, error: "Invalid discount or referral code." },
        { status: 404 }
      );
    }

    const settings = getPlatformSettings();
    const rates = getPartnerRates(partner, settings);

    // If query is by slug / code (public user redeeming code):
    if (slug && !wallet) {
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

    // If query is by wallet (partner viewing their private dashboard):
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
