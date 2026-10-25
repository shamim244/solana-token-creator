import { NextResponse } from "next/server";
import {
  getPartnersStore,
  approvePartner,
  rejectPartner,
  completePayout,
} from "../../../lib/partner-service";

export const dynamic = "force-dynamic";

function verifyAdmin(req: Request): boolean {
  const authHeader = req.headers.get("Authorization");
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";

  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === expectedPassword;
}

export async function GET(req: Request) {
  if (!verifyAdmin(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const store = await getPartnersStore();
  return NextResponse.json({ success: true, store });
}

export async function POST(req: Request) {
  if (!verifyAdmin(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === "approve") {
      const updated = await approvePartner({
        partnerId: body.partnerId,
        customCommissionPercent:
          body.customCommissionPercent !== undefined
            ? parseFloat(body.customCommissionPercent)
            : undefined,
        audienceDiscountPercent:
          body.audienceDiscountPercent !== undefined
            ? parseFloat(body.audienceDiscountPercent)
            : undefined,
      });
      return NextResponse.json({ success: true, partner: updated });
    }

    if (action === "reject") {
      const ok = await rejectPartner(body.partnerId);
      return NextResponse.json({ success: ok });
    }

    if (action === "complete_payout") {
      const payout = await completePayout({
        payoutId: body.payoutId,
        txSignature: body.txSignature,
      });
      return NextResponse.json({ success: true, payout });
    }

    return NextResponse.json(
      { success: false, error: "Invalid admin partner action" },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Failed to execute partner action",
      },
      { status: 400 }
    );
  }
}
