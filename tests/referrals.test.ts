import { describe, it, expect, beforeEach } from "vitest";
import {
  applyForPartner,
  findPartner,
  findVipPartner,
  findReferrer,
  getVipPartners,
  getCommunityReferrers,
  getOrCreateWalletReferrer,
  recordPartnerConversion,
  requestPartnerClaim,
  completePayout,
  savePartnersStore,
  getPartnerRates,
  updatePartnerTerms,
} from "../app/lib/partner-service";
import { getPlatformSettings } from "../app/lib/platform-settings";

describe("Community Referrals vs VIP Partner Segregation Test Suite", () => {
  beforeEach(async () => {
    await savePartnersStore({
      partners: [],
      conversions: [],
      payouts: [],
    });
  });

  it("strictly separates VIP Partner applications from Community Referrers", async () => {
    // 1. VIP Application submitted
    const vipApp = await applyForPartner({
      name: "Solana KOL VIP",
      contactHandle: "@solanakol",
      platformUrl: "https://x.com/solanakol",
      audienceSize: "100k+",
      slug: "solkol",
      payoutWallet: "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU",
    });

    expect(vipApp.tier).toBe("partner");
    expect(vipApp.status).toBe("pending");

    // 2. Community Referrer auto-generated for a regular user
    const referrer = await getOrCreateWalletReferrer(
      "CommunityUserWallet1111111111111111111111111"
    );

    expect(referrer.tier).toBe("referrer");
    expect(referrer.status).toBe("approved");

    // 3. Query segregations
    const vipPartners = await getVipPartners();
    const referrers = await getCommunityReferrers();

    expect(vipPartners.length).toBe(1);
    expect(vipPartners[0].slug).toBe("solkol");
    expect(vipPartners[0].tier).toBe("partner");

    expect(referrers.length).toBe(1);
    expect(referrers[0].payoutWallet).toBe(
      "CommunityUserWallet1111111111111111111111111"
    );
    expect(referrers[0].tier).toBe("referrer");

    // Specialized finders
    const vipFound = await findVipPartner("solkol");
    expect(vipFound).toBeDefined();

    const notVip = await findVipPartner(referrer.slug);
    expect(notVip).toBeUndefined();

    const referrerFound = await findReferrer(referrer.slug);
    expect(referrerFound).toBeDefined();
  });

  it("finds partner or referrer case-insensitively by slug, and case-sensitively by Base58 wallet", async () => {
    const rawWallet = "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU";
    const ref = await getOrCreateWalletReferrer(rawWallet);

    // Look up by original Base58 wallet
    const foundByWallet = await findPartner(rawWallet);
    expect(foundByWallet).toBeDefined();
    expect(foundByWallet?.id).toBe(ref.id);

    // Look up by slug in uppercase
    const foundBySlugUpper = await findPartner(ref.slug.toUpperCase());
    expect(foundBySlugUpper).toBeDefined();
    expect(foundBySlugUpper?.id).toBe(ref.id);

    // Look up by slug in lowercase
    const foundBySlugLower = await findPartner(ref.slug.toLowerCase());
    expect(foundBySlugLower).toBeDefined();
    expect(foundBySlugLower?.id).toBe(ref.id);
  });

  it("calculates exact commission and discount for referrer conversions based on platform settings", async () => {
    const settings = getPlatformSettings();
    const referrer = await getOrCreateWalletReferrer(
      "ReferrerWallet111111111111111111111111111111"
    );

    const rates = getPartnerRates(referrer, settings);
    expect(rates.commissionPercent).toBe(settings.referralFeeSharePercent);
    expect(rates.audienceDiscountPercent).toBe(
      settings.referralDiscountPercent
    );

    // Convert with 0.3 SOL token creation fee
    const conversion = await recordPartnerConversion({
      slugOrWallet: referrer.slug,
      userWallet: "VisitorWallet1111111111111111111111111111",
      type: "token_create",
      feeSol: 0.3,
      txSignature: "tx_mock_conversion_ref_123",
    });

    const expectedCommission =
      Math.round(0.3 * (rates.commissionPercent / 100) * 1000) / 1000;

    expect(conversion).toBeDefined();
    expect(conversion?.commissionSol).toBe(expectedCommission);
    expect(conversion?.commissionPercent).toBe(rates.commissionPercent);

    const updated = await findPartner(referrer.slug);
    expect(updated?.conversionsCount).toBe(1);
    expect(updated?.totalVolumeSol).toBe(0.3);
    expect(updated?.unclaimedBalanceSol).toBe(expectedCommission);
    expect(updated?.lifetimeEarningsSol).toBe(expectedCommission);
  });

  it("processes referrer withdrawal lifecycle through claim and completion", async () => {
    const settings = getPlatformSettings();
    const referrer = await getOrCreateWalletReferrer(
      "EarnReferrer1111111111111111111111111111111"
    );

    const rates = getPartnerRates(referrer, settings);

    // 1. Generate enough commissions to exceed 0.05 SOL threshold
    const feeSol = 0.5;
    const expectedCommission =
      Math.round(feeSol * (rates.commissionPercent / 100) * 1000) / 1000;

    await recordPartnerConversion({
      slugOrWallet: referrer.slug,
      userWallet: "User1",
      type: "token_create",
      feeSol,
    });

    // 2. Submit claim
    const claim = await requestPartnerClaim(referrer.slug);
    expect(claim.status).toBe("pending");
    expect(claim.amountSol).toBe(expectedCommission);

    // Unclaimed balance should be reset
    const afterClaim = await findPartner(referrer.slug);
    expect(afterClaim?.unclaimedBalanceSol).toBe(0);

    // 3. Complete payout
    const completed = await completePayout({
      payoutId: claim.id,
      txSignature: "solana_disbursement_tx_abc_123",
    });

    expect(completed.status).toBe("completed");
    expect(completed.txSignature).toBe("solana_disbursement_tx_abc_123");

    const afterPayout = await findPartner(referrer.slug);
    expect(afterPayout?.claimedPayoutsSol).toBe(expectedCommission);
  });

  it("updates partner terms and custom rates dynamically", async () => {
    const ref = await getOrCreateWalletReferrer(
      "UpgradeWallet1111111111111111111111111111111"
    );
    expect(ref.tier).toBe("referrer");

    // Upgrade to partner tier with custom 25% commission and 8% discount
    const updated = await updatePartnerTerms({
      partnerId: ref.id,
      tier: "partner",
      customCommissionPercent: 25,
      audienceDiscountPercent: 8,
    });

    expect(updated.tier).toBe("partner");
    expect(updated.customCommissionPercent).toBe(25);
    expect(updated.audienceDiscountPercent).toBe(8);

    const settings = getPlatformSettings();
    const rates = getPartnerRates(updated, settings);
    expect(rates.tier).toBe("partner");
    expect(rates.commissionPercent).toBe(25);
    expect(rates.audienceDiscountPercent).toBe(8);
  });
});
