import { NextResponse } from "next/server";
import { getPlatformSettings } from "../../lib/platform-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = getPlatformSettings();
    return NextResponse.json({
      success: true,
      settings: {
        // Fees
        mainnetBaseFeeSol: settings.mainnetBaseFeeSol,
        devnetBaseFeeSol: settings.devnetBaseFeeSol,
        revokeFreezeFeeSol: settings.revokeFreezeFeeSol,
        revokeMintFeeSol: settings.revokeMintFeeSol,
        revokeUpdateFeeSol: settings.revokeUpdateFeeSol,
        absorbNetworkRent: settings.absorbNetworkRent,
        treasuryWalletAddress: settings.treasuryWalletAddress,

        // Marketing & Branding
        promoDiscountPercent: settings.promoDiscountPercent,
        promoBannerActive: settings.promoBannerActive,
        promoBannerText: settings.promoBannerText,
        referralProgramActive: settings.referralProgramActive,
        referralFeeSharePercent: settings.referralFeeSharePercent,
        platformTitle: settings.platformTitle,
        platformTagline: settings.platformTagline,
        supportTelegram: settings.supportTelegram,
        supportTwitter: settings.supportTwitter,
        supportDiscord: settings.supportDiscord,
        maintenanceMode: settings.maintenanceMode,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load settings";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
