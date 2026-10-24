import { describe, it, expect } from "vitest";
import { MetadataStorageService } from "../app/lib/metadata-storage-service";
import worker from "../src/worker";

describe("MetadataStorageService & Cloudflare Worker API", () => {
  it("generates and uploads valid metadata via MetadataStorageService", async () => {
    const payload = {
      name: "Test Token",
      symbol: "TEST",
      description: "A test token for unit verification",
      website: "https://example.com",
    };

    const result = await MetadataStorageService.upload(payload);
    expect(result.success).toBe(true);
    expect(result.metadataUri).toBeDefined();
    expect(result.metadataUri.startsWith("https://gateway.irys.xyz/")).toBe(
      true
    );
  }, 30_000);

  it("handles /api/upload-metadata via Worker fetch handler", async () => {
    const req = new Request(
      "https://solana-token-creator.shamim2448.workers.dev/api/upload-metadata",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Worker Token",
          symbol: "WORK",
          description: "Testing worker edge route",
        }),
      }
    );

    const mockEnv = {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    };

    const res = await worker.fetch(req, mockEnv);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      success: boolean;
      metadataUri?: string;
    };
    expect(data.success).toBe(true);
    expect(data.metadataUri).toBeDefined();
    expect(data.metadataUri?.startsWith("https://gateway.irys.xyz/")).toBe(
      true
    );
  }, 30_000);

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
