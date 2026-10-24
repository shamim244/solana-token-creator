// Cloudflare Worker Edge Router for Clean Next.js URLs & Edge API
export interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface Env {
  ASSETS: Fetcher;
  NEXT_PUBLIC_DEFAULT_CLUSTER?: string;
  PLATFORM_TREASURY_WALLET?: string;
  ADMIN_PASSWORD?: string;
}

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

    // 5. Public Settings API Route
    if (url.pathname === "/api/settings") {
      return Response.json({
        success: true,
        settings: {
          mainnetBaseFeeSol: 0.15,
          devnetBaseFeeSol: 0.0,
          revokeFreezeFeeSol: 0.1,
          revokeMintFeeSol: 0.1,
          revokeUpdateFeeSol: 0.1,
          absorbNetworkRent: true,
          treasuryWalletAddress:
            env.PLATFORM_TREASURY_WALLET ||
            "54Xn6d6X4wHrkZ9eHnC8F2v56yZ8K5j2Q8s7J3k4L5m6",
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
        },
      });
    }

    // 6. Default asset serving
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // 7. SPA Fallback for client-side navigation
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
