import { NextResponse } from "next/server";
import { recordPartnerConversion } from "../../../lib/partner-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { slugOrWallet, userWallet, type, feeSol, txSignature } = body;

    if (!slugOrWallet || !userWallet || typeof feeSol !== "number") {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const conversion = recordPartnerConversion({
      slugOrWallet,
      userWallet,
      type: type || "token_create",
      feeSol,
      txSignature,
    });

    if (!conversion) {
      return NextResponse.json(
        { success: false, message: "No active partner matched" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, conversion });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to record conversion";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
