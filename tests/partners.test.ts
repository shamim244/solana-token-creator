import { describe, it, expect, beforeEach } from "vitest";
import {
  applyForPartner,
  findPartner,
  recordPartnerClick,
  recordPartnerWalletConnection,
  recordPartnerConversion,
  requestPartnerClaim,
  approvePartner,
  rejectPartner,
  completePayout,
  savePartnersStore,
} from "../app/lib/partner-service";

describe("Partner & Affiliate Marketing System (Drizzle SQLite Engine)", () => {
  beforeEach(async () => {
    // Reset test store in SQLite database
    await savePartnersStore({
      partners: [],
      conversions: [],
      payouts: [],
    });
  });

  it("submits partner application and sets status to pending", async () => {
    const partner = await applyForPartner({
      name: "Solana Alpha Hunter",
      contactHandle: "@alphahunter",
      platformUrl: "https://x.com/alphahunter",
      audienceSize: "25k+",
      slug: "alphahunter",
      payoutWallet: "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU",
    });

    expect(partner.id).toBeDefined();
    expect(partner.slug).toBe("alphahunter");
    expect(partner.status).toBe("pending");
    expect(partner.clicks).toBe(0);
    expect(partner.unclaimedBalanceSol).toBe(0);

    const lookedUp = await findPartner("alphahunter");
    expect(lookedUp).toBeDefined();
    expect(lookedUp?.name).toBe("Solana Alpha Hunter");
  });

  it("prevents duplicate slugs or payout wallets", async () => {
    await applyForPartner({
      name: "Partner A",
      contactHandle: "@partnerA",
      platformUrl: "https://x.com/partnerA",
      audienceSize: "10k",
      slug: "vip-link",
      payoutWallet: "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU",
    });

    await expect(
      applyForPartner({
        name: "Partner B",
        contactHandle: "@partnerB",
        platformUrl: "https://x.com/partnerB",
        audienceSize: "5k",
        slug: "vip-link",
        payoutWallet: "AnotherWalletAddress1111111111111111111111",
      })
    ).rejects.toThrow('Partner link slug "vip-link" is already taken.');
  });

  it("approves partner with custom commission % and audience discount %", async () => {
    const partner = await applyForPartner({
      name: "VIP Influencer",
      contactHandle: "@vipguy",
      platformUrl: "https://youtube.com/@vipguy",
      audienceSize: "100k",
      slug: "vipguy",
      payoutWallet: "7Z3cW1jK111111111111111111111111111111111111",
    });

    const approved = await approvePartner({
      partnerId: partner.id,
      customCommissionPercent: 35, // Negotiated 35% commission
      audienceDiscountPercent: 10, // 10% discount for their viewers
    });

    expect(approved.status).toBe("approved");
    expect(approved.customCommissionPercent).toBe(35);
    expect(approved.audienceDiscountPercent).toBe(10);
  });

  it("records clicks, wallet connections, and paid conversions with custom rate", async () => {
    const partner = await applyForPartner({
      name: "Crypto Reviewer",
      contactHandle: "@reviewer",
      platformUrl: "https://t.me/reviewer",
      audienceSize: "50k",
      slug: "reviewer",
      payoutWallet: "54Xn6d6X4wHrkZ9eHnC8F2v56yZ8K5j2Q8s7J3k4L5m6",
    });

    await approvePartner({
      partnerId: partner.id,
      customCommissionPercent: 30, // 30% commission
    });

    // 1. Visitor clicks link
    const clickOk = await recordPartnerClick("reviewer");
    expect(clickOk).toBe(true);

    // 2. Visitor connects wallet
    const connectOk = await recordPartnerWalletConnection("reviewer");
    expect(connectOk).toBe(true);

    // 3. User deploys a token with 0.3 SOL creation fee
    const conversion = await recordPartnerConversion({
      slugOrWallet: "reviewer",
      userWallet: "UserWalletAddress11111111111111111111111111",
      type: "token_create",
      feeSol: 0.3,
      txSignature: "mock_signature_solana_12345",
    });

    expect(conversion).toBeDefined();
    // 30% of 0.3 SOL = 0.09 SOL
    expect(conversion?.commissionSol).toBe(0.09);
    expect(conversion?.commissionPercent).toBe(30);

    const updated = await findPartner("reviewer");
    expect(updated?.clicks).toBe(1);
    expect(updated?.walletsConnected).toBe(1);
    expect(updated?.conversionsCount).toBe(1);
    expect(updated?.totalVolumeSol).toBe(0.3);
    expect(updated?.unclaimedBalanceSol).toBe(0.09);
    expect(updated?.lifetimeEarningsSol).toBe(0.09);
  });

  it("handles withdrawal claim threshold and payout completion lifecycle", async () => {
    const partner = await applyForPartner({
      name: "Top Trader",
      contactHandle: "@toptrader",
      platformUrl: "https://x.com/toptrader",
      audienceSize: "15k",
      slug: "toptrader",
      payoutWallet: "TopTraderWallet1111111111111111111111111111",
    });

    await approvePartner({
      partnerId: partner.id,
      customCommissionPercent: 25,
    });

    // Below 0.05 SOL threshold -> should throw
    await recordPartnerConversion({
      slugOrWallet: "toptrader",
      userWallet: "BuyerA",
      type: "token_create",
      feeSol: 0.1, // Commission = 0.025 SOL (< 0.05 SOL)
    });

    await expect(requestPartnerClaim("toptrader")).rejects.toThrow(
      "Minimum withdrawal threshold is 0.05 SOL"
    );

    // Add another conversion to surpass threshold
    await recordPartnerConversion({
      slugOrWallet: "toptrader",
      userWallet: "BuyerB",
      type: "token_create",
      feeSol: 0.2, // Commission = 0.05 SOL -> total = 0.075 SOL
    });

    const payout = await requestPartnerClaim("toptrader");
    expect(payout.amountSol).toBe(0.075);
    expect(payout.status).toBe("pending");

    // Partner unclaimed balance is now 0 SOL
    const partnerAfterClaim = await findPartner("toptrader");
    expect(partnerAfterClaim?.unclaimedBalanceSol).toBe(0);

    // Admin marks payout completed with Solana Tx signature
    const completed = await completePayout({
      payoutId: payout.id,
      txSignature: "on_chain_tx_sig_toptrader_payout_777",
    });

    expect(completed.status).toBe("completed");
    expect(completed.txSignature).toBe("on_chain_tx_sig_toptrader_payout_777");

    const partnerAfterPayout = await findPartner("toptrader");
    expect(partnerAfterPayout?.claimedPayoutsSol).toBe(0.075);
  });

  it("rejects partner application and prevents clicks", async () => {
    const partner = await applyForPartner({
      name: "Spam Submitter",
      contactHandle: "@spammer",
      platformUrl: "https://spam.xyz",
      audienceSize: "0",
      slug: "spam",
      payoutWallet: "SpamWallet11111111111111111111111111111111",
    });

    const rejected = await rejectPartner(partner.id);
    expect(rejected).toBe(true);

    const partnerRecord = await findPartner("spam");
    expect(partnerRecord?.status).toBe("rejected");

    // Clicks on rejected partners are ignored
    const clickOk = await recordPartnerClick("spam");
    expect(clickOk).toBe(false);
  });
});
