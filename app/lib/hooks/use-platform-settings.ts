"use client";

import useSWR from "swr";

export interface PublicPlatformSettings {
  mainnetBaseFeeSol: number;
  devnetBaseFeeSol: number;
  revokeFreezeFeeSol: number;
  revokeMintFeeSol: number;
  revokeUpdateFeeSol: number;
  absorbNetworkRent: boolean;
  treasuryWalletAddress: string;
}

const DEFAULT_PUBLIC_SETTINGS: PublicPlatformSettings = {
  mainnetBaseFeeSol: 0.15,
  devnetBaseFeeSol: 0,
  revokeFreezeFeeSol: 0.1,
  revokeMintFeeSol: 0.1,
  revokeUpdateFeeSol: 0.1,
  absorbNetworkRent: true,
  treasuryWalletAddress: "54Xn6d6X4wHrkZ9eHnC8F2v56yZ8K5j2Q8s7J3k4L5m6",
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
