import { NextResponse } from "next/server";
import {
  getPlatformSettings,
  savePlatformSettings,
  type PlatformSettings,
} from "../../../lib/platform-settings";

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

  const settings = getPlatformSettings();
  return NextResponse.json({ success: true, settings });
}

export async function POST(req: Request) {
  if (!verifyAdmin(req)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as Partial<PlatformSettings>;

    // Basic validation
    if (body.treasuryWalletAddress && body.treasuryWalletAddress.length < 32) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Solana treasury wallet address format",
        },
        { status: 400 }
      );
    }

    const updated = savePlatformSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save settings";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
