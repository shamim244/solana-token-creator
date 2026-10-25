"use client";

import { useState } from "react";
import { address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { useCluster } from "../cluster-context";
import { StepDetails } from "./steps/step-details";
import { StepSocials } from "./steps/step-socials";
import { StepAuthorities } from "./steps/step-authorities";
import { StepReview } from "./steps/step-review";
import { StepSuccess } from "./steps/step-success";
import { TokenPreviewCard } from "../preview/token-preview-card";
import { createAndDeployToken } from "../../lib/solana-token-creator";
import { compressTokenImage } from "../../lib/image-compressor";
import { usePlatformSettings } from "../../lib/hooks/use-platform-settings";
import { usePartnerAttribution } from "../../lib/hooks/use-partner-attribution";
import { parseTransactionError } from "../../lib/errors";
import { toast } from "sonner";
import { Check, ChevronRight } from "lucide-react";

export interface TokenWizardState {
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  description: string;
  imageUrl: string;
  imageFile: File | null;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  tags: string[];
  revokeFreeze: boolean;
  revokeMint: boolean;
  revokeUpdate: boolean;
}

const INITIAL_STATE: TokenWizardState = {
  name: "",
  symbol: "",
  decimals: 6,
  supply: "1000000000",
  description: "",
  imageUrl: "",
  imageFile: null,
  website: "",
  twitter: "",
  telegram: "",
  discord: "",
  tags: ["Meme", "Solana"],
  revokeFreeze: true, // Recommended & required for Raydium pools
  revokeMint: true, // Recommended for investor trust
  revokeUpdate: false,
};

const STEPS = [
  { id: 0, title: "Token Essentials", short: "Essentials" },
  { id: 1, title: "Socials & Tags", short: "Socials" },
  { id: 2, title: "Trust & Security", short: "Security" },
  { id: 3, title: "Review & Deploy", short: "Deploy" },
];

export function TokenWizard() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster, getExplorerUrl } = useCluster();
  const { settings } = usePlatformSettings();
  const { partnerSlug, discountPercent, recordConversion } =
    usePartnerAttribution(connected?.account.address);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState<TokenWizardState>(INITIAL_STATE);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedResult, setDeployedResult] = useState<{
    mintAddress: string;
    txSignature: string;
  } | null>(null);

  const updateFields = (fields: Partial<TokenWizardState>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const handleDeploy = async () => {
    if (!connected?.signer) {
      toast.error("Please connect your Solana wallet to deploy on-chain.");
      return;
    }

    setIsDeploying(true);
    const toastId = toast.loading(
      "Checking wallet balance & preparing metadata..."
    );

    try {
      // Pre-flight Balance Guard: Verify wallet has sufficient SOL before metadata upload
      const baseFee =
        cluster === "mainnet"
          ? settings.mainnetBaseFeeSol
          : settings.devnetBaseFeeSol;

      let serviceFeeTotal = baseFee;
      if (formData.revokeFreeze) serviceFeeTotal += settings.revokeFreezeFeeSol;
      if (formData.revokeMint) serviceFeeTotal += settings.revokeMintFeeSol;
      if (formData.revokeUpdate) serviceFeeTotal += settings.revokeUpdateFeeSol;

      const discountMultiplier =
        discountPercent > 0 ? Math.max(0, (100 - discountPercent) / 100) : 1;
      const discountedServiceFee =
        Math.round(serviceFeeTotal * discountMultiplier * 1000) / 1000;
      const isAbsorbed = settings.absorbNetworkRent ?? true;
      const totalRequiredSol = isAbsorbed
        ? Math.max(discountedServiceFee, 0.009)
        : discountedServiceFee + 0.009;

      const minRequiredSol = totalRequiredSol + 0.001; // tiny cushion for network transaction fees

      if (connected?.account.address) {
        try {
          const balRes = await client.rpc
            .getBalance(address(connected.account.address), {
              commitment: "confirmed",
            })
            .send();
          const currentSol = Number(balRes.value) / 1e9;
          if (currentSol < minRequiredSol) {
            toast.error(
              `Insufficient SOL balance: You have ${currentSol.toFixed(4)} SOL, but need ${totalRequiredSol.toFixed(3)} SOL to deploy.`,
              { id: toastId }
            );
            setIsDeploying(false);
            return;
          }
        } catch {
          // If RPC query fails, proceed and allow on-chain simulation to validate
        }
      }

      let finalMetadataUri = formData.imageUrl;

      // 1. Upload decentralized metadata to Irys (Arweave)
      toast.loading("Compressing & pinning metadata to Arweave (Irys)...", {
        id: toastId,
      });

      let compressedBase64: string | undefined = undefined;
      let filename: string | undefined = undefined;

      if (formData.imageFile) {
        try {
          const compressed = await compressTokenImage(formData.imageFile);
          compressedBase64 = compressed.base64;
          filename = compressed.filename;
        } catch (compressErr) {
          console.warn("Client compression fallback:", compressErr);
        }
      }

      const uploadRes = await fetch("/api/upload-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          imageData: compressedBase64,
          imageFilename: filename,
          existingImageUrl: formData.imageUrl.startsWith("blob:")
            ? ""
            : formData.imageUrl,
          website: formData.website,
          twitter: formData.twitter,
          telegram: formData.telegram,
          discord: formData.discord,
          tags: formData.tags,
          cluster,
        }),
      });

      let uploadData: {
        success?: boolean;
        metadataUri?: string;
        error?: string;
      } = {};
      try {
        uploadData = await uploadRes.json();
      } catch {
        const rawText = await uploadRes.text().catch(() => "");
        throw new Error(
          uploadRes.status === 404
            ? "Metadata API endpoint not reachable on host"
            : `Storage service response error (${uploadRes.status}): ${rawText.slice(0, 100)}`
        );
      }

      if (uploadData.success && uploadData.metadataUri) {
        finalMetadataUri = uploadData.metadataUri;
      } else {
        console.warn("Metadata storage notice:", uploadData.error);
        if (cluster === "localnet") {
          finalMetadataUri = formData.imageUrl;
        } else {
          throw new Error(
            uploadData.error ||
              "Failed to upload metadata to decentralized storage"
          );
        }
      }

      toast.loading("Composing atomic mint transaction in wallet...", {
        id: toastId,
      });

      const result = await createAndDeployToken(
        client,
        connected.signer,
        {
          ...formData,
          metadataUri: finalMetadataUri,
          treasuryWallet: settings.treasuryWalletAddress,
          baseFeeSol: baseFee,
          revokeFreezeFeeSol: settings.revokeFreezeFeeSol,
          revokeMintFeeSol: settings.revokeMintFeeSol,
          revokeUpdateFeeSol: settings.revokeUpdateFeeSol,
          absorbNetworkRent: settings.absorbNetworkRent,
          discountPercent: discountPercent > 0 ? discountPercent : undefined,
        },
        cluster
      );

      // Log partner attribution conversion if visitor originated from partner link
      if (partnerSlug && connected?.account.address) {
        let nominalFee = baseFee;
        if (formData.revokeFreeze) nominalFee += settings.revokeFreezeFeeSol;
        if (formData.revokeMint) nominalFee += settings.revokeMintFeeSol;
        if (formData.revokeUpdate) nominalFee += settings.revokeUpdateFeeSol;
        if (discountPercent > 0) {
          nominalFee =
            Math.round(nominalFee * ((100 - discountPercent) / 100) * 1000) /
            1000;
        }

        recordConversion({
          type: "token_create",
          userWallet: connected.account.address,
          feeSol: nominalFee,
          txSignature: result.txSignature,
        }).catch((e) =>
          console.warn("Failed to record partner conversion:", e)
        );
      }

      toast.success("Token deployed successfully!", { id: toastId });
      setDeployedResult({
        mintAddress: result.mintAddress,
        txSignature: result.txSignature,
      });
      setStep(4); // Success step
    } catch (err: unknown) {
      console.warn("Token creation notice/error:", err);
      const errorMsg = parseTransactionError(err);
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsDeploying(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_STATE);
    setDeployedResult(null);
    setStep(0);
  };

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-12 items-start">
      {/* Left Column: Multi-Step Wizard (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        {/* Stepper Header (only visible before success) */}
        {step < 4 && (
          <nav
            aria-label="Progress"
            className="rounded-xl border border-border bg-card/60 p-2 shadow-xs"
          >
            <ol className="flex items-center justify-between gap-1">
              {STEPS.map((s, idx) => {
                const isCurrent = step === s.id;
                const isCompleted = step > s.id;

                return (
                  <li key={s.id} className="flex-1 flex items-center">
                    <button
                      type="button"
                      onClick={() => isCompleted && setStep(s.id)}
                      disabled={!isCompleted}
                      className={`group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        isCurrent
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                          : isCompleted
                            ? "cursor-pointer text-foreground hover:bg-secondary/70"
                            : "text-muted-foreground/60 cursor-not-allowed"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isCurrent
                            ? "bg-amber-500 text-slate-950 shadow-xs"
                            : isCompleted
                              ? "bg-emerald-500 text-slate-950"
                              : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="h-3 w-3 stroke-[3]" />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span className="hidden sm:inline truncate">
                        {s.short}
                      </span>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <ChevronRight className="h-3.5 w-3.5 text-border/80 shrink-0 mx-0.5" />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {/* Wizard Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl relative overflow-hidden">
          {/* Subtle top amber border highlight */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

          {step === 0 && (
            <StepDetails
              data={formData}
              onChange={updateFields}
              onNext={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <StepSocials
              data={formData}
              onChange={updateFields}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}

          {step === 2 && (
            <StepAuthorities
              data={formData}
              cluster={cluster}
              onChange={updateFields}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepReview
              data={formData}
              cluster={cluster}
              isDeploying={isDeploying}
              onDeploy={handleDeploy}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && deployedResult && (
            <StepSuccess
              tokenData={formData}
              mintAddress={deployedResult.mintAddress}
              txSignature={deployedResult.txSignature}
              getExplorerUrl={getExplorerUrl}
              cluster={cluster}
              onReset={handleReset}
            />
          )}
        </div>
      </div>

      {/* Right Column: Sticky Live Token Preview (5 cols) */}
      <div className="lg:col-span-5">
        <TokenPreviewCard data={formData} />
      </div>
    </div>
  );
}
