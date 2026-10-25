"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { ClusterSelect } from "./cluster-select";
import { WalletButton } from "./wallet-button";
import { Coins, Gift, Sparkles } from "lucide-react";

export function AppHeader() {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 font-bold shadow-sm shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Solana Token Studio
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </span>
              <p className="text-[10px] text-muted-foreground font-mono">
                SPL & Token-2022 Launchpad
              </p>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/referral"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
            >
              <Gift className="h-3.5 w-3.5 text-amber-400" />
              Refer & Earn
              <span className="rounded-full bg-amber-500/20 text-amber-400 px-1.5 py-0.2 text-[9px] font-bold border border-amber-500/30">
                15%
              </span>
            </Link>
            <Link
              href="/partners"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              VIP Partners
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <ClusterSelect />
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
