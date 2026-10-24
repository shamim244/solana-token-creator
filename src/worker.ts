// Cloudflare Worker Edge Router for Clean Next.js URLs, Admin Auth, and Edge Metadata API

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
  PINATA_JWT?: string;
  METADATA_KV?: {
    get(key: string, type?: "text" | "json" | "arrayBuffer"): Promise<unknown>;
    put(
      key: string,
      value: string | ArrayBuffer | ArrayBufferView,
      options?: Record<string, unknown>
    ): Promise<void>;
  };
}

export interface MetadataPayload {
  name: string;
  symbol: string;
  description?: string;
  imageData?: string; // base64 data URL
  imageFilename?: string;
  existingImageUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  tags?: string[];
  cluster?: "devnet" | "mainnet" | "localnet";
}

interface StoredMetadataItem {
  metadataJson: Record<string, unknown>;
  imageBytes?: Uint8Array;
  imageContentType?: string;
  createdAt: number;
}

// In-memory Edge Metadata Store (persists across requests on the worker isolate)
const edgeMetadataCache = new Map<string, StoredMetadataItem>();

let inMemoryPlatformSettings = {
  mainnetBaseFeeSol: 0.3,
  devnetBaseFeeSol: 0.3,
  revokeFreezeFeeSol: 0.1,
  revokeMintFeeSol: 0.1,
  revokeUpdateFeeSol: 0.1,
  absorbNetworkRent: true,
  treasuryWalletAddress: "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU",
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

/**
 * Base64 string to Uint8Array converter (100% Web standard, zero Node.js fs/crypto dependencies)
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

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
            edgeHostingAvailable: true,
            irysFreeTierAvailable: true,
            pinataAvailable: Boolean(env.PINATA_JWT),
            storedMetadataCount: edgeMetadataCache.size,
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

    // 8. Edge-Hosted Metaplex Metadata JSON Serving: GET /api/metadata/:id
    if (
      url.pathname.startsWith("/api/metadata/") &&
      !url.pathname.endsWith("/image")
    ) {
      const id = url.pathname.replace(/^\/api\/metadata\//, "").trim();
      let metadataJson = edgeMetadataCache.get(id)?.metadataJson;

      if (!metadataJson && env.METADATA_KV) {
        try {
          const stored = await env.METADATA_KV.get(`meta:${id}`, "text");
          if (typeof stored === "string") metadataJson = JSON.parse(stored);
        } catch (kvErr) {
          console.warn("KV metadata read error:", kvErr);
        }
      }

      if (!metadataJson) {
        return Response.json(
          { error: "Metadata not found or expired" },
          { status: 404, headers: corsHeaders }
        );
      }

      return new Response(JSON.stringify(metadataJson, null, 2), {
        status: 200,
        headers: {
          ...corsHeaders,
          "content-type": "application/json; charset=utf-8",
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 8b. Edge-Hosted Image Serving: GET /api/metadata/:id/image
    if (
      url.pathname.startsWith("/api/metadata/") &&
      url.pathname.endsWith("/image")
    ) {
      const id = url.pathname
        .replace(/^\/api\/metadata\//, "")
        .replace(/\/image$/, "")
        .trim();
      const item = edgeMetadataCache.get(id);
      let imageBytes = item?.imageBytes;
      let contentType = item?.imageContentType || "image/webp";

      if (!imageBytes && env.METADATA_KV) {
        try {
          const kvBuf = await env.METADATA_KV.get(`img:${id}`, "arrayBuffer");
          const kvMime = await env.METADATA_KV.get(`img_mime:${id}`, "text");
          if (kvBuf instanceof ArrayBuffer) {
            imageBytes = new Uint8Array(kvBuf);
          }
          if (typeof kvMime === "string") {
            contentType = kvMime;
          }
        } catch (kvErr) {
          console.warn("KV image read error:", kvErr);
        }
      }

      if (!imageBytes) {
        return new Response("Image not found", {
          status: 404,
          headers: corsHeaders,
        });
      }

      return new Response(imageBytes as unknown as BodyInit, {
        status: 200,
        headers: {
          ...corsHeaders,
          "content-type": contentType,
          "cache-control": "public, max-age=31536000, immutable",
        },
      });
    }

    // 9. Upload Metadata API Route (POST) - Pure Web APIs, Zero Node.js unenv dependencies
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

        const id = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
        let finalImageUrl = body.existingImageUrl || "";
        let imageBytes: Uint8Array | undefined = undefined;
        let imageContentType = "image/webp";

        // Parse image base64 if present
        if (body.imageData && body.imageData.includes("base64,")) {
          const [header, base64Data] = body.imageData.split("base64,");
          const mimeMatch = header.match(/data:([^;]+);/);
          if (mimeMatch) imageContentType = mimeMatch[1];
          imageBytes = base64ToUint8Array(base64Data);
          finalImageUrl = `${url.origin}/api/metadata/${id}/image`;
        }

        // TIER 1: If PINATA_JWT is provided, pin to IPFS via native fetch
        if (env.PINATA_JWT) {
          try {
            if (imageBytes) {
              const formData = new FormData();
              const blob = new Blob([imageBytes as unknown as BlobPart], {
                type: imageContentType,
              });
              formData.append(
                "file",
                blob,
                body.imageFilename || "token-logo.png"
              );

              const imgRes = await fetch(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${env.PINATA_JWT}` },
                  body: formData,
                }
              );

              if (imgRes.ok) {
                const imgData = (await imgRes.json()) as { IpfsHash: string };
                finalImageUrl = `https://gateway.pinata.cloud/ipfs/${imgData.IpfsHash}`;
              }
            }

            const extensions: Record<string, string> = {};
            if (body.website?.trim()) extensions.website = body.website.trim();
            if (body.twitter?.trim()) extensions.twitter = body.twitter.trim();
            if (body.telegram?.trim())
              extensions.telegram = body.telegram.trim();
            if (body.discord?.trim()) extensions.discord = body.discord.trim();

            const pinataMetadataPayload = {
              pinataContent: {
                name: body.name,
                symbol: body.symbol,
                description: body.description || "",
                image: finalImageUrl,
                ...(Object.keys(extensions).length > 0 && { extensions }),
                ...(body.tags && body.tags.length > 0 && { tags: body.tags }),
              },
              pinataMetadata: {
                name: `${body.symbol}-metadata.json`,
              },
            };

            const jsonRes = await fetch(
              "https://api.pinata.cloud/pinning/pinJSONToIPFS",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${env.PINATA_JWT}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(pinataMetadataPayload),
              }
            );

            if (jsonRes.ok) {
              const jsonData = (await jsonRes.json()) as { IpfsHash: string };
              const ipfsUri = `https://gateway.pinata.cloud/ipfs/${jsonData.IpfsHash}`;
              return Response.json(
                {
                  success: true,
                  metadataUri: ipfsUri,
                  imageUrl: finalImageUrl,
                  provider: "ipfs",
                },
                { status: 200, headers: corsHeaders }
              );
            }
          } catch (pinataErr) {
            console.warn("Pinata edge upload fallback engaged:", pinataErr);
          }
        }

        // TIER 2: Ultra-Fast Global Edge Metadata (Guaranteed 100% uptime, zero external points of failure)
        const extensions: Record<string, string> = {};
        if (body.website?.trim()) extensions.website = body.website.trim();
        if (body.twitter?.trim()) extensions.twitter = body.twitter.trim();
        if (body.telegram?.trim()) extensions.telegram = body.telegram.trim();
        if (body.discord?.trim()) extensions.discord = body.discord.trim();

        const metadataJson = {
          name: body.name,
          symbol: body.symbol,
          description: body.description || "",
          image: finalImageUrl,
          ...(Object.keys(extensions).length > 0 && { extensions }),
          ...(body.tags && body.tags.length > 0 && { tags: body.tags }),
        };

        edgeMetadataCache.set(id, {
          metadataJson,
          imageBytes,
          imageContentType,
          createdAt: Date.now(),
        });

        if (env.METADATA_KV) {
          try {
            await env.METADATA_KV.put(
              `meta:${id}`,
              JSON.stringify(metadataJson)
            );
            if (imageBytes) {
              await env.METADATA_KV.put(`img:${id}`, imageBytes);
              await env.METADATA_KV.put(`img_mime:${id}`, imageContentType);
            }
          } catch (kvErr) {
            console.warn("KV metadata write error:", kvErr);
          }
        }

        const fullMetadataUri = `${url.origin}/api/metadata/${id}`;

        return Response.json(
          {
            success: true,
            metadataUri: fullMetadataUri,
            imageUrl: finalImageUrl,
            provider: "edge-hosted",
          },
          { status: 200, headers: corsHeaders }
        );
      } catch (err: unknown) {
        console.error("Worker /api/upload-metadata error:", err);
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to process metadata upload";
        return Response.json(
          { success: false, error: errorMessage },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 10. API Catch-All: ALWAYS return clean JSON 404 for missing /api routes, NEVER fallback to HTML
    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { success: false, error: `API endpoint not found: ${url.pathname}` },
        { status: 404, headers: corsHeaders }
      );
    }

    // 11. Default static asset serving from .next build directory
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status !== 404) {
      return assetResponse;
    }

    // 12. SPA Fallback for client-side HTML routes
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
