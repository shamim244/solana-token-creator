"use client";

import { Switch } from "../../ui/switch";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { ArrowLeft, ArrowRight, ShieldCheck, Lock } from "lucide-react";

interface StepAuthoritiesProps {
  data: {
    revokeFreeze: boolean;
    revokeMint: boolean;
    revokeUpdate: boolean;
  };
  cluster: string;
  onChange: (fields: Partial<StepAuthoritiesProps["data"]>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepAuthorities({
  data,
  cluster,
  onChange,
  onNext,
  onBack,
}: StepAuthoritiesProps) {
  const isMainnet = cluster === "mainnet";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Security & Authority Settings</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Configuring authority revocations is the single biggest trust signal for decentralized trading on Solana.
        </p>
      </div>

      <div className="space-y-4">
        {/* Revoke Freeze */}
        <div
          className={`relative rounded-xl border p-4.5 transition-all ${
            data.revokeFreeze
              ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
              : "border-border bg-card/60"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Revoke Freeze Authority
                </span>
                <Badge variant="success" className="text-[10px]">
                  Raydium Pool Required
                </Badge>
                {isMainnet && (
                  <span className="font-mono text-xs text-amber-400 font-semibold">
                    +0.1 SOL
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Prevents anyone from freezing token accounts. Decentralized exchanges (Raydium, Meteora) and scanners require this so buyers know their tokens cannot be trapped.
              </p>
            </div>
            <Switch
              checked={data.revokeFreeze}
              onCheckedChange={(checked) => onChange({ revokeFreeze: checked })}
            />
          </div>
        </div>

        {/* Revoke Mint */}
        <div
          className={`relative rounded-xl border p-4.5 transition-all ${
            data.revokeMint
              ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
              : "border-border bg-card/60"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Revoke Mint Authority
                </span>
                <Badge variant="warning" className="text-[10px]">
                  Investor Protection
                </Badge>
                {isMainnet && (
                  <span className="font-mono text-xs text-amber-400 font-semibold">
                    +0.1 SOL
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Permanently caps the token supply at your initial amount. No more tokens can ever be minted, guaranteeing 0% inflation to your holders.
              </p>
            </div>
            <Switch
              checked={data.revokeMint}
              onCheckedChange={(checked) => onChange({ revokeMint: checked })}
            />
          </div>
        </div>

        {/* Revoke Update */}
        <div
          className={`relative rounded-xl border p-4.5 transition-all ${
            data.revokeUpdate
              ? "border-emerald-500/40 bg-emerald-500/5 shadow-xs"
              : "border-border bg-card/60"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  Make Metadata Immutable
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Revoke Update
                </span>
                {isMainnet && (
                  <span className="font-mono text-xs text-amber-400 font-semibold">
                    +0.1 SOL
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Prevents changing the token name, symbol, or logo after creation. Ensures metadata permanence and transparency.
              </p>
            </div>
            <Switch
              checked={data.revokeUpdate}
              onCheckedChange={(checked) => onChange({ revokeUpdate: checked })}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border/80 bg-secondary/30 p-3 text-xs text-muted-foreground flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
        <span>
          {isMainnet
            ? "Authority revocations are executed in the same atomic block during creation."
            : "On Devnet/Localnet, all authority revocations are 100% free of service fees."}
        </span>
      </div>

      <div className="flex justify-between border-t border-border/60 pt-4">
        <Button onClick={onBack} variant="outline" className="gap-1.5 text-xs">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} variant="amber" className="px-6 font-semibold gap-1.5">
          Review & Deploy
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
