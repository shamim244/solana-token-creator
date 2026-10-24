import { describe, it, expect } from "vitest";
import { MetadataStorageService } from "../app/lib/metadata-storage-service";
import worker from "../src/worker";

describe("MetadataStorageService & Cloudflare Worker API", () => {
  it("generates and uploads valid metadata via Node/VPS MetadataStorageService", async () => {
    const payload = {
      name: "Test Token",
      symbol: "TEST",
      description: "A test token for unit verification",
      website: "https://example.com",
    };

    const result = await MetadataStorageService.upload(payload);
    expect(result.success).toBe(true);
    expect(result.metadataUri).toBeDefined();
  }, 30_000);

  it("handles /api/upload-metadata and serves edge metadata cleanly via Worker", async () => {
    const postReq = new Request(
      "https://solana-token-creator.shamim2448.workers.dev/api/upload-metadata",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Edge Token",
          symbol: "EDGE",
          description: "Ultra-fast edge hosted token metadata",
          imageData:
            "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==",
          imageFilename: "edge.webp",
          website: "https://solana.com",
        }),
      }
    );

    const mockEnv = {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    };

    const postRes = await worker.fetch(postReq, mockEnv);
    expect(postRes.status).toBe(200);

    const postData = (await postRes.json()) as {
      success: boolean;
      metadataUri: string;
      imageUrl: string;
    };
    expect(postData.success).toBe(true);
    expect(postData.metadataUri).toContain("/api/metadata/");
    expect(postData.imageUrl).toContain("/api/metadata/");

    // Verify GET /api/metadata/:id returns valid Metaplex JSON
    const getReq = new Request(postData.metadataUri);
    const getRes = await worker.fetch(getReq, mockEnv);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("content-type")).toContain("application/json");

    const fetchedJson = (await getRes.json()) as {
      name: string;
      symbol: string;
      image: string;
    };
    expect(fetchedJson.name).toBe("Edge Token");
    expect(fetchedJson.symbol).toBe("EDGE");
    expect(fetchedJson.image).toBe(postData.imageUrl);

    // Verify GET /api/metadata/:id/image returns binary image
    const imgReq = new Request(postData.imageUrl);
    const imgRes = await worker.fetch(imgReq, mockEnv);
    expect(imgRes.status).toBe(200);
    expect(imgRes.headers.get("content-type")).toBe("image/webp");
  });

  it("guarantees unknown /api/* routes return JSON 404, never HTML", async () => {
    const req = new Request(
      "https://solana-token-creator.shamim2448.workers.dev/api/unknown-endpoint"
    );
    const mockEnv = {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    };

    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(404);
    const data = (await res.json()) as { success: boolean; error: string };
    expect(data.success).toBe(false);
    expect(data.error).toContain("API endpoint not found");
  });

  it("handles CORS preflight on /api/upload-metadata with 204", async () => {
    const req = new Request(
      "https://solana-token-creator.shamim2448.workers.dev/api/upload-metadata",
      {
        method: "OPTIONS",
      }
    );
    const mockEnv = {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    };

    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
