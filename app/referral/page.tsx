"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../lib/client-provider";
import { useCluster } from "../components/cluster-context";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Copy,
  CheckCircle2,
  Coins,
  Users,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Loader2,
  Gift,
  RefreshCw,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import type {
  PartnerConversion,
  PartnerPayoutClaim,
} from "../lib/partner-service";

interface ReferrerData {
  id: string;
  name: string;
  slug: string;
  payoutWallet: string;
  status: string;
  tier: "referrer";
  clicks: number;
  walletsConnected: number;
  conversionsCount: number;
  totalVolumeSol: number;
  lifetimeEarningsSol: number;
  unclaimedBalanceSol: number;
  claimedPayoutsSol: number;
  createdAt: string;
}

export default function ReferralPage() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster } = useCluster();

  const userWallet = connected?.account.address
    ? address(connected.account.address)
    : undefined;

  const [loading, setLoading] = useState(false);
  const [referrer, setReferrer] = useState<ReferrerData | null>(null);
  const [rates, setRates] = useState<{
    commissionPercent: number;
    discountPercent: number;
  }>({
    commissionPercent: 15,
    discountPercent: 5,
  });
  const [conversions, setConversions] = useState<PartnerConversion[]>([]);
  const [payouts, setPayouts] = useState<PartnerPayoutClaim[]>([]);
  const [claiming, setClaiming] = useState(false);

  const loadReferralData = useCallback(async () => {
    if (!userWallet) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/referral?wallet=${encodeURIComponent(userWallet)}`
      );
      const data = await res.json();
      if (data.success && data.referrer) {
        setReferrer(data.referrer);
        if (data.rates) {
          setRates(data.rates);
        }
        setConversions(data.conversions || []);
        setPayouts(data.payouts || []);
      } else {
        toast.error(data.error || "Failed to load referral data");
      }
    } catch (err) {
      console.warn("Failed to load referral details:", err);
      toast.error("Could not reach referral service");
    } finally {
      setLoading(false);
    }
  }, [userWallet]);

  useEffect(() => {
    let ignore = false;
    if (userWallet) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadReferralData();
        }
      });
    } else {
      Promise.resolve().then(() => {
        if (!ignore) {
          setReferrer(null);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [userWallet, loadReferralData]);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://solanatokenstudio.app";

  const referralCode = referrer?.slug ? referrer.slug.toUpperCase() : "";
  const referralLink = referrer?.slug ? `${origin}/?ref=${referrer.slug}` : "";

  const handleCopyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast.success(`Copied code "${referralCode}" to clipboard!`);
  };

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    toast.success("Copied referral link to clipboard!", {
      description: referralLink,
    });
  };

  const handleShareTwitter = () => {
    if (!referralLink) return;
    const tweetText = `Launch your Solana token on Solana Token Studio! Use my referral code ${referralCode} to get ${rates.discountPercent}% off platform creation fees:\n\n${referralLink}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      tweetText
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareTelegram = () => {
    if (!referralLink) return;
    const msg = `Deploy Solana tokens with Metaplex V3 and Token-2022. Use my link for ${rates.discountPercent}% off fees: ${referralLink}`;
    const url = `https://t.me/share/url?url=${encodeURIComponent(
      referralLink
    )}&text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleClaimPayout = async () => {
    if (!userWallet || !referrer) return;
    if (referrer.unclaimedBalanceSol < 0.05) {
      toast.error("Minimum withdrawal threshold is 0.05 SOL", {
        description: `Current balance: ${referrer.unclaimedBalanceSol.toFixed(
          3
        )} SOL`,
      });
      return;
    }

    setClaiming(true);
    const toastId = toast.loading("Submitting referral payout claim...");
    try {
      const res = await fetch("/api/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: userWallet }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to submit payout claim");
      }

      toast.success(
        `Claim submitted for ${data.payout.amountSol} SOL! Our automated disbursement engine will send it to your wallet.`,
        { id: toastId }
      );
      await loadReferralData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Claim request failed", {
        id: toastId,
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14 space-y-10">
      {/* Hero Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
          <Sparkles className="h-3.5 w-3.5" />
          Community Referral Program
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
          Refer Friends.{" "}
          <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 bg-clip-text text-transparent">
            Earn SOL.
          </span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Give your friends an instant{" "}
          <span className="font-bold text-emerald-400">
            {rates.discountPercent}% discount
          </span>{" "}
          on token creation. You earn{" "}
          <span className="font-bold text-amber-400">
            {rates.commissionPercent}% commission
          </span>{" "}
          directly in SOL on every token deployed or authority revoked.
        </p>
      </div>

      {/* 3 Value Props Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="rounded-xl border border-border/70 bg-card/60 p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              5% Friend Discount
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Anyone using your code saves 5% on platform fees automatically.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Coins className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              15% SOL Commission
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              You earn 15% of platform fees in real SOL on every launch.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/60 p-4 flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              Zero Paperwork
            </h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              100% permissionless. Instant code generation for any connected
              wallet.
            </p>
          </div>
        </div>
      </div>

      {/* Main Referral Hub Area */}
      {!userWallet ? (
        <div className="rounded-2xl border border-border/80 bg-card/40 p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Connect Your Wallet to View Your Referral Link
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Connect Phantom, Solflare, or Backpack to instantly get your
              unique referral code and track incoming commission payouts.
            </p>
          </div>
          <div className="pt-2">
            <p className="text-[11px] text-muted-foreground font-mono">
              Use the &quot;Connect Wallet&quot; button in the top navigation
              bar to get started.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Referral Link & Sharing Card */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-card/80 to-amber-950/10 p-5 sm:p-7 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Active Referral Account
                </span>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  Your Referral Code & Share Link
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadReferralData}
                  disabled={loading}
                  className="gap-1.5 text-xs h-8"
                >
                  <RefreshCw
                    className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Code Box */}
              <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-2">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  Referral Code (Use at checkout)
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-base sm:text-lg font-bold text-amber-400 tracking-wider bg-card px-3 py-2 rounded-lg border border-border/70 select-all">
                    {referralCode || "LOADING..."}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyCode}
                    className="shrink-0 h-10 px-3.5 gap-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </Button>
                </div>
              </div>

              {/* Link Box */}
              <div className="rounded-xl border border-border/80 bg-background/60 p-4 space-y-2">
                <span className="text-[11px] font-medium text-muted-foreground block">
                  1-Click Direct Link (Auto-applies discount)
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-xs text-muted-foreground bg-card px-3 py-2.5 rounded-lg border border-border/70 truncate select-all">
                    {referralLink || "LOADING..."}
                  </div>
                  <Button
                    variant="amber"
                    size="sm"
                    onClick={handleCopyLink}
                    className="shrink-0 h-10 px-3.5 gap-1.5 font-bold"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/50">
              <span className="text-xs font-semibold text-muted-foreground mr-1">
                Share:
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareTwitter}
                className="text-xs h-8 gap-1.5 hover:text-sky-400 hover:border-sky-500/40"
              >
                Share on X / Twitter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareTelegram}
                className="text-xs h-8 gap-1.5 hover:text-sky-400 hover:border-sky-500/40"
              >
                Share on Telegram
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs h-8 gap-1.5 text-muted-foreground"
              >
                Copy Link
              </Button>
            </div>
          </div>

          {/* Stats Overview Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Clicks Driven
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {referrer?.clicks || 0}
                </span>
                <Users className="h-4 w-4 text-amber-400" />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Wallets Connected
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-sky-400">
                  {referrer?.walletsConnected || 0}
                </span>
                <Wallet className="h-4 w-4 text-sky-400" />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Paid Conversions
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {referrer?.conversionsCount || 0}
                </span>
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
            </div>

            <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Total Volume Driven
              </span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold font-mono text-foreground">
                  {(referrer?.totalVolumeSol || 0).toFixed(2)}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    SOL
                  </span>
                </span>
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
            </div>
          </div>

          {/* Commissions & Claiming Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 rounded-2xl border border-border/80 bg-card/60 p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-400" />
                Commission Earnings Breakdown
              </h3>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-border/50 bg-background/50 p-3.5 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Lifetime Earned
                  </span>
                  <div className="font-mono text-lg font-bold text-emerald-400">
                    {(referrer?.lifetimeEarningsSol || 0).toFixed(3)}{" "}
                    <span className="text-xs">SOL</span>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-background/50 p-3.5 space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Already Claimed
                  </span>
                  <div className="font-mono text-lg font-bold text-foreground">
                    {(referrer?.claimedPayoutsSol || 0).toFixed(3)}{" "}
                    <span className="text-xs">SOL</span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1">
                  <span className="text-[10px] text-amber-400 uppercase font-bold">
                    Unclaimed Balance
                  </span>
                  <div className="font-mono text-lg font-bold text-amber-400">
                    {(referrer?.unclaimedBalanceSol || 0).toFixed(3)}{" "}
                    <span className="text-xs">SOL</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-[11px] text-muted-foreground">
                  Minimum withdrawal threshold:{" "}
                  <span className="font-mono font-semibold text-foreground">
                    0.05 SOL
                  </span>
                  . Transfers are sent to your connected wallet.
                </div>

                <Button
                  variant="amber"
                  size="sm"
                  disabled={
                    claiming ||
                    !referrer ||
                    (referrer.unclaimedBalanceSol || 0) < 0.05
                  }
                  onClick={handleClaimPayout}
                  className="font-bold gap-1.5 shrink-0"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Coins className="h-3.5 w-3.5" />
                      Claim{" "}
                      {(referrer?.unclaimedBalanceSol || 0) >= 0.05
                        ? `${referrer?.unclaimedBalanceSol.toFixed(3)} SOL`
                        : "Commissions"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Payout History Mini-Card */}
            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Recent Claims</span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  ({payouts.length})
                </span>
              </h4>

              {payouts.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No payout claims yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {payouts.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-border/50 bg-background/50 p-2 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono font-bold text-amber-400">
                          {p.amountSol.toFixed(3)} SOL
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(p.requestedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge
                        variant={
                          p.status === "completed" ? "success" : "warning"
                        }
                        className="text-[9px]"
                      >
                        {p.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Conversions Ledger */}
          <div className="rounded-2xl border border-border/80 bg-card/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Attributed Referrals & Token Launches
              </h3>
              <span className="text-[11px] font-mono text-muted-foreground">
                {conversions.length} Total Events
              </span>
            </div>

            {conversions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 p-8 text-center space-y-1.5">
                <Sparkles className="h-6 w-6 text-muted-foreground/60 mx-auto" />
                <h4 className="text-xs font-bold text-foreground">
                  No conversions yet
                </h4>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Share your link with founders, meme coin creators, and trading
                  communities. Every token created through your link will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-[10px] uppercase bg-background/40">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">User Wallet</th>
                      <th className="py-2.5 px-3">Fee Paid</th>
                      <th className="py-2.5 px-3">Your Commission</th>
                      <th className="py-2.5 px-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-mono text-[11px]">
                    {conversions.map((conv) => (
                      <tr key={conv.id} className="hover:bg-secondary/20">
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {new Date(conv.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-foreground capitalize">
                          {conv.type.replace("_", " ")}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {conv.userWallet.slice(0, 4)}...
                          {conv.userWallet.slice(-4)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {conv.totalFeeSol.toFixed(3)} SOL
                        </td>
                        <td className="py-2.5 px-3 font-bold text-emerald-400">
                          +{conv.commissionSol.toFixed(3)} SOL (
                          {conv.commissionPercent}%)
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {conv.txSignature ? (
                            <a
                              href={`https://solana.fm/tx/${conv.txSignature}?cluster=${cluster}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:underline inline-flex items-center gap-1 text-[10px]"
                            >
                              Tx <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Upgrade to VIP Partner Callout */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                VIP Creator & KOL Program
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Have an audience over 1,000 members?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Upgrade to our VIP Partner tier for custom vanity codes (e.g.{" "}
                <code className="text-amber-400 font-mono">
                  ?code=YOURBRAND
                </code>
                ), up to 40% commission rates, and direct Telegram developer
                support.
              </p>
            </div>

            <Link
              href="/partners"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors shrink-0 shadow-sm shadow-amber-500/20"
            >
              Apply for VIP Partner
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
