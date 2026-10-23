"use client";

import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ArrowLeft, Rocket, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";

interface StepReviewProps {
  data: {
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
  };
  cluster: string;
  isDeploying: boolean;
  onDeploy: () => void;
  onBack: () => void;
}

export function StepReview({
  data,
  cluster,
  isDeploying,
  onDeploy,
  onBack,
}: StepReviewProps) {
  const isMainnet = cluster === "mainnet";

  // Calculate All-Inclusive Flat Fees (Model 1 & Model 2 Hybrid)
  let allInclusiveTotal = 0;
  if (isMainnet) {
    allInclusiveTotal += 0.15; // Base All-Inclusive fee
    if (data.revokeFreeze) allInclusiveTotal += 0.1;
    if (data.revokeMint) allInclusiveTotal += 0.1;
    if (data.revokeUpdate) allInclusiveTotal += 0.1;
  }

  const networkRentSol = 0.009; // Exact Solana on-chain rent for Mint + ATA + Metaplex metadata
  const platformNetFee = isMainnet
    ? Math.max(0, allInclusiveTotal - networkRentSol).toFixed(3)
    : "0.000";
  const displayTotal = isMainnet ? allInclusiveTotal.toFixed(3) : "Free (Devnet)";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Review & Confirmation</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Review your token specifications and on-chain cost breakdown before signing.
        </p>
      </div>

      {/* Summary Box */}
      <div className="rounded-xl border border-border/80 bg-background/90 p-4 space-y-3.5 text-xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
          <div className="flex items-center gap-3">
            {data.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.imageUrl}
                alt={data.name}
                className="h-10 w-10 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                {data.symbol.slice(0, 3)}
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-foreground">{data.name}</p>
              <p className="font-mono text-amber-400 font-semibold">${data.symbol}</p>
            </div>
          </div>
          <Badge variant="warning">{data.decimals} Decimals</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div>
            <span className="text-muted-foreground">Initial Supply:</span>
            <p className="font-mono font-semibold text-foreground">
              {Number(data.supply).toLocaleString()} {data.symbol}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Target Cluster:</span>
            <p className="font-semibold capitalize text-foreground">{cluster}</p>
          </div>
        </div>

        {/* Security checks summary */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              data.revokeFreeze
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Freeze Revoked
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
              data.revokeMint
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Mint Revoked (Fixed)
          </span>
          {data.revokeUpdate && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              Immutable Metadata
            </span>
          )}
        </div>
      </div>

      {/* All-Inclusive Transparent Cost Breakdown */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-xs">
        <div className="flex items-center justify-between font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <span>Total Wallet Outflow</span>
            <Badge variant="success" className="text-[10px] py-0 px-1.5 font-bold">
              All-Inclusive Guarantee
            </Badge>
          </div>
          <span className="font-mono text-amber-400 text-sm font-bold">
            {displayTotal} {isMainnet && "SOL"}
          </span>
        </div>

        <div className="space-y-1.5 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              <span>Solana State Rent (Mint + ATA + Metadata)</span>
              <span className="text-[10px] text-emerald-400 font-medium">(On-chain deposit)</span>
            </span>
            <span className="font-mono text-foreground">~{networkRentSol.toFixed(3)} SOL</span>
          </div>
          {isMainnet && (
            <>
              <div className="flex justify-between">
                <span>Platform Creation & Decentralized Hosting (Net)</span>
                <span className="font-mono text-foreground">{platformNetFee} SOL</span>
              </div>
              {data.revokeFreeze && (
                <div className="flex justify-between text-muted-foreground/80 pl-2">
                  <span>↳ Revoke Freeze Authority Instruction</span>
                  <span className="font-mono text-foreground">+0.100 SOL</span>
                </div>
              )}
              {data.revokeMint && (
                <div className="flex justify-between text-muted-foreground/80 pl-2">
                  <span>↳ Revoke Mint Authority (Capped Supply)</span>
                  <span className="font-mono text-foreground">+0.100 SOL</span>
                </div>
              )}
              {data.revokeUpdate && (
                <div className="flex justify-between text-muted-foreground/80 pl-2">
                  <span>↳ Revoke Update (Immutable Metadata)</span>
                  <span className="font-mono text-foreground">+0.100 SOL</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-300 flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
        <span>
          <strong>100% Trust Guarantee:</strong>{" "}
          {isMainnet ? (
            <>
              Network rent is absorbed from our platform fee. Your Phantom wallet will prompt for{" "}
              <strong>exactly {displayTotal} SOL</strong> — zero hidden surprise fees.
            </>
          ) : (
            <>
              On Devnet, platform creation and authority tools are 100% free of charge. Only standard Solana testnet rent applies.
            </>
          )}
        </span>
      </div>

      <div className="flex justify-between border-t border-border/60 pt-4">
        <Button onClick={onBack} disabled={isDeploying} variant="outline" className="gap-1.5 text-xs">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onDeploy}
          disabled={isDeploying}
          variant="amber"
          className="h-11 px-8 font-bold gap-2 text-sm shadow-md"
        >
          {isDeploying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Broadcasting Transaction...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Deploy Token On-Chain
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
