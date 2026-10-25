import { NextResponse } from "next/server";
import { recordPartnerClick } from "../../../lib/partner-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { slug } = await req.json();
    if (!slug) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const recorded = await recordPartnerClick(slug);
    return NextResponse.json({ success: recorded });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
