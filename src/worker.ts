// Cloudflare Worker Edge Router for Clean Next.js URLs, Admin Auth, and Edge API
export interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface Env {
  ASSETS: Fetcher;
  NEXT_PUBLIC_DEFAULT_CLUSTER?: string;
  PLATFORM_TREASURY_WALLET?: string;
  ADMIN_PASSWORD?: string;
  IRYS_NETWORK?: string;
}

let inMemoryPlatformSettings = {
  mainnetBaseFeeSol: 0.15,
  devnetBaseFeeSol: 0.0,
  revokeFreezeFeeSol: 0.1,
  revokeMintFeeSol: 0.1,
  revokeUpdateFeeSol: 0.1,
  absorbNetworkRent: true,
  treasuryWalletAddress: "54Xn6d6X4wHrkZ9eHnC8F2v56yZ8K5j2Q8s7J3k4L5m6",
  promoDiscountPercent: 0,
  promoBannerActive: false,
  promoBannerText: "⚡ Launch Week Special: 20% Off All Authority Revocations!",
  referralProgramActive: false,
  referralFeeSharePercent: 20,
  platformTitle: "Solana Token Studio",
  platformTagline: "SPL & Token-2022 Launchpad",
  supportTelegram: "https://t.me/solanatokenstudio",
  supportTwitter: "https://x.com/solanatokenstudio",
  supportDiscord: "https://discord.gg/solana",
  maintenanceMode: false,
  mainnetRpcUrl: "https://api.mainnet-beta.solana.com",
  devnetRpcUrl: "https://api.devnet.solana.com",
  irysNetwork: "devnet" as const,
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Clean URL Enforcer: Redirect legacy /server/app URLs back to clean root "/"
    if (url.pathname === "/server/app" || url.pathname.startsWith("/server/app/")) {
      const cleanPath = url.pathname.replace(/^\/server\/app/, "") || "/";
      return Response.redirect(new URL(cleanPath, request.url), 301);
    }

    // 2. Root route "/" -> Serve main page HTML directly with status 200 (Clean URL)
    if (url.pathname === "/" || url.pathname === "") {
      const pageRes = await env.ASSETS.fetch(
        new Request(new URL("/server/app/", request.url)),
        { redirect: "follow" }
      );
      return new Response(pageRes.body, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=0, must-revalidate",
        },
      });
    }

    // 3. Admin route "/admin" -> Serve admin panel HTML cleanly at "/admin"
    if (url.pathname === "/admin" || url.pathname === "/admin/") {
      const pageRes = await env.ASSETS.fetch(
        new Request(new URL("/server/app/admin.html", request.url)),
        { redirect: "follow" }
      );
      return new Response(pageRes.body, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=0, must-revalidate",
        },
      });
    }

    // 4. Static chunks rewrite: Next.js requests "/_next/static/*" -> map to "/static/*" in .next
    if (url.pathname.startsWith("/_next/static/")) {
      const assetPath = url.pathname.replace("/_next/static/", "/static/");
      const assetUrl = new URL(assetPath, request.url);
      return env.ASSETS.fetch(new Request(assetUrl, request));
    }

    // 5. Admin Settings API Route (GET & POST - with Passcode Auth)
    if (url.pathname === "/api/admin/settings") {
      const authHeader = request.headers.get("Authorization") || "";
      const expectedPassword = env.ADMIN_PASSWORD || "admin123";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();

      if (token !== expectedPassword) {
        return Response.json(
          { success: false, error: "Unauthorized: Invalid admin passcode" },
          { status: 401 }
        );
      }

      if (request.method === "POST") {
        try {
          const body = (await request.json()) as Partial<typeof inMemoryPlatformSettings>;
          inMemoryPlatformSettings = {
            ...inMemoryPlatformSettings,
            ...body,
          };
          return Response.json({ success: true, settings: inMemoryPlatformSettings });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Failed to update settings";
          return Response.json({ success: false, error: msg }, { status: 400 });
        }
      }

      return Response.json({
        success: true,
        settings: {
          ...inMemoryPlatformSettings,
          treasuryWalletAddress:
            env.PLATFORM_TREASURY_WALLET || inMemoryPlatformSettings.treasuryWalletAddress,
        },
      });
    }

    // 6. Diagnostics status route
    if (url.pathname === "/api/upload-metadata/status") {
      return Response.json({
        success: true,
        timestamp: new Date().toISOString(),
        diagnostics: {
          irysFreeTierAvailable: true,
          irysFundedTierAvailable: false,
          pinataAvailable: false,
          localHostedAvailable: true,
          activeNetwork: env.IRYS_NETWORK || "devnet",
        },
      });
    }

    // 7. Public Settings API Route
    if (url.pathname === "/api/settings") {
      return Response.json({
        success: true,
        settings: {
          ...inMemoryPlatformSettings,
          treasuryWalletAddress:
            env.PLATFORM_TREASURY_WALLET || inMemoryPlatformSettings.treasuryWalletAddress,
        },
      });
    }

    // 8. Default asset serving
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // 9. SPA Fallback for client-side navigation
    const fallbackRes = await env.ASSETS.fetch(
      new Request(new URL("/server/app/", request.url)),
      { redirect: "follow" }
    );
    return new Response(fallbackRes.body, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  },
};

export default worker;
