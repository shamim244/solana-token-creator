"use client";

import { useState, useEffect } from "react";
import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { useCluster } from "../cluster-context";
import { usePlatformSettings } from "../../lib/hooks/use-platform-settings";
import {
  inspectToken,
  fetchWalletTokens,
  burnTokenOnChain,
  type TokenInspectionResult,
  type WalletTokenItem,
} from "../../lib/solana-token-utilities";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Flame,
  Search,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export function TokenBurnerCard() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster } = useCluster();
  const { settings } = usePlatformSettings();

  const [mintInput, setMintInput] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [burning, setBurning] = useState(false);
  const [tokenData, setTokenData] = useState<TokenInspectionResult | null>(
    null
  );

  // Wallet tokens list for quick pick
  const [walletTokens, setWalletTokens] = useState<WalletTokenItem[]>([]);
  const [loadingWalletTokens, setLoadingWalletTokens] = useState(false);

  // Burn amount input
  const [burnAmount, setBurnAmount] = useState("");

  const burnFee = settings.burnTokenFeeSol ?? 0.0;

  // Load wallet tokens on mount / wallet connect
  useEffect(() => {
    let ignore = false;
    if (!connected?.account.address) return;

    const fetchTokens = async () => {
      setLoadingWalletTokens(true);
      try {
        const items = await fetchWalletTokens(
          client,
          address(connected.account.address)
        );
        if (!ignore) {
          setWalletTokens(items);
        }
      } catch (err) {
        console.warn("Failed to load wallet tokens:", err);
      } finally {
        if (!ignore) {
          setLoadingWalletTokens(false);
        }
      }
    };

    fetchTokens();

    return () => {
      ignore = true;
    };
  }, [client, connected]);

  const handleManualRefresh = async () => {
    if (!connected?.account.address) return;
    setLoadingWalletTokens(true);
    try {
      const items = await fetchWalletTokens(
        client,
        address(connected.account.address)
      );
      setWalletTokens(items);
    } catch (err) {
      console.warn("Failed to load wallet tokens:", err);
    } finally {
      setLoadingWalletTokens(false);
    }
  };

  const handleInspect = async (mintAddress: string) => {
    if (!mintAddress.trim()) return;
    setInspecting(true);
    setBurnAmount("");
    try {
      const data = await inspectToken(
        client,
        mintAddress.trim(),
        connected?.account.address
          ? address(connected.account.address)
          : undefined
      );
      setTokenData(data);
      setMintInput(mintAddress.trim());
      toast.success(`Loaded token ${data.name || data.symbol}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to inspect token"
      );
    } finally {
      setInspecting(false);
    }
  };

  const handleQuickPercent = (percent: number) => {
    if (!tokenData?.walletBalance) return;
    const balanceNum = parseFloat(tokenData.walletBalance) || 0;
    if (percent === 100) {
      setBurnAmount(tokenData.walletBalance);
    } else {
      const calculated = (balanceNum * (percent / 100)).toString();
      setBurnAmount(calculated);
    }
  };

  const handleBurn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected?.signer) {
      toast.error("Please connect a wallet capable of signing");
      return;
    }
    if (!tokenData) return;

    const amountNum = parseFloat(burnAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    const maxBalance = parseFloat(tokenData.walletBalance || "0");
    if (amountNum > maxBalance) {
      toast.error("Burn amount exceeds your current wallet balance");
      return;
    }

    setBurning(true);
    const toastId = toast.loading(
      `Burning ${burnAmount} ${tokenData.symbol}...`
    );

    try {
      const result = await burnTokenOnChain(client, {
        mintAddress: tokenData.mintAddress,
        amount: burnAmount.trim(),
        decimals: tokenData.decimals,
        payer: connected.signer,
        cluster,
        treasuryWallet: settings.treasuryWalletAddress,
        platformFeeSol: burnFee,
      });

      toast.success(
        `Successfully burned ${burnAmount} ${tokenData.symbol} permanently!`,
        {
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
        }
      );

      // Refresh token data & wallet tokens
      setBurnAmount("");
      const refreshed = await inspectToken(
        client,
        tokenData.mintAddress,
        address(connected.account.address)
      );
      setTokenData(refreshed);
      handleManualRefresh();
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to burn tokens",
        { id: toastId }
      );
    } finally {
      setBurning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-500" />
            Token Burner & Supply Reducer
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Permanently destroy tokens from your wallet to reduce circulating
            supply, increase scarcity, or execute tokenomic buy-back-and-burns.
          </p>
        </div>

        {/* Quick select from connected wallet */}
        {connected && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Tokens Held in Your Wallet ({walletTokens.length})
              </span>
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={loadingWalletTokens}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw
                  className={`h-3 w-3 ${
                    loadingWalletTokens ? "animate-spin" : ""
                  }`}
                />
                Refresh
              </button>
            </div>

            {walletTokens.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
                {walletTokens.map((t) => (
                  <button
                    key={t.mint}
                    type="button"
                    onClick={() => handleInspect(t.mint)}
                    className={`rounded-lg border px-3 py-1.5 text-xs text-left cursor-pointer transition-all flex items-center gap-2 ${
                      tokenData?.mintAddress === t.mint
                        ? "border-amber-500 bg-amber-500/10 text-foreground font-semibold"
                        : "border-border/60 bg-background/50 hover:border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="font-mono text-[11px]">
                      {t.mint.slice(0, 4)}...{t.mint.slice(-4)}
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {parseFloat(t.balance) > 1e6
                        ? `${(parseFloat(t.balance) / 1e6).toFixed(1)}M`
                        : t.balance}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground italic">
                {loadingWalletTokens
                  ? "Scanning wallet for SPL tokens..."
                  : "No SPL tokens with positive balance found in this wallet on current cluster."}
              </p>
            )}
          </div>
        )}

        {/* Or manual address input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInspect(mintInput);
          }}
          className="flex gap-2 pt-2 border-t border-border/50"
        >
          <Input
            type="text"
            placeholder="Or paste any token mint address (e.g., DezXAZ...)"
            value={mintInput}
            onChange={(e) => setMintInput(e.target.value)}
            className="font-mono text-xs"
          />
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
            <strong className="text-foreground">
              {burnFee > 0 ? `${burnFee} SOL` : "Free"}
            </strong>
          </span>
          <span className="text-amber-500/90 font-medium">
            Permanent On-Chain Destruction via SPL Token Program
          </span>
        </div>
      </div>

      {/* Burn Action Card */}
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
          </div>

          {/* Quick Balance & Supply Overview */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/50 bg-background/50 p-4">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Your Available Balance
              </span>
              <span className="text-lg font-bold text-amber-400 font-mono block mt-0.5">
                {tokenData.walletBalance ?? "0"} {tokenData.symbol}
              </span>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/50 p-4">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                Total Circulating Supply
              </span>
              <span className="text-lg font-bold text-foreground font-mono block mt-0.5">
                {(
                  Number(tokenData.supply) /
                  10 ** tokenData.decimals
                ).toLocaleString()}{" "}
                {tokenData.symbol}
              </span>
            </div>
          </div>

          {/* Burn Form */}
          <form onSubmit={handleBurn} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Amount to Burn
                </label>
                <div className="flex items-center gap-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleQuickPercent(pct)}
                      className="rounded border border-border/70 bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-amber-500 cursor-pointer transition-colors"
                    >
                      {pct === 100 ? "MAX" : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative">
                <Input
                  type="text"
                  placeholder="0.0"
                  value={burnAmount}
                  onChange={(e) => setBurnAmount(e.target.value)}
                  className="font-mono text-sm pr-16"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-muted-foreground">
                  {tokenData.symbol}
                </span>
              </div>
            </div>

            {/* Warning Box */}
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs text-foreground space-y-1">
                <span className="font-bold text-red-300">
                  Irreversible Action Warning:
                </span>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Burning permanently destroys these tokens by reducing the
                  mint&apos;s total supply and debiting your wallet balance on
                  the Solana blockchain. Burned tokens cannot be recovered or
                  re-minted.
                </p>
              </div>
            </div>

            {/* Submit Burn Action */}
            <Button
              type="submit"
              disabled={
                burning ||
                !burnAmount ||
                parseFloat(burnAmount) <= 0 ||
                parseFloat(burnAmount) >
                  parseFloat(tokenData.walletBalance || "0")
              }
              variant="destructive"
              className="w-full text-xs font-semibold cursor-pointer py-2.5"
            >
              {burning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Burning Tokens on Solana...
                </>
              ) : (
                <>
                  <Flame className="h-4 w-4 mr-2" />
                  Burn {burnAmount || "0"} {tokenData.symbol} Permanently
                </>
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
