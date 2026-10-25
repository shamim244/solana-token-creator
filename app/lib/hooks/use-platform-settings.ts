"use client";

import useSWR from "swr";
import type { PlatformSettings } from "../platform-settings";

export type PublicPlatformSettings = Omit<
  PlatformSettings,
  "mainnetRpcUrl" | "devnetRpcUrl" | "irysNetwork"
>;

const DEFAULT_PUBLIC_SETTINGS: PublicPlatformSettings = {
  mainnetBaseFeeSol: 0.3,
  devnetBaseFeeSol: 0.3,
  revokeFreezeFeeSol: 0.1,
  revokeMintFeeSol: 0.1,
  revokeUpdateFeeSol: 0.1,
  revokeStandaloneFeeSol: 0.05,
  updateMetadataFeeSol: 0.05,
  burnTokenFeeSol: 0.0,
  airdropFeeSol: 0.01,
  absorbNetworkRent: true,
  treasuryWalletAddress: "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU",
  promoDiscountPercent: 0,
  promoBannerActive: false,
  promoBannerText: "⚡ Launch Week Special: 20% Off All Authority Revocations!",
  referralProgramActive: true,
  referralFeeSharePercent: 15,
  referralDiscountPercent: 5,
  partnerFeeSharePercent: 30,
  partnerDiscountPercent: 10,
  platformTitle: "Solana Token Studio",
  platformTagline: "SPL & Token-2022 Launchpad",
  supportTelegram: "https://t.me/solanatokenstudio",
  supportTwitter: "https://x.com/solanatokenstudio",
  supportDiscord: "https://discord.gg/solana",
  maintenanceMode: false,
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePlatformSettings() {
  const { data, error, isLoading, mutate } = useSWR<{
    success: boolean;
    settings: PublicPlatformSettings;
  }>("/api/settings", fetcher, {
    revalidateOnFocus: true,
    revalidateIfStale: true,
  });

  return {
    settings: data?.settings || DEFAULT_PUBLIC_SETTINGS,
    isLoading,
    isError: Boolean(error),
    refreshSettings: mutate,
  };
}
