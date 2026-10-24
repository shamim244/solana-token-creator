"use client";

import { useState, useSyncExternalStore } from "react";
import {
  useConnectedWallet,
  useIsWalletReady,
} from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { useCluster } from "../cluster-context";
import { AuthorityRevokerCard } from "./authority-revoker-card";
import { MetadataUpdaterCard } from "./metadata-updater-card";
import { TokenBurnerCard } from "./token-burner-card";
import { DexLauncherCard } from "./dex-launcher-card";
import { AirdropCard } from "./airdrop-card";
import { TransferSolCard } from "./transfer-sol-card";
import { ShieldCheck, Edit3, Flame, Droplets, Coins } from "lucide-react";

const subscribeToHydration = () => () => {};

type UtilityTab = "revoker" | "metadata" | "burner" | "launchpad" | "faucet";

export function ActionsPanel() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const isWalletReady = useIsWalletReady(client);
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );
  const { cluster } = useCluster();

  const [activeTab, setActiveTab] = useState<UtilityTab>("revoker");

  if (!isHydrated || !isWalletReady) {
    return (
      <div
        className="mt-8 rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground text-center"
        role="status"
      >
        Restoring wallet connection...
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="mt-8 rounded-2xl border border-border/70 bg-card p-8 text-center space-y-3">
        <ShieldCheck className="h-10 w-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-foreground">
          Wallet Connection Required
        </h3>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Connect your Solana wallet (Phantom, Solflare, Backpack) to access
          standalone authority revocations, on-chain metadata editing, token
          burning, and DEX pool launchers.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Cluster Notice */}
      {cluster === "mainnet" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
          <strong>Mainnet Mode Active:</strong> All revocations, burns, and
          metadata updates execute real on-chain Solana state changes. Always
          verify wallet transaction simulations before signing.
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-border/70 bg-card p-1.5 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab("revoker")}
          className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "revoker"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Authority Revoker
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("metadata")}
          className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "metadata"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <Edit3 className="h-4 w-4" />
          Update Metadata
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("burner")}
          className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "burner"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <Flame className="h-4 w-4" />
          Token Burner
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("launchpad")}
          className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "launchpad"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <Droplets className="h-4 w-4" />
          DEX & Launchpad
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("faucet")}
          className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "faucet"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <Coins className="h-4 w-4" />
          {cluster === "devnet" ? "Devnet Faucet" : "Wallet Tools"}
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "revoker" && <AuthorityRevokerCard />}
        {activeTab === "metadata" && <MetadataUpdaterCard />}
        {activeTab === "burner" && <TokenBurnerCard />}
        {activeTab === "launchpad" && <DexLauncherCard />}
        {activeTab === "faucet" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {cluster !== "mainnet" && <AirdropCard />}
            <TransferSolCard />
          </div>
        )}
      </div>
    </div>
  );
}
