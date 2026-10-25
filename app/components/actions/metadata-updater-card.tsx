"use client";

import { useState } from "react";
import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { useCluster } from "../cluster-context";
import { usePlatformSettings } from "../../lib/hooks/use-platform-settings";
import {
  inspectToken,
  updateMetadataOnChain,
  type TokenInspectionResult,
} from "../../lib/solana-token-utilities";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Edit3,
  Search,
  Upload,
  Globe,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { parseTransactionError } from "../../lib/errors";

export function MetadataUpdaterCard() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster } = useCluster();
  const { settings } = usePlatformSettings();

  const [mintInput, setMintInput] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [tokenData, setTokenData] = useState<TokenInspectionResult | null>(
    null
  );

  // Form Fields
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");
  const [discord, setDiscord] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const updateFee = settings.updateMetadataFeeSol ?? 0.05;

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
      setName(data.name || "");
      setSymbol(data.symbol || "");
      setDescription(data.description || "");
      setWebsite(data.website || "");
      setTwitter(data.twitter || "");
      setTelegram(data.telegram || "");
      setDiscord(data.discord || "");
      setImagePreview(data.image || null);
      setImageData(null);
      toast.success(`Loaded metadata for ${data.name || data.symbol}`);
    } catch (err: unknown) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Failed to load token metadata"
      );
    } finally {
      setInspecting(false);
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageData(base64);
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected?.signer) {
      toast.error("Please connect a wallet capable of signing");
      return;
    }
    if (!tokenData) return;

    if (!tokenData.isMutable) {
      toast.error("This token is immutable. Metadata can never be changed.");
      return;
    }

    if (!tokenData.isWalletUpdateAuthority) {
      toast.error(
        "Connected wallet is not the Update Authority for this token"
      );
      return;
    }

    setUpdating(true);
    const toastId = toast.loading("Uploading updated metadata to storage...");

    try {
      // 1. Upload updated metadata to decentralized storage (Irys / IPFS)
      const uploadRes = await fetch("/api/upload-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          symbol: symbol.trim(),
          description: description.trim(),
          imageData: imageData || undefined,
          existingImageUrl: !imageData && imagePreview ? imagePreview : "",
          website: website.trim() || undefined,
          twitter: twitter.trim() || undefined,
          telegram: telegram.trim() || undefined,
          discord: discord.trim() || undefined,
          cluster,
        }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.success || !uploadData.metadataUri) {
        throw new Error(
          uploadData.error || "Failed to upload metadata to storage"
        );
      }

      const newMetadataUri = uploadData.metadataUri as string;

      // 2. Submit on-chain UpdateMetadataAccountV2 transaction
      toast.loading("Signing & confirming metadata update in wallet...", {
        id: toastId,
      });

      const result = await updateMetadataOnChain(client, {
        mintAddress: tokenData.mintAddress,
        name: name.trim(),
        symbol: symbol.trim(),
        uri: newMetadataUri,
        payer: connected.signer,
        cluster,
        treasuryWallet: settings.treasuryWalletAddress,
        platformFeeSol: updateFee,
      });

      toast.success("Token metadata updated on-chain!", {
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

      // Refresh token data
      const refreshed = await inspectToken(
        client,
        tokenData.mintAddress,
        address(connected.account.address)
      );
      setTokenData(refreshed);
    } catch (err: unknown) {
      console.warn("Metadata update notice/error:", err);
      const errorMsg = parseTransactionError(err);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Edit3 className="h-5 w-5 text-amber-500" />
            Token Metadata Updater
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Update token name, symbol, logo, description, and socials on-chain
            via Metaplex Token Metadata V3.
          </p>
        </div>

        <form onSubmit={handleInspect} className="flex gap-2">
          <Input
            type="text"
            placeholder="Paste token mint address (e.g., 7GCihg...)"
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
            Inspect & Edit
          </Button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <span>
            Platform Fee:{" "}
            <strong className="text-foreground">{updateFee} SOL</strong>
          </span>
          <span className="text-amber-500/90 font-medium">
            Permanent Irys/IPFS Decentralized Storage Included
          </span>
        </div>
      </div>

      {/* Editor Form */}
      {tokenData && (
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
          {/* Authority Validation Banners */}
          {!tokenData.isMutable ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              <div className="text-xs text-foreground">
                <strong className="text-red-300">Metadata is Immutable:</strong>{" "}
                This token&apos;s update authority was revoked or locked. No
                further edits can ever be made.
              </div>
            </div>
          ) : !tokenData.isWalletUpdateAuthority ? (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="text-xs text-foreground">
                <strong className="text-amber-300">
                  Update Authority Required:
                </strong>{" "}
                Your connected wallet (
                <span className="font-mono">
                  {connected?.account.address.slice(0, 4)}...
                  {connected?.account.address.slice(-4)}
                </span>
                ) is not the Update Authority (
                <span className="font-mono">
                  {tokenData.updateAuthority?.slice(0, 4)}...
                  {tokenData.updateAuthority?.slice(-4)}
                </span>
                ). You can view the metadata, but only the update authority can
                save changes.
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="text-xs text-emerald-300 font-medium">
                Verified Update Authority: You have full permissions to update
                this token.
              </div>
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-5">
            {/* Logo & Basic Info */}
            <div className="grid sm:grid-cols-3 gap-4 items-start">
              {/* Logo Upload Box */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground block">
                  Token Logo
                </label>
                <div className="rounded-xl border border-dashed border-border/80 bg-background/50 p-4 flex flex-col items-center justify-center text-center gap-3">
                  {imagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imagePreview}
                      alt="Logo Preview"
                      className="h-20 w-20 rounded-full border border-border object-cover bg-muted/30"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full border border-border bg-amber-500/10 flex items-center justify-center text-amber-500 font-bold text-xl">
                      {symbol.slice(0, 2) || "TL"}
                    </div>
                  )}

                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors">
                    <Upload className="h-3.5 w-3.5" />
                    Change Image
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden"
                      onChange={handleImageFile}
                      disabled={
                        !tokenData.isWalletUpdateAuthority ||
                        !tokenData.isMutable
                      }
                    />
                  </label>
                  <span className="text-[10px] text-muted-foreground">
                    PNG, WebP, GIF up to 5MB
                  </span>
                </div>
              </div>

              {/* Name & Symbol */}
              <div className="sm:col-span-2 space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Token Name
                    </label>
                    <Input
                      type="text"
                      maxLength={32}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., DogeCoin 2.0"
                      disabled={
                        !tokenData.isWalletUpdateAuthority ||
                        !tokenData.isMutable
                      }
                      className="text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Token Symbol
                    </label>
                    <Input
                      type="text"
                      maxLength={10}
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      placeholder="e.g., DOGE"
                      disabled={
                        !tokenData.isWalletUpdateAuthority ||
                        !tokenData.isMutable
                      }
                      className="text-xs uppercase font-mono"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your project, utility, and mission..."
                    rows={3}
                    disabled={
                      !tokenData.isWalletUpdateAuthority || !tokenData.isMutable
                    }
                    className="text-xs resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Social Links Grid */}
            <div className="space-y-2 pt-2 border-t border-border/60">
              <span className="text-xs font-semibold text-foreground block">
                Social & Community Links
              </span>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="Website (https://...)"
                    disabled={
                      !tokenData.isWalletUpdateAuthority || !tokenData.isMutable
                    }
                    className="text-xs pl-8 font-mono"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">
                    𝕏
                  </span>
                  <Input
                    type="url"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    placeholder="Twitter / X profile URL"
                    disabled={
                      !tokenData.isWalletUpdateAuthority || !tokenData.isMutable
                    }
                    className="text-xs pl-8 font-mono"
                  />
                </div>
                <div className="relative">
                  <Send className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="url"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="Telegram community link"
                    disabled={
                      !tokenData.isWalletUpdateAuthority || !tokenData.isMutable
                    }
                    className="text-xs pl-8 font-mono"
                  />
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">
                    👾
                  </span>
                  <Input
                    type="url"
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                    placeholder="Discord invite link"
                    disabled={
                      !tokenData.isWalletUpdateAuthority || !tokenData.isMutable
                    }
                    className="text-xs pl-8 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Current URI info */}
            {tokenData.uri && (
              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                <span>Current Metadata URI:</span>
                <a
                  href={tokenData.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-amber-400 hover:underline flex items-center gap-1 truncate"
                >
                  {tokenData.uri} <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            )}

            {/* Submit Action */}
            <Button
              type="submit"
              disabled={
                updating ||
                !tokenData.isWalletUpdateAuthority ||
                !tokenData.isMutable
              }
              variant="default"
              className="w-full text-xs font-semibold cursor-pointer py-2.5"
            >
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating On-Chain Metadata...
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Update On-Chain Metadata ({updateFee} SOL)
                </>
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
