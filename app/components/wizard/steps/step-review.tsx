"use client";

import { useState } from "react";
import { address, lamports } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../../lib/client-provider";
import { useBalance } from "../../../lib/hooks/use-balance";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Input } from "../../ui/input";
import {
  ArrowLeft,
  Rocket,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Sparkles,
  Tag,
  AlertTriangle,
  Coins,
} from "lucide-react";
import { toast } from "sonner";
import { usePlatformSettings } from "../../../lib/hooks/use-platform-settings";
import { usePartnerAttribution } from "../../../lib/hooks/use-partner-attribution";

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
  const {
    partnerSlug,
    partnerName,
    tier,
    discountPercent,
    isPartnerAttributed,
    applyCode,
    removeCode,
  } = usePartnerAttribution();

  const [manualCode, setManualCode] = useState("");
  const [isApplyingCode, setIsApplyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleApplyCode = async () => {
    if (!manualCode.trim()) return;
    setIsApplyingCode(true);
    setCodeError(null);
    const res = await applyCode(manualCode);
    setIsApplyingCode(false);
    if (!res.success) {
      setCodeError(res.error || "Code not recognized.");
    } else {
      setManualCode("");
      toast.success(
        `Code applied! ${res.partner?.discountPercent ?? discountPercent}% discount active.`
      );
    }
  };

  const networkRentSol = 0.009; // Exact Solana on-chain rent for Mint + ATA + Metaplex metadata
  const isAbsorbed = settings.absorbNetworkRent ?? true;

  // Dynamic base fee depending on cluster: Devnet or Mainnet managed by Admin Panel
  const baseFee = isMainnet
    ? settings.mainnetBaseFeeSol
    : settings.devnetBaseFeeSol;

  // Calculate platform fees based on enabled security features
  let serviceFeeTotal = baseFee;
  if (data.revokeFreeze) serviceFeeTotal += settings.revokeFreezeFeeSol;
  if (data.revokeMint) serviceFeeTotal += settings.revokeMintFeeSol;
  if (data.revokeUpdate) serviceFeeTotal += settings.revokeUpdateFeeSol;

  // Calculate Partner Discount if applicable
  const hasDiscount = isPartnerAttributed && discountPercent > 0;
  const discountMultiplier = hasDiscount
    ? Math.max(0, (100 - discountPercent) / 100)
    : 1;
  const discountedServiceFee =
    Math.round(serviceFeeTotal * discountMultiplier * 1000) / 1000;
  const discountSavingsSol =
    Math.round((serviceFeeTotal - discountedServiceFee) * 1000) / 1000;

  // Strategy A (All-Inclusive): Total wallet prompt is exact flat fee, platform absorbs rent
  // Strategy B (Rent On Top): Total wallet prompt is service fee + Solana network rent
  const totalWalletOutflow = isAbsorbed
    ? Math.max(discountedServiceFee, networkRentSol)
    : discountedServiceFee + networkRentSol;

  const platformNetFee = isAbsorbed
    ? Math.max(0, discountedServiceFee - networkRentSol)
    : discountedServiceFee;

  const displayTotal =
    totalWalletOutflow > 0 ? `${totalWalletOutflow.toFixed(3)} SOL` : "Free";

  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const userAddress = connected?.account.address
    ? address(connected.account.address)
    : undefined;
  const { lamports: balanceLamports } = useBalance(userAddress);
  const userBalanceSol =
    balanceLamports != null ? Number(balanceLamports) / 1e9 : null;

  const minRequiredSol = totalWalletOutflow + 0.001;
  const isInsufficient =
    userBalanceSol !== null && userBalanceSol < minRequiredSol;
  const missingSol = isInsufficient
    ? Math.max(0, minRequiredSol - userBalanceSol)
    : 0;

  const [isAirdropping, setIsAirdropping] = useState(false);
  const handleAirdrop = async () => {
    if (!connected) return;
    setIsAirdropping(true);
    const toastId = toast.loading("Requesting 1 SOL from Devnet faucet...");
    try {
      await client.airdrop(
        address(connected.account.address),
        lamports(1_000_000_000n)
      );
      toast.success("Airdropped 1 SOL from Devnet faucet!", { id: toastId });
    } catch {
      toast.error(
        "Airdrop request failed. Public faucets are rate-limited — try faucet.solana.com.",
        { id: toastId }
      );
    } finally {
      setIsAirdropping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">
          Review & Confirmation
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Review your token specifications and on-chain cost breakdown before
          signing.
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
              <p className="font-mono text-amber-400 font-semibold">
                ${data.symbol}
              </p>
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
            <p className="font-semibold capitalize text-foreground">
              {cluster}
            </p>
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

      {/* Discount / Referral Code Card */}
      {hasDiscount ? (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                {tier === "partner"
                  ? "🌟 Verified Partner Code Applied"
                  : "🏷️ Referral Discount Code Applied"}
                <span className="font-mono text-amber-400 uppercase font-bold">
                  ({partnerSlug})
                </span>
              </span>
              <p className="text-[11px] text-muted-foreground">
                You receive {discountPercent}% off platform creation fees
                courtesy of {partnerName || partnerSlug}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="font-mono font-bold text-emerald-400">
              -{discountSavingsSol.toFixed(3)} SOL
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeCode}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive cursor-pointer"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/70 bg-card/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-amber-400" />
              Have a Discount or Referral Code?
            </span>
            <span className="text-[10px] text-muted-foreground">
              Save up to 15% on deployment fees
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="e.g. BONK or REFERRAL_CODE"
              value={manualCode}
              onChange={(e) => {
                setManualCode(e.target.value);
                if (codeError) setCodeError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleApplyCode();
                }
              }}
              className="h-8 text-xs font-mono uppercase bg-background"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyCode}
              disabled={isApplyingCode || !manualCode.trim()}
              className="h-8 text-xs cursor-pointer shrink-0"
            >
              {isApplyingCode ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Verifying...
                </>
              ) : (
                "Apply Code"
              )}
            </Button>
          </div>
          {codeError && (
            <p className="text-[11px] text-destructive font-medium">
              {codeError}
            </p>
          )}
        </div>
      )}

      {/* Transparent Cost Breakdown */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2 text-xs">
        <div className="flex items-center justify-between font-semibold text-foreground">
          <div className="flex items-center gap-2">
            <span>Total Wallet Outflow</span>
            {serviceFeeTotal > 0 && (
              <Badge
                variant={isAbsorbed ? "success" : "info"}
                className="text-[10px] py-0 px-1.5 font-bold"
              >
                {isAbsorbed
                  ? "All-Inclusive Guarantee"
                  : "Transparent Pass-Through"}
              </Badge>
            )}
          </div>
          <span className="font-mono text-amber-400 text-sm font-bold">
            {displayTotal}
          </span>
        </div>

        <div className="space-y-1.5 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
          <div className="flex justify-between">
            <span>
              Base Platform Creation Fee ({isMainnet ? "Mainnet" : "Devnet"})
            </span>
            <span className="font-mono text-foreground">
              {baseFee.toFixed(3)} SOL
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

          {hasDiscount && (
            <div className="flex justify-between text-emerald-400 font-semibold pl-2">
              <span>
                ↳{" "}
                {tier === "partner" ? "Partner Discount" : "Referral Discount"}{" "}
                ({discountPercent}% Off)
              </span>
              <span className="font-mono">
                -{discountSavingsSol.toFixed(3)} SOL
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
        </div>
      </div>

      <div
        className={`rounded-lg border p-3 text-[11px] flex items-start gap-2.5 ${
          isAbsorbed
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            : "border-blue-500/30 bg-blue-500/10 text-blue-300"
        }`}
      >
        <ShieldCheck
          className={`h-4 w-4 shrink-0 mt-0.5 ${
            isAbsorbed ? "text-emerald-400" : "text-blue-400"
          }`}
        />
        <span>
          {serviceFeeTotal > 0 ? (
            isAbsorbed ? (
              <>
                <strong>100% Trust Guarantee:</strong> Network rent is absorbed
                from our platform fee. Your Phantom wallet will prompt for{" "}
                <strong>exactly {displayTotal}</strong> — zero hidden surprise
                fees.
              </>
            ) : (
              <>
                <strong>Transparent Pricing Guarantee:</strong> You pay the
                direct platform fee ({serviceFeeTotal.toFixed(3)} SOL) plus
                standard Solana account rent (~{networkRentSol.toFixed(3)} SOL).
                Phantom will prompt for <strong>~{displayTotal}</strong>.
              </>
            )
          ) : (
            <>
              <strong>Free Sandbox Mode:</strong> Platform fee is set to 0.00
              SOL in the Admin Panel. Only standard Solana on-chain account rent
              applies.
            </>
          )}
        </span>
      </div>

      {/* Insufficient SOL Balance Warning Alert */}
      {isInsufficient && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">
                  Insufficient SOL Balance
                </span>
                <span className="font-mono text-xs text-rose-400 font-bold">
                  {userBalanceSol?.toFixed(4)} SOL /{" "}
                  {totalWalletOutflow.toFixed(3)} SOL
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Your wallet balance is{" "}
                <strong className="text-foreground font-mono">
                  {userBalanceSol?.toFixed(4)} SOL
                </strong>
                , but deploying this token requires{" "}
                <strong className="text-foreground font-mono">
                  {totalWalletOutflow.toFixed(3)} SOL
                </strong>
                . You need approximately{" "}
                <strong className="text-rose-400 font-mono font-bold">
                  +{missingSol.toFixed(4)} SOL
                </strong>{" "}
                more to cover the platform fee and Solana network rent.
              </p>
            </div>
          </div>

          {(cluster === "devnet" || cluster === "localnet") && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rose-500/20 pt-2.5 text-xs">
              <span className="text-[11px] text-muted-foreground">
                Testing on {cluster === "devnet" ? "Devnet" : "Localnet"}? Get
                free test SOL:
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAirdrop}
                disabled={isAirdropping}
                className="h-7 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 cursor-pointer"
              >
                {isAirdropping ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Requesting Airdrop...
                  </>
                ) : (
                  <>
                    <Coins className="h-3 w-3 mr-1 text-amber-400" />
                    Faucet: +1 Devnet SOL
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between border-t border-border/60 pt-4">
        <Button
          onClick={onBack}
          disabled={isDeploying}
          variant="outline"
          className="gap-1.5 text-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onDeploy}
          disabled={isDeploying || isInsufficient}
          variant={isInsufficient ? "outline" : "amber"}
          className={`h-11 px-8 font-bold gap-2 text-sm shadow-md cursor-pointer ${
            isInsufficient
              ? "opacity-60 cursor-not-allowed border-rose-500/40 text-rose-400 hover:bg-transparent"
              : ""
          }`}
        >
          {isDeploying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Broadcasting Transaction...
            </>
          ) : isInsufficient ? (
            <>
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              Insufficient SOL ({userBalanceSol?.toFixed(3)} /{" "}
              {totalWalletOutflow.toFixed(3)} SOL)
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
