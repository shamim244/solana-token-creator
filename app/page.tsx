"use client";

import { useState } from "react";
import { TokenWizard } from "./components/wizard/token-wizard";
import { ActionsPanel } from "./components/actions/actions-panel";
import { Badge } from "./components/ui/badge";
import { ShieldCheck, Sparkles, Zap, Coins, Wrench } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"creator" | "tools">("creator");

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        {/* Trust Badges Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="success" className="gap-1 px-3 py-1 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            100% Non-Custodial
          </Badge>
          <Badge variant="warning" className="gap-1 px-3 py-1 text-xs">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            Single-Block Atomic Execution
          </Badge>
          <Badge variant="secondary" className="gap-1 px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
            Raydium & DexScreener Ready
          </Badge>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground">
          Create & Deploy Solana Tokens{" "}
          <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-emerald-400 bg-clip-text text-transparent">
            Without Code
          </span>
        </h1>

        <p className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-2xl mx-auto">
          Deploy SPL tokens with full Metaplex metadata, instant investor trust authority revocations, and automatic ATA creation. 100% client-side signed via Wallet Standard.
        </p>

        {/* Mode Switcher */}
        <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("creator")}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "creator"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Coins className="h-4 w-4" />
            Token Creator Wizard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("tools")}
            className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "tools"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wrench className="h-4 w-4" />
            Solana Utilities & Airdrop
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      {activeTab === "creator" ? (
        <TokenWizard />
      ) : (
        <div className="max-w-4xl mx-auto">
          <ActionsPanel />
        </div>
      )}
    </main>
  );
}
