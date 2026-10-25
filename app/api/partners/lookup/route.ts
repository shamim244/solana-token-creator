import { NextResponse } from "next/server";
import { findPartner, getPartnersStore } from "../../../lib/partner-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");
    const slug = searchParams.get("slug");

    if (!wallet && !slug) {
      return NextResponse.json(
        { success: false, error: "Provide wallet or slug parameter." },
        { status: 400 }
      );
    }

    const partner = await findPartner(wallet || slug || "");

    if (!partner) {
      return NextResponse.json(
        { success: false, error: "Partner not found." },
        { status: 404 }
      );
    }

    // If query is by slug (public creator landing on site via partner link):
    if (slug && !wallet) {
      return NextResponse.json({
        success: true,
        partner: {
          slug: partner.slug,
          name: partner.name,
          audienceDiscountPercent: partner.audienceDiscountPercent || 0,
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
      partner,
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
