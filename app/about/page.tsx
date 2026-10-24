import type { Metadata } from "next";
import Link from "next/link";
import {
  Coins,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowLeft,
  Flame,
  Droplets,
  Layers,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | Solana Token Studio",
  description:
    "Learn about our mission, non-custodial architecture, and enterprise Solana token suite.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16 space-y-12">
      {/* Back to Home */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Token Studio
      </Link>

      {/* Hero */}
      <div className="space-y-4 text-center sm:text-left border-b border-border/60 pb-8">
        <div className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-400">
          <Coins className="h-3.5 w-3.5" /> Next-Gen Solana Infrastructure
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
          Built for Creators, Founders, and Communities on Solana
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl">
          Solana Token Studio was built to democratize token deployment. We
          eliminate the complexity of Rust development, CLI scripts, and
          custodial middlemen, giving creators a professional, non-custodial
          launchpad in seconds.
        </p>
      </div>

      {/* Architecture Highlights Grid */}
      <div className="space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-foreground">
          Why Builders Choose Solana Token Studio
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              100% Non-Custodial Security
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We never hold keys or custody tokens. Every action—from minting
              and metadata creation to authority revocations—is composed in your
              browser and signed directly in your connected wallet.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              Single-Block Atomic Execution
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Mint initialization, ATA creation, supply distribution, Metaplex
              V3 metadata registration, and authority revocations are batched
              into a single atomic transaction. Either all instructions succeed
              or none do—no stranded tokens.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              Metaplex & RugCheck Ready
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tokens adhere to official Metaplex Token Metadata V3 standards,
              ensuring instant compatibility with Phantom, Solflare, Birdeye,
              DexScreener, Raydium, and Meteora with verified green safety
              scores.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-6 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base text-foreground">
              Permanent Decentralized Storage
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Token logos and metadata JSONs are uploaded to decentralized
              storage networks (Irys and Arweave / IPFS), guaranteeing your
              token branding remains permanently accessible without hosting
              costs.
            </p>
          </div>
        </div>
      </div>

      {/* Complete Ecosystem Suite */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">
            The Complete Lifecycle Suite
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
            Token deployment is only step one. Solana Token Studio equips you
            with the complete toolkit required for successful post-launch token
            management:
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 p-3 rounded-xl border border-border/50 bg-background/50">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Standalone
              Revoker
            </span>
            <p className="text-[11px] text-muted-foreground">
              Revoke Freeze, Mint, or Update authorities on any token at any
              time.
            </p>
          </div>

          <div className="space-y-1.5 p-3 rounded-xl border border-border/50 bg-background/50">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-400" /> Token Burner
            </span>
            <p className="text-[11px] text-muted-foreground">
              Permanently burn tokens from your wallet to reduce circulating
              supply.
            </p>
          </div>

          <div className="space-y-1.5 p-3 rounded-xl border border-border/50 bg-background/50">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-sky-400" /> DEX Launcher
            </span>
            <p className="text-[11px] text-muted-foreground">
              1-click deep links directly into Raydium CPMM & Meteora DLMM pool
              creators.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Box */}
      <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            Ready to Launch Your Solana Token?
          </h3>
          <p className="text-xs text-muted-foreground">
            Deploy in less than 30 seconds with 100% client-side security.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors shadow-xs cursor-pointer shrink-0"
        >
          Open Token Creator <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Link>
      </div>
    </div>
  );
}
