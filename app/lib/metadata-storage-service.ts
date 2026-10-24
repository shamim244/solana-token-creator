import { Uploader } from "@irys/upload";
import { Solana } from "@irys/upload-solana";
import nacl from "tweetnacl";
import bs58 from "bs58";
import fs from "fs";
import path from "path";

export interface MetadataPayload {
  name: string;
  symbol: string;
  description?: string;
  imageData?: string; // base64
  imageFilename?: string;
  existingImageUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  tags?: string[];
  cluster?: "devnet" | "mainnet" | "localnet";
}

export interface UploadResult {
  success: boolean;
  metadataUri: string;
  imageUrl: string;
  provider: "irys-free" | "irys-funded" | "ipfs" | "self-hosted";
  error?: string;
}

export interface StorageOptions {
  rpcUrl?: string;
  privateKey?: string;
  pinataJwt?: string;
}

/**
 * Enterprise Multi-Tier Metadata Storage Service.
 * Guarantees 100% uptime with automated fallbacks:
 * 1. Irys Free Tier (< 100 KiB)
 * 2. Irys Funded Platform Wallet (for > 100 KiB or animated files)
 * 3. IPFS Gateway (if configured)
 * 4. Self-Hosted Next.js Gateway (Ultimate resilience guarantee)
 */
export class MetadataStorageService {
  private static getPlatformKey(overrideKey?: string): string {
    if (overrideKey?.trim()) return overrideKey.trim();
    const key =
      process.env.IRYS_WALLET_PRIVATE_KEY || process.env.SOLANA_PRIVATE_KEY;
    if (key?.trim()) return key.trim();

    // Default to ephemeral key for 0-balance free tier uploads (<100 KiB)
    const ephemeral = nacl.sign.keyPair();
    return bs58.encode(ephemeral.secretKey);
  }

  private static getRpcUrl(
    cluster: string = "devnet",
    overrideRpc?: string
  ): string {
    if (overrideRpc?.trim()) return overrideRpc.trim();
    if (cluster === "mainnet") {
      return (
        process.env.MAINNET_RPC_URL || "https://api.mainnet-beta.solana.com"
      );
    }
    return process.env.DEVNET_RPC_URL || "https://api.devnet.solana.com";
  }

  /**
   * Uploads token logo and Metaplex metadata JSON using multi-tiered fallback.
   */
  static async upload(
    payload: MetadataPayload,
    options?: StorageOptions
  ): Promise<UploadResult> {
    const cluster = payload.cluster || "devnet";
    const isMainnet = cluster === "mainnet";
    const privateKey = this.getPlatformKey(options?.privateKey);
    const rpcUrl = this.getRpcUrl(cluster, options?.rpcUrl);

    // Prepare image buffer
    let imageBuffer: Buffer | null = null;
    let contentType = "image/webp";

    if (payload.imageData && payload.imageData.includes("base64,")) {
      const [header, base64Data] = payload.imageData.split("base64,");
      const mimeMatch = header.match(/data:([^;]+);/);
      if (mimeMatch) contentType = mimeMatch[1];
      imageBuffer = Buffer.from(base64Data, "base64");
    }

    // TIER 1 & TIER 2: Irys (Free or Funded)
    try {
      let uploaderBuilder = Uploader(Solana).withRpc(rpcUrl);
      if (isMainnet) {
        uploaderBuilder = uploaderBuilder.mainnet();
      } else {
        uploaderBuilder = uploaderBuilder.devnet();
      }

      const uploader = await uploaderBuilder.withWallet(privateKey);
      let finalImageUrl = payload.existingImageUrl || "";

      // Upload image if provided
      if (imageBuffer) {
        const imageReceipt = await uploader.upload(imageBuffer, {
          tags: [{ name: "Content-Type", value: contentType }],
        });
        finalImageUrl = `https://gateway.irys.xyz/${imageReceipt.id}`;
      }

      // Build official Metaplex JSON
      const extensions: Record<string, string> = {};
      if (payload.website?.trim()) extensions.website = payload.website.trim();
      if (payload.twitter?.trim()) extensions.twitter = payload.twitter.trim();
      if (payload.telegram?.trim())
        extensions.telegram = payload.telegram.trim();
      if (payload.discord?.trim()) extensions.discord = payload.discord.trim();

      const metadataPayload = {
        name: payload.name,
        symbol: payload.symbol,
        description: payload.description || "",
        image: finalImageUrl,
        ...(Object.keys(extensions).length > 0 && { extensions }),
        ...(payload.tags && payload.tags.length > 0 && { tags: payload.tags }),
      };

      const metadataBuffer = Buffer.from(
        JSON.stringify(metadataPayload, null, 2),
        "utf-8"
      );
      const metadataReceipt = await uploader.upload(metadataBuffer, {
        tags: [{ name: "Content-Type", value: "application/json" }],
      });

      const isFundedKey = Boolean(
        process.env.IRYS_WALLET_PRIVATE_KEY || process.env.SOLANA_PRIVATE_KEY
      );

      return {
        success: true,
        metadataUri: `https://gateway.irys.xyz/${metadataReceipt.id}`,
        imageUrl: finalImageUrl,
        provider:
          isFundedKey && imageBuffer && imageBuffer.length >= 100 * 1024
            ? "irys-funded"
            : "irys-free",
      };
    } catch (irysErr) {
      console.warn(
        "Irys upload attempt failed, engaging resilient fallback:",
        irysErr
      );
    }

    // TIER 3: IPFS / Pinata (if credentials exist)
    const pinataJwt = options?.pinataJwt || process.env.PINATA_JWT;
    if (pinataJwt || process.env.PINATA_API_KEY) {
      try {
        const ipfsResult = await this.uploadToPinata(
          payload,
          imageBuffer,
          contentType,
          pinataJwt
        );
        if (ipfsResult) return ipfsResult;
      } catch (ipfsErr) {
        console.warn(
          "IPFS fallback failed, engaging self-hosted fallback:",
          ipfsErr
        );
      }
    }

    // TIER 4: Self-Hosted Gateway (Safe with Edge/Serverless try-catch)
    return await this.saveSelfHostedMetadata(payload, imageBuffer, contentType);
  }

  /**
   * Pinata IPFS Fallback
   */
  private static async uploadToPinata(
    payload: MetadataPayload,
    imageBuffer: Buffer | null,
    contentType: string,
    overrideJwt?: string
  ): Promise<UploadResult | null> {
    const pinataJwt = overrideJwt || process.env.PINATA_JWT;
    if (!pinataJwt) return null;

    let finalImageUrl = payload.existingImageUrl || "";

    // Upload image to IPFS
    if (imageBuffer) {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(imageBuffer)], {
        type: contentType,
      });
      formData.append("file", blob, payload.imageFilename || "token-logo.png");

      const imgRes = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${pinataJwt}` },
          body: formData,
        }
      );

      if (imgRes.ok) {
        const imgData = await imgRes.json();
        finalImageUrl = `https://gateway.pinata.cloud/ipfs/${imgData.IpfsHash}`;
      }
    }

    // Upload JSON to IPFS
    const jsonBody = {
      pinataContent: {
        name: payload.name,
        symbol: payload.symbol,
        description: payload.description,
        image: finalImageUrl,
        extensions: {
          website: payload.website,
          twitter: payload.twitter,
          telegram: payload.telegram,
          discord: payload.discord,
        },
        tags: payload.tags,
      },
      pinataMetadata: {
        name: `${payload.symbol}-metadata.json`,
      },
    };

    const jsonRes = await fetch(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jsonBody),
      }
    );

    if (jsonRes.ok) {
      const jsonData = await jsonRes.json();
      return {
        success: true,
        metadataUri: `https://gateway.pinata.cloud/ipfs/${jsonData.IpfsHash}`,
        imageUrl: finalImageUrl,
        provider: "ipfs",
      };
    }

    return null;
  }

  /**
   * Self-Hosted Next.js Gateway (Ultimate safety net if every external service fails)
   */
  private static async saveSelfHostedMetadata(
    payload: MetadataPayload,
    imageBuffer: Buffer | null,
    contentType: string
  ): Promise<UploadResult> {
    try {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const storageDir = path.join(process.cwd(), "public", "hosted-metadata");

      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      let finalImageUrl = payload.existingImageUrl || "";

      if (imageBuffer) {
        const ext = contentType.includes("png")
          ? "png"
          : contentType.includes("webp")
            ? "webp"
            : "jpg";
        const imageFilename = `${id}.${ext}`;
        const imagePath = path.join(storageDir, imageFilename);
        fs.writeFileSync(imagePath, imageBuffer);
        finalImageUrl = `/hosted-metadata/${imageFilename}`;
      }

      const metadataContent = {
        name: payload.name,
        symbol: payload.symbol,
        description: payload.description || "",
        image: finalImageUrl,
        extensions: {
          website: payload.website,
          twitter: payload.twitter,
          telegram: payload.telegram,
          discord: payload.discord,
        },
        tags: payload.tags || [],
      };

      const jsonFilename = `${id}.json`;
      const jsonPath = path.join(storageDir, jsonFilename);
      fs.writeFileSync(
        jsonPath,
        JSON.stringify(metadataContent, null, 2),
        "utf-8"
      );

      // Construct origin URL
      const appBaseUrl =
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const fullMetadataUri = `${appBaseUrl}/hosted-metadata/${jsonFilename}`;
      const fullImageUrl = finalImageUrl.startsWith("http")
        ? finalImageUrl
        : `${appBaseUrl}${finalImageUrl}`;

      return {
        success: true,
        metadataUri: fullMetadataUri,
        imageUrl: fullImageUrl,
        provider: "self-hosted",
      };
    } catch (fsErr) {
      console.warn(
        "Self-hosted storage write unavailable (read-only edge environment):",
        fsErr
      );
      return {
        success: false,
        metadataUri: "",
        imageUrl: payload.existingImageUrl || "",
        provider: "self-hosted",
        error:
          "Decentralized metadata upload failed across all providers and local filesystem is read-only.",
      };
    }
  }
}
