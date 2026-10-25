import { NextResponse } from "next/server";
import { applyForPartner } from "../../../lib/partner-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (
      !body.name?.trim() ||
      !body.slug?.trim() ||
      !body.payoutWallet?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Partner name, custom link slug, and payout wallet are required.",
        },
        { status: 400 }
      );
    }

    if (body.payoutWallet.trim().length < 32) {
      return NextResponse.json(
        { success: false, error: "Invalid Solana payout wallet address." },
        { status: 400 }
      );
    }

    const partner = applyForPartner({
      name: body.name,
      contactHandle: body.contactHandle || "",
      platformUrl: body.platformUrl || "",
      audienceSize: body.audienceSize || "",
      slug: body.slug,
      payoutWallet: body.payoutWallet,
    });

    return NextResponse.json({ success: true, partner });
  } catch (err: unknown) {
    console.error("Partner application error:", err);
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to submit partner application.",
      },
      { status: 400 }
    );
  }
}
