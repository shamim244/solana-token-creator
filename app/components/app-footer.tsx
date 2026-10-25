"use client";

import Link from "next/link";
import { Coins, ShieldCheck, Zap, Sparkles, ExternalLink } from "lucide-react";
import { useCluster } from "./cluster-context";
import { usePlatformSettings } from "../lib/hooks/use-platform-settings";

export function AppFooter() {
  const { cluster } = useCluster();
  const { settings } = usePlatformSettings();

  return (
    <footer className="mt-20 border-t border-border/60 bg-card/40 backdrop-blur-xs">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 sm:gap-10">
          {/* Brand & Mission (Col 1 & 2) */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-bold shadow-sm shadow-amber-500/20 group-hover:scale-105 transition-transform">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  {settings.platformTitle || "Solana Token Studio"}
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </span>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {settings.platformTagline || "SPL & Token-2022 Launchpad"}
                </p>
              </div>
            </Link>

            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              The premier non-custodial Solana token launchpad and post-launch
              utilities suite. Deploy SPL tokens, revoke authorities, update
              on-chain metadata, and burn supply with single-block atomic
              guarantees.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> Non-Custodial
              </div>
              <div className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                <Zap className="h-3 w-3" /> Metaplex V3
              </div>
              <div className="inline-flex items-center gap-1 rounded-md border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                <Sparkles className="h-3 w-3" /> Raydium Ready
              </div>
            </div>
          </div>

          {/* Column 3: Platform Tools */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Token Tools
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  Token Creator Wizard
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  Batch Multi-Sender / Airdrop
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  Authority Revoker
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  Metadata Updater
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  Token Burner
                </Link>
              </li>
              <li>
                <Link
                  href="/"
                  className="hover:text-foreground transition-colors"
                >
                  1-Click DEX Launcher
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Resources & Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Company & Docs
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link
                  href="/partners"
                  className="hover:text-amber-400 font-medium text-amber-400/90 transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="h-3 w-3 text-amber-400" />
                  Partner & Affiliate Program
                </Link>
              </li>
              <li>
                <Link
                  href="/partners/dashboard"
                  className="hover:text-foreground transition-colors"
                >
                  Partner Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-foreground transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-foreground transition-colors"
                >
                  Contact & Support
                </Link>
              </li>
              <li>
                <Link
                  href="/contact#faq"
                  className="hover:text-foreground transition-colors"
                >
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <a
                  href="https://rugcheck.xyz"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  RugCheck Verification <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://raydium.io/liquidity/create-pool/"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  Raydium CPMM Pool <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          {/* Column 5: Legal & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Legal & Community
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <Link
                  href="/terms"
                  className="hover:text-foreground transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a
                  href={
                    settings.supportTelegram || "https://t.me/solanatokenstudio"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  Telegram Community <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href={settings.supportTwitter || "https://x.com/solana"}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  Twitter / 𝕏 Updates <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href={settings.supportDiscord || "https://discord.gg/solana"}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  Discord Server <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Status, Copyright & Disclaimer */}
        <div className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>
              Connected to Solana{" "}
              <strong className="text-foreground capitalize font-semibold">
                {cluster}
              </strong>
            </span>
            <span className="text-border">|</span>
            <span>Non-Custodial Client Architecture</span>
          </div>

          <div className="text-center sm:text-right">
            &copy; {new Date().getFullYear()} Solana Token Studio. All rights
            reserved. Built for the Solana ecosystem.
          </div>
        </div>
      </div>
    </footer>
  );
}
