"use client";

import { useState } from "react";
import { Button } from "../../ui/button";
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  PlusCircle,
} from "lucide-react";
import { ellipsify } from "../../../lib/explorer";
import { toast } from "sonner";

interface StepSuccessProps {
  tokenData: {
    name: string;
    symbol: string;
    decimals: number;
    supply: string;
    imageUrl: string;
  };
  mintAddress: string;
  txSignature: string;
  getExplorerUrl: (path: string) => string;
  cluster: string;
  onReset: () => void;
}

export function StepSuccess({
  tokenData,
  mintAddress,
  txSignature,
  getExplorerUrl,
  cluster,
  onReset,
}: StepSuccessProps) {
  const [copiedMint, setCopiedMint] = useState(false);
  const [copiedTx, setCopiedTx] = useState(false);

  const handleCopyMint = async () => {
    try {
      await navigator.clipboard.writeText(mintAddress);
      setCopiedMint(true);
      toast.success("Mint address copied to clipboard!");
      setTimeout(() => setCopiedMint(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleCopyTx = async () => {
    try {
      await navigator.clipboard.writeText(txSignature);
      setCopiedTx(true);
      toast.success("Transaction signature copied!");
      setTimeout(() => setCopiedTx(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const clusterParam = cluster === "mainnet" ? "" : `?cluster=${cluster}`;
  const solscanUrl = `https://solscan.io/token/${mintAddress}${clusterParam}`;
  const dexScreenerUrl = `https://dexscreener.com/solana/${mintAddress}`;
  const raydiumUrl = `https://raydium.io/liquidity/create/?baseMint=${mintAddress}`;

  return (
    <div className="space-y-6 text-center py-4">
      {/* Success Badge */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-lg">
        <CheckCircle2 className="h-9 w-9" />
      </div>

      <div className="space-y-1">
        <h2 className="text-2xl font-black tracking-tight text-foreground">
          ${tokenData.symbol} Deployed Successfully!
        </h2>
        <p className="text-xs text-muted-foreground">
          {tokenData.name} ({Number(tokenData.supply).toLocaleString()} tokens)
          has been minted and delivered directly to your wallet.
        </p>
      </div>

      {/* Mint Address Box */}
      <div className="rounded-xl border border-border/80 bg-background/90 p-4 text-left space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground">
            Token Mint Address (CA)
          </span>
          <button
            type="button"
            onClick={handleCopyMint}
            className="flex cursor-pointer items-center gap-1 text-xs font-medium text-amber-400 hover:underline"
          >
            {copiedMint ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copiedMint ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="font-mono text-xs font-bold text-foreground break-all bg-card/60 rounded-lg p-2.5 border border-border/60">
          {mintAddress}
        </p>

        {txSignature && (
          <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Tx Signature:</span>
            <button
              type="button"
              onClick={handleCopyTx}
              className="flex items-center gap-1 font-mono text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {ellipsify(txSignature, 8)}
              {copiedTx ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Action Links Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-medium">
        <a
          href={getExplorerUrl(`/address/${mintAddress}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card p-3 transition-all hover:bg-secondary/70 hover:border-amber-500/40"
        >
          <span>Solana Explorer</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </a>

        <a
          href={solscanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card p-3 transition-all hover:bg-secondary/70 hover:border-amber-500/40"
        >
          <span>Solscan</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </a>

        <a
          href={dexScreenerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card p-3 transition-all hover:bg-secondary/70 hover:border-amber-500/40"
        >
          <span>DexScreener</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </a>

        <a
          href={raydiumUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 p-3 transition-all hover:bg-emerald-500/20"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Create Raydium Pool</span>
        </a>
      </div>

      <div className="pt-2">
        <Button
          onClick={onReset}
          variant="outline"
          className="w-full gap-2 text-xs"
        >
          <PlusCircle className="h-4 w-4" />
          Create Another Token
        </Button>
      </div>
    </div>
  );
}
