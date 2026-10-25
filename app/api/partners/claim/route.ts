import { NextResponse } from "next/server";
import { requestPartnerClaim } from "../../../lib/partner-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { wallet } = await req.json();

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const payout = await requestPartnerClaim(wallet);
    return NextResponse.json({ success: true, payout });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to submit withdrawal request",
      },
      { status: 400 }
    );
  }
}
