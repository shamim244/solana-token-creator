"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { useCluster } from "../cluster-context";
import { usePlatformSettings } from "../../lib/hooks/use-platform-settings";
import { useBalance } from "../../lib/hooks/use-balance";
import {
  fetchWalletTokens,
  type WalletTokenItem,
} from "../../lib/solana-token-utilities";
import {
  parseRecipientsText,
  executeSolAirdropBatch,
  executeSplAirdropBatch,
  SOL_AIRDROP_BATCH_SIZE,
  SPL_AIRDROP_BATCH_SIZE,
} from "../../lib/solana-airdrop-utilities";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Send,
  Upload,
  Coins,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Copy,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const SAMPLE_CSV = `# Solana Token Studio Airdrop Sample
# Format: address,amount
DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263, 10
7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr, 25
EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm, 15
ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82, 30
MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5, 20`;

export function AirdropMultiSenderCard() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster } = useCluster();
  const { settings } = usePlatformSettings();

  // Mode: "sol" or "token"
  const [assetType, setAssetType] = useState<"sol" | "token">("token");

  // Wallet balances
  const userAddress = connected?.account.address
    ? address(connected.account.address)
    : undefined;
  const { lamports: solLamports } = useBalance(userAddress);
  const solBalance =
    solLamports !== null ? (Number(solLamports) / 1e9).toString() : null;

  const [walletTokens, setWalletTokens] = useState<WalletTokenItem[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [selectedToken, setSelectedToken] = useState<WalletTokenItem | null>(
    null
  );
  const [manualMintInput, setManualMintInput] = useState("");
  const [manualDecimals, setManualDecimals] = useState(9);

  // Recipient input & parsing
  const [rawText, setRawText] = useState("");
  const [deduplicate, setDeduplicate] = useState(true);

  // Derived parsed result (memoized without cascading effects)
  const parseResult = useMemo(
    () => parseRecipientsText(rawText, deduplicate),
    [rawText, deduplicate]
  );

  // Batch Execution State
  const [isDistributing, setIsDistributing] = useState(false);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [completedSignatures, setCompletedSignatures] = useState<string[]>([]);
  const [failedBatches, setFailedBatches] = useState<number[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load wallet tokens on mount
  useEffect(() => {
    let ignore = false;
    if (!userAddress) return;

    const loadTokens = async () => {
      setLoadingTokens(true);
      try {
        const items = await fetchWalletTokens(client, userAddress);
        if (!ignore) {
          setWalletTokens(items);
          if (items.length > 0 && !selectedToken) {
            setSelectedToken(items[0]);
          }
        }
      } catch (err) {
        console.warn("Failed to load tokens for airdrop:", err);
      } finally {
        if (!ignore) setLoadingTokens(false);
      }
    };

    loadTokens();
    return () => {
      ignore = true;
    };
  }, [client, userAddress, selectedToken]);

  // Handle CSV file drop or upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setRawText(text);
        toast.success(`Loaded recipient file (${file.name})`);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_CSV);
    toast.success("Loaded sample recipient list");
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "airdrop_recipients_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Batch Calculation
  const batchSize =
    assetType === "sol" ? SOL_AIRDROP_BATCH_SIZE : SPL_AIRDROP_BATCH_SIZE;
  const validEntries = parseResult.entries.filter((e) => e.valid);
  const calculatedBatchesCount =
    Math.ceil(validEntries.length / batchSize) || 0;

  const airdropFeePerBatch = settings.airdropFeeSol ?? 0.01;
  const totalPlatformFee = calculatedBatchesCount * airdropFeePerBatch;

  // Available balance comparison
  const availableBalance =
    assetType === "sol"
      ? solBalance !== null
        ? parseFloat(solBalance)
        : 0
      : selectedToken
        ? parseFloat(selectedToken.balance)
        : 0;

  const hasInsufficientBalance = parseResult.totalAmount > availableBalance;

  // Multi-batch execution
  const handleStartAirdrop = async () => {
    if (!connected?.signer) {
      toast.error("Please connect a wallet capable of signing");
      return;
    }

    if (validEntries.length === 0) {
      toast.error("Please add at least one valid recipient address and amount");
      return;
    }

    if (hasInsufficientBalance) {
      toast.error("Insufficient wallet balance for this total airdrop amount");
      return;
    }

    setIsDistributing(true);
    setCurrentBatchIndex(0);
    setTotalBatches(calculatedBatchesCount);
    setCompletedSignatures([]);
    setFailedBatches([]);

    // Chunk valid recipients
    const chunks: (typeof validEntries)[] = [];
    for (let i = 0; i < validEntries.length; i += batchSize) {
      chunks.push(validEntries.slice(i, i + batchSize));
    }

    const successfulTxs: string[] = [];
    const failedIndices: number[] = [];

    for (let b = 0; b < chunks.length; b++) {
      setCurrentBatchIndex(b + 1);
      const chunk = chunks[b];
      const toastId = toast.loading(
        `Signing & broadcasting Batch ${b + 1} of ${chunks.length} (${chunk.length} recipients)...`
      );

      try {
        let txSig = "";

        if (assetType === "sol") {
          const formattedRecipients = chunk.map((item) => ({
            address: address(item.address),
            amountSol: parseFloat(item.amount),
          }));

          const res = await executeSolAirdropBatch({
            client,
            payer: connected.signer,
            recipients: formattedRecipients,
            cluster,
            treasuryWallet: settings.treasuryWalletAddress,
            platformFeeSol: airdropFeePerBatch,
          });
          txSig = res.txSignature;
        } else {
          // SPL Token transfer
          const mintAddr = selectedToken
            ? selectedToken.mint
            : address(manualMintInput.trim());
          const decimals = selectedToken
            ? selectedToken.decimals
            : manualDecimals;

          const formattedRecipients = chunk.map((item) => ({
            address: address(item.address),
            amount: item.amount,
          }));

          const res = await executeSplAirdropBatch({
            client,
            payer: connected.signer,
            mintAddress: mintAddr,
            decimals,
            recipients: formattedRecipients,
            cluster,
            treasuryWallet: settings.treasuryWalletAddress,
            platformFeeSol: airdropFeePerBatch,
          });
          txSig = res.txSignature;
        }

        successfulTxs.push(txSig);
        setCompletedSignatures([...successfulTxs]);
        toast.success(
          `Batch ${b + 1} confirmed! (${chunk.length} recipients)`,
          {
            id: toastId,
            description: `Tx: ${txSig.slice(0, 8)}...`,
          }
        );
      } catch (err: unknown) {
        console.error(`Batch ${b + 1} failed:`, err);
        failedIndices.push(b + 1);
        setFailedBatches([...failedIndices]);
        toast.error(
          err instanceof Error
            ? `Batch ${b + 1} failed: ${err.message}`
            : `Batch ${b + 1} transaction failed`,
          { id: toastId }
        );
      }
    }

    setIsDistributing(false);

    if (successfulTxs.length === chunks.length) {
      toast.success(
        `🎉 Airdrop Complete! Successfully sent to ${validEntries.length} wallets across ${chunks.length} batches.`
      );
    } else if (successfulTxs.length > 0) {
      toast.warning(
        `Airdrop finished with ${successfulTxs.length}/${chunks.length} batches confirmed. Check the transaction log below.`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Send className="h-5 w-5 text-amber-500" />
            Batch Multi-Sender & Airdrop Engine
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Distribute SOL or any SPL Token to dozens or hundreds of wallets in
            atomic batches with automatic Associated Token Account (ATA)
            creation.
          </p>
        </div>

        {/* Asset Selection Mode */}
        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          {/* Send SOL Option */}
          <button
            type="button"
            onClick={() => setAssetType("sol")}
            className={`rounded-xl border p-3.5 text-left cursor-pointer transition-all flex items-start gap-3 ${
              assetType === "sol"
                ? "border-amber-500 bg-amber-500/10 shadow-xs"
                : "border-border/60 bg-background/50 hover:border-border text-muted-foreground"
            }`}
          >
            <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
              <Coins className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Send Native SOL
              </span>
              <span className="text-[11px] text-muted-foreground">
                Balance:{" "}
                <strong className="text-foreground font-mono">
                  {solBalance !== null
                    ? `${parseFloat(solBalance).toFixed(3)} SOL`
                    : "..."}
                </strong>
              </span>
            </div>
          </button>

          {/* Send SPL Token Option */}
          <button
            type="button"
            onClick={() => setAssetType("token")}
            className={`rounded-xl border p-3.5 text-left cursor-pointer transition-all flex items-start gap-3 ${
              assetType === "token"
                ? "border-amber-500 bg-amber-500/10 shadow-xs"
                : "border-border/60 bg-background/50 hover:border-border text-muted-foreground"
            }`}
          >
            <div className="h-8 w-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-foreground block">
                Send SPL Token
              </span>
              <span className="text-[11px] text-muted-foreground">
                {selectedToken
                  ? `Selected: ${selectedToken.balance} (${selectedToken.mint.slice(0, 4)}...${selectedToken.mint.slice(-4)})`
                  : `${walletTokens.length} tokens found in wallet`}
              </span>
            </div>
          </button>
        </div>

        {/* SPL Token Selector Dropdown / Manual Mint (if assetType === "token") */}
        {assetType === "token" && (
          <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Select Token from Connected Wallet
              </label>
              <button
                type="button"
                onClick={async () => {
                  if (!userAddress) return;
                  setLoadingTokens(true);
                  const items = await fetchWalletTokens(client, userAddress);
                  setWalletTokens(items);
                  setLoadingTokens(false);
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw
                  className={`h-3 w-3 ${loadingTokens ? "animate-spin" : ""}`}
                />
                Refresh Holdings
              </button>
            </div>

            {walletTokens.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pr-1">
                {walletTokens.map((t) => (
                  <button
                    key={t.mint}
                    type="button"
                    onClick={() => {
                      setSelectedToken(t);
                      setManualMintInput("");
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs text-left cursor-pointer transition-all flex items-center gap-2 ${
                      selectedToken?.mint === t.mint
                        ? "border-amber-500 bg-amber-500/10 font-bold text-foreground"
                        : "border-border/60 bg-card hover:border-border text-muted-foreground"
                    }`}
                  >
                    <span className="font-mono text-[11px]">
                      {t.mint.slice(0, 4)}...{t.mint.slice(-4)}
                    </span>
                    <span className="font-mono text-amber-400 font-bold">
                      {parseFloat(t.balance) > 1e6
                        ? `${(parseFloat(t.balance) / 1e6).toFixed(1)}M`
                        : t.balance}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[11px] text-muted-foreground italic">
                  No SPL tokens found in connected wallet. Enter a custom token
                  mint address:
                </p>
                <div className="grid sm:grid-cols-3 gap-2">
                  <Input
                    type="text"
                    placeholder="Token Mint Address (e.g., 7GCihg...)"
                    value={manualMintInput}
                    onChange={(e) => {
                      setManualMintInput(e.target.value);
                      setSelectedToken(null);
                    }}
                    className="font-mono text-xs sm:col-span-2"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="9"
                    placeholder="Decimals (default 9)"
                    value={manualDecimals}
                    onChange={(e) =>
                      setManualDecimals(parseInt(e.target.value) || 9)
                    }
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recipient Input Area */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Recipient Wallet List & Amounts
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Paste addresses with amounts, or upload a CSV file.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs cursor-pointer h-8"
            >
              <Upload className="h-3 w-3 mr-1" /> Upload CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSample}
              className="text-xs cursor-pointer h-8"
            >
              <FileText className="h-3 w-3 mr-1" /> Load Sample
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDownloadTemplate}
              className="text-xs cursor-pointer h-8 text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3 w-3 mr-1" /> Template
            </Button>
          </div>
        </div>

        {/* Textarea */}
        <div className="space-y-1.5">
          <Textarea
            rows={7}
            placeholder={`Paste list here (one per line):\nDezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263, 10\n7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr, 25`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            disabled={isDistributing}
            className="font-mono text-xs resize-y"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={deduplicate}
                onChange={(e) => setDeduplicate(e.target.checked)}
                className="rounded border-border text-amber-500 focus:ring-0"
              />
              Auto-merge duplicate addresses (sums amounts together)
            </label>
            <span>
              Format:{" "}
              <code className="text-foreground font-mono">address, amount</code>
            </span>
          </div>
        </div>

        {/* Live Parsing Summary Grid */}
        {parseResult.entries.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Valid Recipients
                </span>
                <span className="text-base font-bold text-foreground font-mono">
                  {parseResult.validCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Total to Send
                </span>
                <span className="text-base font-bold text-amber-400 font-mono">
                  {parseResult.totalAmount.toLocaleString()}{" "}
                  {assetType === "sol" ? "SOL" : "Tokens"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Required Batches
                </span>
                <span className="text-base font-bold text-foreground font-mono">
                  {calculatedBatchesCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({batchSize}/tx)
                  </span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
                  Platform Fee
                </span>
                <span className="text-base font-bold text-foreground font-mono">
                  {totalPlatformFee.toFixed(3)} SOL
                </span>
              </div>
            </div>

            {/* Validation Warnings / Error notices */}
            {parseResult.invalidCount > 0 && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {parseResult.invalidCount} invalid address line(s) detected.
                  These will be automatically skipped during execution.
                </span>
              </div>
            )}

            {hasInsufficientBalance && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  <strong>Insufficient Balance:</strong> You need{" "}
                  {parseResult.totalAmount}{" "}
                  {assetType === "sol" ? "SOL" : "Tokens"}, but your wallet only
                  holds {availableBalance}.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Live Execution Status & Progress Bar */}
        {isDistributing && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                Executing Batch {currentBatchIndex} of {totalBatches}...
              </span>
              <span className="font-mono text-amber-400">
                {Math.round(((currentBatchIndex - 1) / totalBatches) * 100)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-border/50 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-400 h-2 transition-all duration-300"
                style={{
                  width: `${((currentBatchIndex - 1) / totalBatches) * 100}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Please sign each batch transaction prompt in your wallet. Do not
              close this tab.
            </p>
          </div>
        )}

        {/* Action Button */}
        <Button
          type="button"
          onClick={handleStartAirdrop}
          disabled={
            isDistributing ||
            validEntries.length === 0 ||
            hasInsufficientBalance
          }
          variant="default"
          className="w-full py-3 text-xs font-semibold cursor-pointer"
        >
          {isDistributing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Broadcasting Batch {currentBatchIndex} of {totalBatches}...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Distribute {parseResult.totalAmount.toLocaleString()}{" "}
              {assetType === "sol" ? "SOL" : "Tokens"} to {validEntries.length}{" "}
              Wallets ({calculatedBatchesCount} Batches)
            </>
          )}
        </Button>

        {/* Transaction History Log */}
        {completedSignatures.length > 0 && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Confirmed Transaction Signatures ({completedSignatures.length})
              </span>
              <Badge variant="success" className="text-[10px]">
                On-Chain Confirmed
              </Badge>
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {completedSignatures.map((sig, idx) => (
                <div
                  key={sig}
                  className="flex items-center justify-between text-xs py-1 border-b border-border/40 font-mono text-muted-foreground"
                >
                  <span>
                    Batch {idx + 1}: {sig.slice(0, 8)}...{sig.slice(-8)}
                  </span>
                  <a
                    href={`https://explorer.solana.com/tx/${sig}${
                      cluster === "devnet" ? "?cluster=devnet" : ""
                    }`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    Explorer <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Failed Batches Notice */}
        {failedBatches.length > 0 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 space-y-1">
            <span className="text-xs font-bold text-red-300 flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-red-400" />
              Failed Batches ({failedBatches.length})
            </span>
            <p className="text-[11px] text-muted-foreground">
              Batch {failedBatches.join(", ")} encountered an on-chain or wallet
              signing error. You can click Distribute again to retry.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
