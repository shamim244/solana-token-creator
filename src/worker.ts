// Cloudflare Worker Edge Router for Clean Next.js URLs, Admin Auth, and Edge API
import {
  MetadataStorageService,
  type MetadataPayload,
} from "../app/lib/metadata-storage-service";

export interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface Env {
  ASSETS: Fetcher;
  NEXT_PUBLIC_DEFAULT_CLUSTER?: string;
  PLATFORM_TREASURY_WALLET?: string;
  ADMIN_PASSWORD?: string;
  IRYS_NETWORK?: string;
  MAINNET_RPC_URL?: string;
  DEVNET_RPC_URL?: string;
  IRYS_WALLET_PRIVATE_KEY?: string;
  PINATA_JWT?: string;
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 0. CORS preflight handler for API endpoints
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // 1. Clean URL Enforcer: Redirect legacy /server/app URLs back to clean root "/"
    if (
      url.pathname === "/server/app" ||
      url.pathname.startsWith("/server/app/")
    ) {
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
          { status: 401, headers: corsHeaders }
        );
      }

      if (request.method === "POST") {
        try {
          const body = (await request.json()) as Partial<
            typeof inMemoryPlatformSettings
          >;
          inMemoryPlatformSettings = {
            ...inMemoryPlatformSettings,
            ...body,
          };
          return Response.json(
            { success: true, settings: inMemoryPlatformSettings },
            { status: 200, headers: corsHeaders }
          );
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : "Failed to update settings";
          return Response.json(
            { success: false, error: msg },
            { status: 400, headers: corsHeaders }
          );
        }
      }

      return Response.json(
        {
          success: true,
          settings: {
            ...inMemoryPlatformSettings,
            treasuryWalletAddress:
              env.PLATFORM_TREASURY_WALLET ||
              inMemoryPlatformSettings.treasuryWalletAddress,
          },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 6. Diagnostics status route
    if (url.pathname === "/api/upload-metadata/status") {
      return Response.json(
        {
          success: true,
          timestamp: new Date().toISOString(),
          diagnostics: {
            irysFreeTierAvailable: true,
            irysFundedTierAvailable: Boolean(env.IRYS_WALLET_PRIVATE_KEY),
            pinataAvailable: Boolean(env.PINATA_JWT),
            localHostedAvailable: false, // Edge runtime uses decentralized storage
            activeNetwork: env.IRYS_NETWORK || "devnet",
          },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 7. Public Settings API Route
    if (url.pathname === "/api/settings") {
      return Response.json(
        {
          success: true,
          settings: {
            ...inMemoryPlatformSettings,
            treasuryWalletAddress:
              env.PLATFORM_TREASURY_WALLET ||
              inMemoryPlatformSettings.treasuryWalletAddress,
          },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 8. Upload Metadata API Route (POST) - Decentralized Irys & IPFS Storage
    if (url.pathname === "/api/upload-metadata") {
      if (request.method !== "POST") {
        return Response.json(
          { success: false, error: "Method not allowed. Use POST." },
          { status: 405, headers: corsHeaders }
        );
      }

      try {
        const body = (await request.json()) as MetadataPayload;

        if (!body.name?.trim() || !body.symbol?.trim()) {
          return Response.json(
            { success: false, error: "Name and symbol are required fields" },
            { status: 400, headers: corsHeaders }
          );
        }

        const rpcUrl =
          body.cluster === "mainnet"
            ? env.MAINNET_RPC_URL || inMemoryPlatformSettings.mainnetRpcUrl
            : env.DEVNET_RPC_URL || inMemoryPlatformSettings.devnetRpcUrl;

        const result = await MetadataStorageService.upload(body, {
          rpcUrl,
          privateKey: env.IRYS_WALLET_PRIVATE_KEY,
          pinataJwt: env.PINATA_JWT,
        });

        if (!result.success) {
          return Response.json(
            { success: false, error: result.error || "Metadata upload failed" },
            { status: 500, headers: corsHeaders }
          );
        }

        return Response.json(result, { status: 200, headers: corsHeaders });
      } catch (err: unknown) {
        console.error("Worker /api/upload-metadata error:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to upload metadata to decentralized storage";
        return Response.json(
          { success: false, error: errorMessage },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 9. API Catch-All: ALWAYS return clean JSON 404 for missing /api routes, NEVER fallback to HTML
    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { success: false, error: `API endpoint not found: ${url.pathname}` },
        { status: 404, headers: corsHeaders }
      );
    }

    // 10. Default static asset serving from .next build directory
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // 11. SPA Fallback for client-side HTML routes
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
