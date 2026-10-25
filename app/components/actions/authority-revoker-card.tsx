"use client";

import { useState } from "react";
import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { useCluster } from "../cluster-context";
import { usePlatformSettings } from "../../lib/hooks/use-platform-settings";
import {
  inspectToken,
  revokeAuthorityOnChain,
  type TokenInspectionResult,
} from "../../lib/solana-token-utilities";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Lock,
  Flame,
  Snowflake,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { parseTransactionError } from "../../lib/errors";

export function AuthorityRevokerCard() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster } = useCluster();
  const { settings } = usePlatformSettings();

  const [mintInput, setMintInput] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [revokingType, setRevokingType] = useState<
    "freeze" | "mint" | "update" | null
  >(null);
  const [tokenData, setTokenData] = useState<TokenInspectionResult | null>(
    null
  );

  const revokeFee = settings.revokeStandaloneFeeSol ?? 0.05;

  const handleInspect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!mintInput.trim()) {
      toast.error("Please enter a Solana mint address");
      return;
    }

    setInspecting(true);
    try {
      const data = await inspectToken(
        client,
        mintInput.trim(),
        connected?.account.address
          ? address(connected.account.address)
          : undefined
      );
      setTokenData(data);
      toast.success(`Loaded on-chain status for ${data.name || data.symbol}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to inspect token on-chain"
      );
    } finally {
      setInspecting(false);
    }
  };

  const handleRevoke = async (authorityType: "freeze" | "mint" | "update") => {
    if (!connected?.signer) {
      toast.error("Please connect a wallet capable of signing");
      return;
    }
    if (!tokenData) return;

    const label =
      authorityType === "freeze"
        ? "Freeze Authority"
        : authorityType === "mint"
          ? "Mint Authority"
          : "Update Authority";

    const toastId = toast.loading(`Revoking ${label} on-chain...`);
    setRevokingType(authorityType);

    try {
      const result = await revokeAuthorityOnChain(client, {
        mintAddress: tokenData.mintAddress,
        authorityType,
        payer: connected.signer,
        cluster,
        treasuryWallet: settings.treasuryWalletAddress,
        platformFeeSol: revokeFee,
      });

      toast.success(`${label} successfully revoked!`, {
        id: toastId,
        description: `Tx: ${result.txSignature.slice(0, 8)}...`,
        action: {
          label: "View Explorer",
          onClick: () =>
            window.open(
              `https://explorer.solana.com/tx/${result.txSignature}${
                cluster === "devnet" ? "?cluster=devnet" : ""
              }`,
              "_blank"
            ),
        },
      });

      // Re-inspect to refresh badges
      const refreshed = await inspectToken(
        client,
        tokenData.mintAddress,
        address(connected.account.address)
      );
      setTokenData(refreshed);
    } catch (err: unknown) {
      console.warn("Authority revoke notice/error:", err);
      const errorMsg = parseTransactionError(err);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setRevokingType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-500" />
            Standalone Authority Revoker
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Revoke Freeze, Mint, or Metadata Update authority on any existing
            token at any time to pass RugCheck and gain investor trust.
          </p>
        </div>

        <form onSubmit={handleInspect} className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Paste token mint address (e.g., DezXAZ...)"
              value={mintInput}
              onChange={(e) => setMintInput(e.target.value)}
              className="font-mono text-xs pr-8"
            />
          </div>
          <Button
            type="submit"
            disabled={inspecting || !mintInput.trim()}
            variant="default"
            className="text-xs shrink-0 cursor-pointer"
          >
            {inspecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
            ) : (
              <Search className="h-3.5 w-3.5 mr-1" />
            )}
            Inspect Token
          </Button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span>
            Platform Fee:{" "}
            <strong className="text-foreground">{revokeFee} SOL</strong> per
            revocation
          </span>
          <span className="text-amber-500/90 font-medium">
            100% Non-Custodial & Atomic
          </span>
        </div>
      </div>

      {/* Inspection Results */}
      {tokenData && (
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
          {/* Token Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              {tokenData.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tokenData.image}
                  alt={tokenData.name}
                  className="h-12 w-12 rounded-full border border-border/80 object-cover bg-muted/40"
                />
              ) : (
                <div className="h-12 w-12 rounded-full border border-border/80 bg-amber-500/10 flex items-center justify-center font-bold text-amber-500">
                  {tokenData.symbol.slice(0, 2)}
                </div>
              )}
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  {tokenData.name}
                  <span className="text-xs font-mono font-normal text-muted-foreground">
                    ({tokenData.symbol})
                  </span>
                </h3>
                <p className="font-mono text-[11px] text-muted-foreground break-all">
                  {tokenData.mintAddress}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://explorer.solana.com/address/${tokenData.mintAddress}${
                  cluster === "devnet" ? "?cluster=devnet" : ""
                }`}
                target="_blank"
                rel="noreferrer"
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors border border-border/70 rounded-lg px-2.5 py-1"
              >
                Explorer <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://rugcheck.xyz/tokens/${tokenData.mintAddress}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-2.5 py-1"
              >
                RugCheck <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/50 bg-background/50 p-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Decimals
              </span>
              <span className="text-sm font-semibold text-foreground font-mono">
                {tokenData.decimals}
              </span>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/50 p-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Total Supply
              </span>
              <span className="text-sm font-semibold text-foreground font-mono">
                {Number(tokenData.supply) / 10 ** tokenData.decimals > 1e9
                  ? `${(Number(tokenData.supply) / 10 ** tokenData.decimals / 1e9).toFixed(2)}B`
                  : (
                      Number(tokenData.supply) /
                      10 ** tokenData.decimals
                    ).toLocaleString()}
              </span>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/50 p-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Token Standard
              </span>
              <span className="text-sm font-semibold text-foreground">
                {tokenData.programId === "spl-token"
                  ? "Standard SPL"
                  : "Token-2022"}
              </span>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/50 p-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Your Balance
              </span>
              <span className="text-sm font-semibold text-foreground font-mono">
                {tokenData.walletBalance ?? "0"}
              </span>
            </div>
          </div>

          {/* Authority Status & Revocation Actions */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Authority Management Grid
            </h4>

            <div className="grid gap-3 sm:grid-cols-3">
              {/* 1. Freeze Authority */}
              <div
                className={`rounded-xl border p-4 space-y-3 flex flex-col justify-between ${
                  tokenData.freezeAuthority
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-emerald-500/30 bg-emerald-500/5"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Snowflake className="h-4 w-4 text-sky-400" />
                      Freeze Authority
                    </span>
                    {tokenData.freezeAuthority ? (
                      <Badge
                        variant="warning"
                        className="text-[10px] py-0 px-2"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="success"
                        className="text-[10px] py-0 px-2"
                      >
                        Revoked
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {tokenData.freezeAuthority
                      ? "Holder accounts can be frozen by the authority."
                      : "Permanently removed. Holders cannot be blacklisted."}
                  </p>
                  {tokenData.freezeAuthority && (
                    <p className="text-[10px] font-mono text-muted-foreground break-all truncate">
                      Owner: {tokenData.freezeAuthority}
                    </p>
                  )}
                </div>

                {tokenData.freezeAuthority ? (
                  tokenData.isWalletFreezeAuthority ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={revokingType === "freeze"}
                      onClick={() => handleRevoke("freeze")}
                      className="w-full text-xs cursor-pointer font-semibold"
                    >
                      {revokingType === "freeze" ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Lock className="h-3 w-3 mr-1" />
                      )}
                      Revoke Freeze ({revokeFee} SOL)
                    </Button>
                  ) : (
                    <p className="text-[10px] text-amber-400/90 italic text-center">
                      Connected wallet is not the Freeze Authority
                    </p>
                  )
                ) : (
                  <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs py-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> RugCheck Safe
                  </div>
                )}
              </div>

              {/* 2. Mint Authority */}
              <div
                className={`rounded-xl border p-4 space-y-3 flex flex-col justify-between ${
                  tokenData.mintAuthority
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-emerald-500/30 bg-emerald-500/5"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-amber-400" />
                      Mint Authority
                    </span>
                    {tokenData.mintAuthority ? (
                      <Badge
                        variant="warning"
                        className="text-[10px] py-0 px-2"
                      >
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="success"
                        className="text-[10px] py-0 px-2"
                      >
                        Capped
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {tokenData.mintAuthority
                      ? "Owner can print new tokens, diluting holders."
                      : "Supply is strictly fixed forever. No new tokens."}
                  </p>
                  {tokenData.mintAuthority && (
                    <p className="text-[10px] font-mono text-muted-foreground break-all truncate">
                      Owner: {tokenData.mintAuthority}
                    </p>
                  )}
                </div>

                {tokenData.mintAuthority ? (
                  tokenData.isWalletMintAuthority ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={revokingType === "mint"}
                      onClick={() => handleRevoke("mint")}
                      className="w-full text-xs cursor-pointer font-semibold"
                    >
                      {revokingType === "mint" ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Lock className="h-3 w-3 mr-1" />
                      )}
                      Revoke Mint ({revokeFee} SOL)
                    </Button>
                  ) : (
                    <p className="text-[10px] text-amber-400/90 italic text-center">
                      Connected wallet is not the Mint Authority
                    </p>
                  )
                ) : (
                  <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs py-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Fixed Max Supply
                  </div>
                )}
              </div>

              {/* 3. Metadata Update Authority */}
              <div
                className={`rounded-xl border p-4 space-y-3 flex flex-col justify-between ${
                  tokenData.isMutable
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-emerald-500/30 bg-emerald-500/5"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-purple-400" />
                      Update Authority
                    </span>
                    {tokenData.isMutable ? (
                      <Badge
                        variant="warning"
                        className="text-[10px] py-0 px-2"
                      >
                        Mutable
                      </Badge>
                    ) : (
                      <Badge
                        variant="success"
                        className="text-[10px] py-0 px-2"
                      >
                        Immutable
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {tokenData.isMutable
                      ? "Token name, logo, and ticker can still be modified."
                      : "Metadata is etched permanently into Solana."}
                  </p>
                  {tokenData.updateAuthority && tokenData.isMutable && (
                    <p className="text-[10px] font-mono text-muted-foreground break-all truncate">
                      Owner: {tokenData.updateAuthority}
                    </p>
                  )}
                </div>

                {tokenData.isMutable ? (
                  tokenData.isWalletUpdateAuthority ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={revokingType === "update"}
                      onClick={() => handleRevoke("update")}
                      className="w-full text-xs cursor-pointer font-semibold"
                    >
                      {revokingType === "update" ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : (
                        <Lock className="h-3 w-3 mr-1" />
                      )}
                      Make Immutable ({revokeFee} SOL)
                    </Button>
                  ) : (
                    <p className="text-[10px] text-amber-400/90 italic text-center">
                      Connected wallet is not Update Authority
                    </p>
                  )
                ) : (
                  <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs py-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Immutable Forever
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RugCheck Assessment Alert */}
          {!tokenData.freezeAuthority &&
          !tokenData.mintAuthority &&
          !tokenData.isMutable ? (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <div className="text-xs text-foreground">
                <span className="font-bold text-emerald-300">
                  Perfect Investor Trust Score:
                </span>{" "}
                All 3 authorities (Freeze, Mint, and Update) are fully revoked.
                This token achieves maximum safety verification on RugCheck and
                DexScreener.
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="text-xs text-foreground">
                <span className="font-bold text-amber-300">
                  Investor Trust Notice:
                </span>{" "}
                Some authorities are still active. Revoking freeze and mint
                authorities gives your token the best chance of trending on
                Raydium and Birdeye.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
