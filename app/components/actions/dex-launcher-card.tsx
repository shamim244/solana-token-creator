"use client";

import { useState } from "react";
import { useCluster } from "../cluster-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  ExternalLink,
  Zap,
  TrendingUp,
  Droplets,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

export function DexLauncherCard() {
  const { cluster } = useCluster();
  const [mintInput, setMintInput] = useState("");

  const cleanMint = mintInput.trim();

  // Raydium CPMM Pool Launcher URL (No OpenBook Market ID required!)
  const raydiumUrl = cleanMint
    ? `https://raydium.io/liquidity/create-pool/?token1=So11111111111111111111111111111111111111112&token2=${cleanMint}`
    : "https://raydium.io/liquidity/create-pool/";

  // Meteora DLMM Pool Creator URL
  const meteoraUrl = cleanMint
    ? `https://app.meteora.ag/dlmm/create?tokenA=So11111111111111111111111111111111111111112&tokenB=${cleanMint}`
    : "https://app.meteora.ag/dlmm/create";

  // DexScreener Chart & Trading Page
  const dexscreenerUrl = cleanMint
    ? `https://dexscreener.com/solana/${cleanMint}`
    : "https://dexscreener.com/solana";

  // RugCheck Audit & Verification Page
  const rugcheckUrl = cleanMint
    ? `https://rugcheck.xyz/tokens/${cleanMint}`
    : "https://rugcheck.xyz";

  // Birdeye Analytics
  const birdeyeUrl = cleanMint
    ? `https://birdeye.so/token/${cleanMint}${
        cluster === "devnet" ? "?chain=solana-devnet" : ""
      }`
    : "https://birdeye.so";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Droplets className="h-5 w-5 text-amber-500" />
            1-Click DEX Liquidity & Launchpad
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Instantly launch a liquidity pool on Raydium or Meteora with your
            mint address pre-populated. Monitor your chart on DexScreener and
            verify your score on RugCheck.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">
            Target Token Mint Address
          </label>
          <Input
            type="text"
            placeholder="Paste your created token mint address (e.g., DezXAZ...)"
            value={mintInput}
            onChange={(e) => setMintInput(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
      </div>

      {/* Launchpad Cards Grid */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* 1. Raydium CPMM Pool */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3 flex flex-col justify-between hover:border-amber-500/50 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Raydium CPMM Pool
              </span>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-semibold">
                Cheapest / No Market ID
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Raydium Constant Product (CPMM) allows instant liquidity pool
              creation for ~0.4 SOL without needing to purchase an expensive
              OpenBook Market ID (saves 2.8 SOL).
            </p>
          </div>

          <Button
            variant="default"
            disabled={!cleanMint}
            onClick={() => window.open(raydiumUrl, "_blank")}
            className="w-full text-xs cursor-pointer font-semibold"
          >
            Open Raydium CPMM <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* 2. Meteora DLMM */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3 flex flex-col justify-between hover:border-sky-500/50 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky-400" />
                Meteora DLMM Pool
              </span>
              <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-full font-semibold">
                Dynamic Fees
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Meteora Dynamic Liquidity Market Maker (DLMM) offers concentrated
              liquidity with dynamic fee capture during high volatility.
            </p>
          </div>

          <Button
            variant="outline"
            disabled={!cleanMint}
            onClick={() => window.open(meteoraUrl, "_blank")}
            className="w-full text-xs cursor-pointer font-semibold"
          >
            Open Meteora DLMM <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* 3. DexScreener */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3 flex flex-col justify-between hover:border-emerald-500/50 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                DexScreener Chart
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                Live Analytics
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Track live candlestick charts, liquidity depth, buy/sell volume,
              and top holders once liquidity has been seeded.
            </p>
          </div>

          <Button
            variant="outline"
            disabled={!cleanMint}
            onClick={() => window.open(dexscreenerUrl, "_blank")}
            className="w-full text-xs cursor-pointer font-semibold"
          >
            Open DexScreener <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* 4. RugCheck */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3 flex flex-col justify-between hover:border-purple-500/50 transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-400" />
                RugCheck Verification
              </span>
              <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full font-semibold">
                Audit Score
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verify your token&apos;s safety score. Displays green badges for
              revoked freeze and mint authorities, giving investors peace of
              mind.
            </p>
          </div>

          <Button
            variant="outline"
            disabled={!cleanMint}
            onClick={() => window.open(rugcheckUrl, "_blank")}
            className="w-full text-xs cursor-pointer font-semibold"
          >
            Check RugCheck Audit <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* 5. Birdeye */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-3 flex flex-col justify-between hover:border-orange-500/50 transition-colors sm:col-span-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-400" />
                Birdeye Analytics & Security Overview
              </span>
              <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full font-semibold">
                Token Analytics
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Analyze on-chain trading momentum, holder distributions, top
              traders, and historical DEX volume across Solana.
            </p>
          </div>

          <Button
            variant="outline"
            disabled={!cleanMint}
            onClick={() => window.open(birdeyeUrl, "_blank")}
            className="w-full text-xs cursor-pointer font-semibold"
          >
            Open Birdeye Overview <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* Pro Launch Checklist */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-amber-500" />
          Pre-Liquidity Launch Checklist
        </h3>
        <div className="grid sm:grid-cols-3 gap-3 pt-1">
          <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-1">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              1. Revoke Freeze
            </span>
            <p className="text-[11px] text-muted-foreground">
              Required by Raydium & DexScreener so trading is not blocked.
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-1">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              2. Revoke Mint
            </span>
            <p className="text-[11px] text-muted-foreground">
              Proves supply cannot be inflated by rogue team members.
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-1">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              3. Seed Liquidity
            </span>
            <p className="text-[11px] text-muted-foreground">
              Pair your token with SOL on Raydium CPMM and lock LP tokens.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
