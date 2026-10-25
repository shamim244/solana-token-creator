"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { useCluster } from "../../components/cluster-context";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Users,
  Copy,
  Coins,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  Tag,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type {
  PartnerRecord,
  PartnerConversion,
  PartnerPayoutClaim,
} from "../../lib/partner-service";

export default function PartnerDashboardPage() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster } = useCluster();

  const userWallet = connected?.account.address
    ? address(connected.account.address)
    : undefined;

  const [loading, setLoading] = useState(false);
  const [partner, setPartner] = useState<PartnerRecord | null>(null);
  const [conversions, setConversions] = useState<PartnerConversion[]>([]);
  const [payouts, setPayouts] = useState<PartnerPayoutClaim[]>([]);
  const [notFound, setNotFound] = useState(false);

  const [claiming, setClaiming] = useState(false);

  const loadPartnerData = useCallback(async () => {
    if (!userWallet) return;
    setLoading(true);
    setNotFound(false);

    try {
      const res = await fetch(
        `/api/partners/lookup?wallet=${encodeURIComponent(userWallet)}`
      );
      const data = await res.json();

      if (data.success && data.partner) {
        setPartner(data.partner);
        setConversions(data.conversions || []);
        setPayouts(data.payouts || []);
      } else {
        setNotFound(true);
        setPartner(null);
      }
    } catch (err) {
      console.error("Failed to load partner dashboard:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [userWallet]);

  useEffect(() => {
    let ignore = false;
    if (userWallet) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadPartnerData();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [userWallet, loadPartnerData]);

  const [generatingReferrer, setGeneratingReferrer] = useState(false);

  const handleCopyCode = () => {
    if (!partner) return;
    navigator.clipboard.writeText(partner.slug.toUpperCase());
    toast.success(`Copied code "${partner.slug.toUpperCase()}" to clipboard!`);
  };

  const handleCopyLink = () => {
    if (!partner) return;
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://yourapp.com";
    const fullUrl = `${origin}/?code=${partner.slug}`;
    navigator.clipboard.writeText(fullUrl);
    toast.success("Copied shareable link to clipboard!", {
      description: fullUrl,
    });
  };

  const handleGenerateReferrer = async () => {
    if (!userWallet) return;
    setGeneratingReferrer(true);
    const toastId = toast.loading("Generating your community referral code...");
    try {
      const res = await fetch(
        `/api/partners/lookup?code=${encodeURIComponent(userWallet)}`
      );
      const data = await res.json();
      if (data.success && data.partner) {
        toast.success(
          `Referral code "${data.partner.slug.toUpperCase()}" generated!`,
          { id: toastId }
        );
        await loadPartnerData();
      } else {
        throw new Error(data.error || "Failed to generate referral code");
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create referral code",
        { id: toastId }
      );
    } finally {
      setGeneratingReferrer(false);
    }
  };

  const handleClaim = async () => {
    if (!partner || !userWallet) return;

    if (partner.unclaimedBalanceSol < 0.05) {
      toast.error("Minimum withdrawal amount is 0.05 SOL");
      return;
    }

    setClaiming(true);
    const toastId = toast.loading("Submitting commission withdrawal claim...");

    try {
      const res = await fetch("/api/partners/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: userWallet }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to process withdrawal claim");
      }

      toast.success(
        `Withdrawal claim of ${data.payout.amountSol} SOL submitted!`,
        {
          id: toastId,
          description: "Admin approval / on-chain settlement is queued.",
        }
      );
      loadPartnerData();
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to claim commission",
        { id: toastId }
      );
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-amber-500" />
            Partner Portal & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track link clicks, user conversions, referral fee earnings, and
            request SOL commission payouts.
          </p>
        </div>

        {userWallet && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadPartnerData}
            disabled={loading}
            className="text-xs cursor-pointer h-8"
          >
            <RefreshCw
              className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`}
            />
            Refresh Stats
          </Button>
        )}
      </div>

      {/* Wallet Connection Check */}
      {!userWallet ? (
        <div className="rounded-2xl border border-border/70 bg-card p-10 text-center space-y-4 max-w-lg mx-auto">
          <ShieldCheck className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-foreground">
            Connect Your Payout Wallet
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please connect the Solana wallet address registered with your
            partner account to view your private metrics and withdraw earnings.
          </p>
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-border/60 bg-card p-12 text-center text-xs text-muted-foreground space-y-3">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-amber-500" />
          <span>Verifying partner account on Solana...</span>
        </div>
      ) : notFound ? (
        <div className="rounded-2xl border border-border/70 bg-card p-8 text-center space-y-5 max-w-lg mx-auto">
          <Tag className="h-10 w-10 text-amber-400 mx-auto" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">
              Start Earning as a Referrer or Partner
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The connected wallet (
              <span className="font-mono text-foreground font-semibold">
                {userWallet.slice(0, 4)}...{userWallet.slice(-4)}
              </span>
              ) does not have an active promo code yet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              onClick={handleGenerateReferrer}
              disabled={generatingReferrer}
              className="w-full sm:w-auto text-xs font-semibold cursor-pointer h-9 px-4"
            >
              {generatingReferrer ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Generating Code...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-300" />
                  Instant Referral Code
                </>
              )}
            </Button>

            <Link
              href="/partners"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-secondary/40 text-foreground px-4 py-2 text-xs font-semibold hover:bg-secondary transition-colors"
            >
              Apply for VIP Partner <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </div>
        </div>
      ) : partner?.status === "pending" ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-8 text-center space-y-3 max-w-lg mx-auto">
          <Clock className="h-10 w-10 text-amber-400 mx-auto" />
          <h2 className="text-lg font-bold text-foreground">
            Application Under Review
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your application for code{" "}
            <code className="text-amber-400 font-mono uppercase">
              {partner.slug}
            </code>{" "}
            is currently pending review by the platform team. Approvals are
            processed within 24 hours.
          </p>
        </div>
      ) : (
        /* Approved Partner / Referrer Workspace */
        <div className="space-y-8">
          {/* Partner Share Box */}
          <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-muted-foreground uppercase tracking-wider block font-semibold">
                  Active {partner?.tier === "partner" ? "Partner" : "Referral"}{" "}
                  Account
                </span>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  {partner?.name}
                  <Badge
                    variant={partner?.tier === "partner" ? "success" : "info"}
                    className="text-[10px] py-0 px-2"
                  >
                    {partner?.tier === "partner"
                      ? "🌟 Verified VIP Partner"
                      : "🏷️ Community Referrer"}
                  </Badge>
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-xl border border-border/80 bg-background/80 px-3 py-1.5 text-xs text-foreground">
                  Your Commission:{" "}
                  <strong className="text-amber-400 font-mono">
                    {partner?.customCommissionPercent ??
                      (partner?.tier === "partner" ? 30 : 15)}
                    %
                  </strong>
                </div>
                <div className="rounded-xl border border-border/80 bg-background/80 px-3 py-1.5 text-xs text-foreground">
                  Audience Discount:{" "}
                  <strong className="text-emerald-400 font-mono">
                    {partner?.audienceDiscountPercent ??
                      (partner?.tier === "partner" ? 10 : 5)}
                    % OFF
                  </strong>
                </div>
              </div>
            </div>

            {/* Code & Link Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-amber-400" />
                  Your Discount / Promo Code
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl border border-border/80 bg-background/90 px-3.5 py-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider truncate select-all flex items-center">
                    {partner?.slug.toUpperCase()}
                  </div>
                  <Button
                    type="button"
                    onClick={handleCopyCode}
                    variant="outline"
                    className="text-xs font-semibold shrink-0 cursor-pointer h-10 px-3"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy Code
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
                  Your Direct Share Link
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 rounded-xl border border-border/80 bg-background/90 px-3.5 py-2 text-xs font-mono text-foreground truncate select-all flex items-center">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/?code=${partner?.slug}`
                      : `yourapp.com/?code=${partner?.slug}`}
                  </div>
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    variant="default"
                    className="text-xs font-semibold shrink-0 cursor-pointer h-10 px-4"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Link
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground border-t border-border/40 pt-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>Win-Win Promotion:</strong> Anyone who enters your code
                or clicks your link saves{" "}
                <strong className="text-foreground">
                  {partner?.audienceDiscountPercent ??
                    (partner?.tier === "partner" ? 10 : 5)}
                  %
                </strong>{" "}
                on deployment fees, while you earn{" "}
                <strong className="text-foreground">
                  {partner?.customCommissionPercent ??
                    (partner?.tier === "partner" ? 30 : 15)}
                  %
                </strong>{" "}
                in direct SOL commissions.
              </span>
            </p>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Clicks */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                Link Clicks
              </span>
              <span className="text-2xl font-black text-foreground font-mono block">
                {partner?.clicks.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Unique visitors from your link
              </span>
            </div>

            {/* 2. Wallets Connected */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                Wallets Connected
              </span>
              <span className="text-2xl font-black text-foreground font-mono block">
                {partner?.walletsConnected.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Audience engaged with app
              </span>
            </div>

            {/* 3. Conversions */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                Paid Conversions
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono block">
                {partner?.conversionsCount.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Tokens created & authorities revoked
              </span>
            </div>

            {/* 4. Total Volume */}
            <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                Referred Fee Volume
              </span>
              <span className="text-2xl font-black text-foreground font-mono block">
                {partner?.totalVolumeSol.toFixed(3)} SOL
              </span>
              <span className="text-[11px] text-muted-foreground">
                Total platform fee generated
              </span>
            </div>
          </div>

          {/* Earnings & Payout Box */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold block">
                Available Withdrawable Commission
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-400 font-mono">
                  {partner?.unclaimedBalanceSol.toFixed(3)} SOL
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  (Lifetime Earned: {partner?.lifetimeEarningsSol.toFixed(3)}{" "}
                  SOL)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Payout destination wallet:{" "}
                <span className="font-mono text-foreground font-semibold">
                  {partner?.payoutWallet.slice(0, 6)}...
                  {partner?.payoutWallet.slice(-6)}
                </span>
              </p>
            </div>

            <Button
              type="button"
              onClick={handleClaim}
              disabled={claiming || (partner?.unclaimedBalanceSol || 0) < 0.05}
              variant="default"
              className="text-xs font-semibold py-3 px-6 cursor-pointer shrink-0"
            >
              {claiming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Processing Withdrawal...
                </>
              ) : (
                <>
                  <Coins className="h-4 w-4 mr-1.5" />
                  Withdraw Commission (Min 0.05 SOL)
                </>
              )}
            </Button>
          </div>

          {/* Recent Referral Conversions Activity */}
          <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Recent Referral Activity
              </h3>
              <span className="text-xs text-muted-foreground">
                Last {conversions.length} actions
              </span>
            </div>

            {conversions.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {conversions.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-border/50 bg-background/50 text-xs"
                  >
                    <div className="space-y-0.5">
                      <span className="font-semibold text-foreground capitalize block">
                        {item.type.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Creator: {item.userWallet.slice(0, 4)}...
                        {item.userWallet.slice(-4)} &bull;{" "}
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-400 block">
                        +{item.commissionSol.toFixed(3)} SOL
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.commissionPercent}% cut of {item.totalFeeSol} SOL
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                No referral conversions recorded yet. Share your partner link to
                start earning commissions!
              </p>
            )}
          </div>

          {/* Payout History */}
          {payouts.length > 0 && (
            <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Payout History
              </h3>
              <div className="space-y-2">
                {payouts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-foreground">
                        {p.amountSol.toFixed(3)} SOL
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Requested:{" "}
                        {new Date(p.requestedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          p.status === "completed" ? "success" : "warning"
                        }
                        className="text-[10px]"
                      >
                        {p.status}
                      </Badge>
                      {p.txSignature && p.txSignature !== "manual_confirmed" ? (
                        <a
                          href={`https://explorer.solana.com/tx/${p.txSignature}${
                            cluster === "devnet" ? "?cluster=devnet" : ""
                          }`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-amber-400 hover:underline flex items-center gap-0.5 text-[11px]"
                        >
                          Tx <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
