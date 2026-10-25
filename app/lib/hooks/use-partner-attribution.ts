"use client";

import { useState, useEffect, useCallback } from "react";

interface StoredAttribution {
  slug: string;
  name: string;
  tier?: "partner" | "referrer";
  discountPercent: number;
  timestamp: number;
}

const STORAGE_KEY = "solana_token_studio_partner_attribution";
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30-day cookie window

export function usePartnerAttribution(userWalletAddress?: string) {
  const [partner, setPartner] = useState<StoredAttribution | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check if URL contains ?code=... or ?partner=... or ?ref=... or ?creator=... or ?discount=...
    const urlParams = new URLSearchParams(window.location.search);
    const candidateSlug =
      urlParams.get("code") ||
      urlParams.get("partner") ||
      urlParams.get("ref") ||
      urlParams.get("creator") ||
      urlParams.get("discount") ||
      "";

    if (candidateSlug) {
      const cleanSlug = candidateSlug.trim().toLowerCase();

      // Look up partner discount & record click
      fetch(`/api/partners/lookup?slug=${encodeURIComponent(cleanSlug)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.partner) {
            const attribution: StoredAttribution = {
              slug: data.partner.slug,
              name: data.partner.name,
              tier: data.partner.tier || "partner",
              discountPercent: data.partner.audienceDiscountPercent || 0,
              timestamp: Date.now(),
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
            setPartner(attribution);

            // Clean address bar so user doesn't see long tracking query params
            try {
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            } catch {
              // Ignore in environments where history API is restricted
            }

            // Record click
            fetch("/api/partners/click", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug: cleanSlug }),
            }).catch(() => {});
          }
        })
        .catch(() => {});
    } else {
      // 2. Read from localStorage if valid within 30-day window
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as StoredAttribution;
          if (Date.now() - parsed.timestamp < ATTRIBUTION_WINDOW_MS) {
            Promise.resolve().then(() => {
              setPartner(parsed);
            });
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  }, []);

  // When userWalletAddress connects, record wallet connection if not yet logged in this session
  useEffect(() => {
    if (typeof window === "undefined" || !userWalletAddress || !partner?.slug)
      return;

    const sessionKey = `partner_conn_${partner.slug}_${userWalletAddress}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      fetch("/api/partners/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: partner.slug }),
      }).catch(() => {});
    }
  }, [userWalletAddress, partner?.slug]);

  /**
   * Manually applies a promo or referral code entered by the user.
   */
  const applyCode = useCallback(async (rawCode: string) => {
    if (!rawCode || !rawCode.trim()) {
      return { success: false, error: "Please enter a valid code." };
    }
    const cleanSlug = rawCode.trim().toLowerCase();
    try {
      const res = await fetch(
        `/api/partners/lookup?slug=${encodeURIComponent(cleanSlug)}`
      );
      const data = await res.json();
      if (!data.success || !data.partner) {
        return {
          success: false,
          error: data.error || "Code not recognized.",
        };
      }

      const attribution: StoredAttribution = {
        slug: data.partner.slug,
        name: data.partner.name,
        tier: data.partner.tier || "partner",
        discountPercent: data.partner.audienceDiscountPercent || 0,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
      setPartner(attribution);

      // Record click
      fetch("/api/partners/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: cleanSlug }),
      }).catch(() => {});

      return {
        success: true,
        partner: attribution,
      };
    } catch {
      return {
        success: false,
        error: "Network error while verifying code.",
      };
    }
  }, []);

  /**
   * Removes currently active discount / referral code.
   */
  const removeCode = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setPartner(null);
  }, []);

  const recordConversion = useCallback(
    async (params: {
      type: "token_create" | "revoke_authority" | "metadata_update" | "airdrop";
      userWallet: string;
      feeSol: number;
      txSignature?: string;
    }) => {
      if (!partner?.slug) return null;
      try {
        const res = await fetch("/api/partners/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slugOrWallet: partner.slug,
            userWallet: params.userWallet,
            type: params.type,
            feeSol: params.feeSol,
            txSignature: params.txSignature,
          }),
        });
        const data = await res.json();
        return data.success ? data.conversion : null;
      } catch {
        return null;
      }
    },
    [partner]
  );

  return {
    partnerSlug: partner?.slug || null,
    partnerName: partner?.name || null,
    tier: partner?.tier || null,
    discountPercent: partner?.discountPercent || 0,
    isPartnerAttributed: Boolean(partner?.slug),
    applyCode,
    removeCode,
    recordConversion,
  };
}
