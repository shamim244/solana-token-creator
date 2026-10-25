"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Coins,
  ShieldCheck,
  TrendingUp,
  Zap,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

export default function PartnersPage() {
  const [name, setName] = useState("");
  const [contactHandle, setContactHandle] = useState("");
  const [platformUrl, setPlatformUrl] = useState("");
  const [audienceSize, setAudienceSize] = useState("");
  const [slug, setSlug] = useState("");
  const [payoutWallet, setPayoutWallet] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim() || !payoutWallet.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("Submitting your partner application...");

    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contactHandle: contactHandle.trim(),
          platformUrl: platformUrl.trim(),
          audienceSize: audienceSize.trim(),
          slug: slug.trim(),
          payoutWallet: payoutWallet.trim(),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to submit application");
      }

      toast.success("Application submitted successfully!", { id: toastId });
      setSubmitted(true);
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to submit application",
        { id: toastId }
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400">
          <Sparkles className="h-3.5 w-3.5" /> Exclusive Creator & KOL Partner
          Program
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
          Earn Up to 40% Commission with{" "}
          <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 bg-clip-text text-transparent">
            Solana Token Studio
          </span>
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          Monetize your audience by partnering with the premier non-custodial
          Solana launchpad. Get a custom branded partner link, give your
          community exclusive creation fee discounts, and withdraw your SOL
          earnings on demand.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/partners/dashboard"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-transparent px-4 py-2 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
          >
            Existing Partners: Open Dashboard
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      </div>

      {/* 4 Pillars of Partner Perks */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
          <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
            <Coins className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-sm text-foreground">High Commission</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Earn 20% to 40% on every token created and authority revoked by your
            audience.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
            <TrendingUp className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-sm text-foreground">
            Audience Discounts
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Give your community an exclusive 10% discount on platform creation
            fees using your link.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
          <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
            <Zap className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-sm text-foreground">
            Custom Link Slug
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Personalized URL like{" "}
            <code className="text-amber-400 font-mono text-[11px]">
              ?partner=yourbrand
            </code>{" "}
            for easy sharing.
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 space-y-2">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <h3 className="font-bold text-sm text-foreground">
            On-Demand Payouts
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Track live clicks and conversions, then claim your accumulated SOL
            commission anytime.
          </p>
        </div>
      </div>

      {/* Application Form Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm max-w-2xl mx-auto space-y-6">
        {submitted ? (
          <div className="text-center space-y-4 py-8">
            <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Application Submitted!
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
              Thank you for applying to the Solana Token Studio Partner Program.
              Our team will review your application within 24 hours. Once
              approved, your custom link{" "}
              <code className="text-amber-400 font-mono">?partner={slug}</code>{" "}
              will activate immediately.
            </p>
            <div className="pt-2">
              <Link
                href="/partners/dashboard"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors"
              >
                Go to Partner Portal{" "}
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-500" />
                Apply for the Partner Program
              </h2>
              <p className="text-xs text-muted-foreground">
                Fill in your details below. Approvals are processed within 24
                hours.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Partner / Brand Name <span className="text-red-400">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Crypto Gems / Alex Dev"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Telegram / 𝕏 Contact Handle
                </label>
                <Input
                  type="text"
                  placeholder="e.g., @cryptoking_sol"
                  value={contactHandle}
                  onChange={(e) => setContactHandle(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Primary Channel / Community URL
                </label>
                <Input
                  type="url"
                  placeholder="https://youtube.com/@channel or t.me/..."
                  value={platformUrl}
                  onChange={(e) => setPlatformUrl(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Estimated Audience Size
                </label>
                <Input
                  type="text"
                  placeholder="e.g., 20,000 Telegram Members"
                  value={audienceSize}
                  onChange={(e) => setAudienceSize(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Desired Partner Link Slug{" "}
                <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g., moonshot"
                  value={slug}
                  onChange={(e) =>
                    setSlug(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "")
                    )
                  }
                  className="font-mono text-xs pl-28"
                  required
                />
                <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">
                  ?partner=
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Your unique link will be:{" "}
                <span className="text-amber-400 font-mono">
                  yourapp.com/?partner={slug || "yourbrand"}
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Solana Payout Wallet Address{" "}
                <span className="text-red-400">*</span>
              </label>
              <Input
                type="text"
                placeholder="Paste your Solana wallet address for SOL commission payouts"
                value={payoutWallet}
                onChange={(e) => setPayoutWallet(e.target.value.trim())}
                className="font-mono text-xs"
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Commissions will be withdrawn and paid directly to this wallet.
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              variant="default"
              className="w-full py-2.5 text-xs font-semibold cursor-pointer mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting Application...
                </>
              ) : (
                "Submit Partner Application"
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
