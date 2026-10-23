"use client";

import { useState } from "react";
import { Badge } from "../ui/badge";
import { ShieldCheck, ShieldAlert, Sparkles, Eye, CheckCircle2, Globe, Send, MessageCircle } from "lucide-react";

export interface TokenPreviewData {
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  description: string;
  imageUrl: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  tags: string[];
  revokeFreeze: boolean;
  revokeMint: boolean;
  revokeUpdate: boolean;
}

export function TokenPreviewCard({ data }: { data: TokenPreviewData }) {
  const [activeTab, setActiveTab] = useState<"wallet" | "dex">("wallet");

  const displayName = data.name.trim() || "My Token";
  const displaySymbol = data.symbol.trim().toUpperCase() || "TOKEN";
  const formattedSupply = (() => {
    try {
      const num = Number(data.supply.replace(/,/g, ""));
      return isNaN(num) || num <= 0 ? "1,000,000,000" : num.toLocaleString();
    } catch {
      return "1,000,000,000";
    }
  })();

  return (
    <div className="sticky top-24 rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-5 shadow-xl transition-all">
      {/* Header with View Tabs */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Live Preview
          </span>
        </div>
        <div className="flex rounded-lg bg-secondary/80 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("wallet")}
            className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-all ${
              activeTab === "wallet"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            Wallet Card
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dex")}
            className={`cursor-pointer rounded-md px-2.5 py-1 font-medium transition-all ${
              activeTab === "dex"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted hover:text-foreground"
            }`}
          >
            DEX Trust Audit
          </button>
        </div>
      </div>

      {/* Tab 1: Phantom Wallet Card */}
      {activeTab === "wallet" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-border/80 bg-background/80 p-4 shadow-sm">
            <div className="flex items-center gap-3.5">
              {data.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.imageUrl}
                  alt={displayName}
                  className="h-14 w-14 rounded-full border border-border object-cover shadow-sm"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%23f59e0b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3Cpath d='M12 6v12'/%3E%3Cpath d='M15 9H9'/%3E%3C/svg%3E";
                  }}
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500/20 via-primary/30 to-emerald-500/20 border border-amber-500/30 text-amber-400 font-bold text-lg shadow-inner">
                  {displaySymbol.slice(0, 3)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-base font-bold text-foreground">
                    {displayName}
                  </h3>
                  <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                    {data.decimals} Decimals
                  </Badge>
                </div>
                <p className="text-xs font-semibold text-amber-400">${displaySymbol}</p>
                <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-foreground">
                  {formattedSupply}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    {displaySymbol}
                  </span>
                </p>
              </div>
            </div>

            {data.description && (
              <p className="mt-3.5 border-t border-border/50 pt-2.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {data.description}
              </p>
            )}

            {/* Social pills */}
            {(data.website || data.twitter || data.telegram || data.discord) && (
              <div className="mt-3 flex flex-wrap gap-2 pt-1 border-t border-border/40">
                {data.website && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Globe className="h-3 w-3 text-emerald-400" />
                    Web
                  </span>
                )}
                {data.twitter && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span className="font-bold text-sky-400">𝕏</span>
                    Twitter
                  </span>
                )}
                {data.telegram && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Send className="h-3 w-3 text-cyan-400" />
                    TG
                  </span>
                )}
                {data.discord && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MessageCircle className="h-3 w-3 text-indigo-400" />
                    Discord
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-border/80 bg-secondary/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: DEX Trust & Scanner Audit */}
      {activeTab === "dex" && (
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-border/80 bg-background/80 p-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-xs font-semibold text-foreground">
                RugCheck / DEX Scanner Score
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                <Sparkles className="h-3 w-3" />
                {data.revokeFreeze && data.revokeMint ? "Good (Safe)" : "Warning"}
              </span>
            </div>

            <div className="mt-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {data.revokeFreeze ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                  )}
                  <span>Freeze Authority</span>
                </div>
                <span
                  className={`font-semibold ${
                    data.revokeFreeze ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {data.revokeFreeze ? "Revoked (Safe)" : "Retained"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {data.revokeMint ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                  )}
                  <span>Mint Authority</span>
                </div>
                <span
                  className={`font-semibold ${
                    data.revokeMint ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {data.revokeMint ? "Revoked (Fixed Supply)" : "Retained (Can inflate)"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {data.revokeUpdate ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>Metadata Mutability</span>
                </div>
                <span
                  className={`font-semibold ${
                    data.revokeUpdate ? "text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  {data.revokeUpdate ? "Immutable" : "Mutable"}
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            DexScreener, Birdeye, and Raydium check for revoked Freeze Authority before granting verified green checkmarks to prevent honeypot accusations.
          </p>
        </div>
      )}

      {/* Security Footer Notice */}
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
        <span>100% Non-Custodial: All minting instructions execute atomically in your wallet.</span>
      </div>
    </div>
  );
}
