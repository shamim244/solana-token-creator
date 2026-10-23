"use client";

import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { ArrowLeft, Rocket, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { usePlatformSettings } from "../../../lib/hooks/use-platform-settings";

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
  const { settings } = usePlatformSettings();

  const networkRentSol = 0.009; // Exact Solana on-chain rent for Mint + ATA + Metaplex metadata
  const isAbsorbed = settings.absorbNetworkRent ?? true;

  // Calculate platform fees based on enabled security features
  let serviceFeeTotal = 0;
  if (isMainnet) {
    serviceFeeTotal += settings.mainnetBaseFeeSol;
    if (data.revokeFreeze) serviceFeeTotal += settings.revokeFreezeFeeSol;
    if (data.revokeMint) serviceFeeTotal += settings.revokeMintFeeSol;
    if (data.revokeUpdate) serviceFeeTotal += settings.revokeUpdateFeeSol;
  }

  // Strategy A (All-Inclusive): Total wallet prompt is exact flat fee, platform absorbs rent
  // Strategy B (Rent On Top): Total wallet prompt is service fee + Solana network rent
  const totalWalletOutflow = isMainnet
    ? isAbsorbed
      ? serviceFeeTotal
      : serviceFeeTotal + networkRentSol
    : 0;

  const platformNetFee = isMainnet
    ? isAbsorbed
      ? Math.max(0, serviceFeeTotal - networkRentSol)
      : serviceFeeTotal
    : 0;

  const displayTotal = isMainnet
    ? `${totalWalletOutflow.toFixed(3)} SOL`
    : "Free (Devnet)";

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

      {/* Transparent Cost Breakdown */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-xs">
        <div className="flex items-center justify-between font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <span>Total Wallet Outflow</span>
            {isMainnet && (
              <Badge
                variant={isAbsorbed ? "success" : "info"}
                className="text-[10px] py-0 px-1.5 font-bold"
              >
                {isAbsorbed ? "All-Inclusive Guarantee" : "Transparent Pass-Through"}
              </Badge>
            )}
          </div>
          <span className="font-mono text-amber-400 text-sm font-bold">
            {displayTotal}
          </span>
        </div>

        <div className="space-y-1.5 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
          {isMainnet ? (
            <>
              <div className="flex justify-between">
                <span>Base Platform Creation Fee</span>
                <span className="font-mono text-foreground">
                  {settings.mainnetBaseFeeSol.toFixed(3)} SOL
                </span>
              </div>
              {data.revokeFreeze && (
                <div className="flex justify-between text-muted-foreground/80 pl-2">
                  <span>↳ Revoke Freeze Authority</span>
                  <span className="font-mono text-foreground">
                    +{settings.revokeFreezeFeeSol.toFixed(3)} SOL
                  </span>
                </div>
              )}
              {data.revokeMint && (
                <div className="flex justify-between text-muted-foreground/80 pl-2">
                  <span>↳ Revoke Mint Authority (Fixed Supply)</span>
                  <span className="font-mono text-foreground">
                    +{settings.revokeMintFeeSol.toFixed(3)} SOL
                  </span>
                </div>
              )}
              {data.revokeUpdate && (
                <div className="flex justify-between text-muted-foreground/80 pl-2">
                  <span>↳ Revoke Update (Immutable Metadata)</span>
                  <span className="font-mono text-foreground">
                    +{settings.revokeUpdateFeeSol.toFixed(3)} SOL
                  </span>
                </div>
              )}

              {isAbsorbed ? (
                <>
                  <div className="flex justify-between pt-1 border-t border-border/30">
                    <span className="flex items-center gap-1">
                      <span>Solana State Rent (Mint + ATA + Metadata)</span>
                      <span className="text-[10px] text-emerald-400 font-medium">
                        (Absorbed by platform)
                      </span>
                    </span>
                    <span className="font-mono text-emerald-400">
                      -~{networkRentSol.toFixed(3)} SOL
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground/90 pl-2 text-[10px]">
                    <span>↳ Net Platform Payout</span>
                    <span className="font-mono text-foreground">
                      {platformNetFee.toFixed(3)} SOL
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between pt-1 border-t border-border/30">
                  <span className="flex items-center gap-1">
                    <span>Solana State Rent (Mint + ATA + Metadata)</span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      (Mandatory network rent)
                    </span>
                  </span>
                  <span className="font-mono text-foreground">
                    +~{networkRentSol.toFixed(3)} SOL
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                <span>Solana State Rent (Mint + ATA + Metadata)</span>
                <span className="text-[10px] text-emerald-400 font-medium">
                  (On-chain refundable deposit)
                </span>
              </span>
              <span className="font-mono text-foreground">~{networkRentSol.toFixed(3)} SOL</span>
            </div>
          )}
        </div>
      </div>

      <div
        className={`rounded-lg border p-3 text-[11px] flex items-start gap-2.5 ${
          !isMainnet || isAbsorbed
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-blue-500/30 bg-blue-500/10 text-blue-300"
        }`}
      >
        <ShieldCheck
          className={`h-4 w-4 shrink-0 mt-0.5 ${
            !isMainnet || isAbsorbed ? "text-emerald-400" : "text-blue-400"
          }`}
        />
        <span>
          {isMainnet ? (
            isAbsorbed ? (
              <>
                <strong>100% Trust Guarantee:</strong> Network rent is absorbed from our platform
                fee. Your Phantom wallet will prompt for <strong>exactly {displayTotal}</strong> —
                zero hidden surprise fees.
              </>
            ) : (
              <>
                <strong>Transparent Pricing Guarantee:</strong> You pay the direct platform fee (
                {serviceFeeTotal.toFixed(3)} SOL) plus standard Solana account rent (~
                {networkRentSol.toFixed(3)} SOL). Phantom will prompt for{" "}
                <strong>~{displayTotal}</strong>.
              </>
            )
          ) : (
            <>
              <strong>Devnet Sandbox:</strong> Platform creation and authority management tools are
              100% free of charge. Only standard Solana testnet rent applies.
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
