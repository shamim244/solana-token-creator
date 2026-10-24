import { PublicKey } from "@solana/web3.js";
import sizeOf from "image-size";

const METAPLEX_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const tokens = [
  {
    symbol: "BONK",
    name: "Bonk",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    mint: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
  },
  {
    symbol: "POPCAT",
    name: "Popcat",
    mint: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
  },
  {
    symbol: "BOME",
    name: "Book of Meme",
    mint: "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",
  },
  {
    symbol: "MEW",
    name: "cat in a dogs world",
    mint: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
  },
  {
    symbol: "FARTCOIN",
    name: "Fartcoin",
    mint: "9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump",
  },
  {
    symbol: "MOODENG",
    name: "Moo Deng",
    mint: "ED5nyyWEzpPPiWimP8vYm7sD7TD3LAt3Q3gRTWHzPJBY",
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  },
  {
    symbol: "PYTH",
    name: "Pyth Network",
    mint: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
  },
  {
    symbol: "PENGU",
    name: "Pudgy Penguins",
    mint: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
  },
];

function getMetadataPDA(mint: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METAPLEX_PROGRAM_ID.toBuffer(),
      new PublicKey(mint).toBuffer(),
    ],
    METAPLEX_PROGRAM_ID
  );
  return pda;
}

function resolveUrl(url: string): string[] {
  const urls: string[] = [];
  if (url.startsWith("ipfs://")) {
    const cid = url.replace("ipfs://", "");
    urls.push(`https://gateway.pinata.cloud/ipfs/${cid}`);
    urls.push(`https://cloudflare-ipfs.com/ipfs/${cid}`);
    urls.push(`https://ipfs.io/ipfs/${cid}`);
  } else if (url.includes("/ipfs/")) {
    const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
    if (match) {
      const cid = match[1];
      urls.push(`https://gateway.pinata.cloud/ipfs/${cid}`);
      urls.push(`https://cloudflare-ipfs.com/ipfs/${cid}`);
      urls.push(`https://ipfs.io/ipfs/${cid}`);
    }
    urls.push(url);
  } else if (url.includes(".ipfs.nftstorage.link")) {
    const match = url.match(/https:\/\/([^.]+)\.ipfs\.nftstorage\.link(.*)/);
    if (match) {
      const cid = match[1];
      const path = match[2] || "";
      urls.push(`https://gateway.pinata.cloud/ipfs/${cid}${path}`);
      urls.push(`https://cloudflare-ipfs.com/ipfs/${cid}${path}`);
      urls.push(`https://ipfs.io/ipfs/${cid}${path}`);
    }
  } else if (url.startsWith("https://arweave.net/")) {
    urls.push(url);
    urls.push(url.replace("https://arweave.net/", "https://arweave.dev/"));
  } else {
    urls.push(url);
  }
  return urls;
}

async function fetchJsonWithGateways(
  url: string
): Promise<{ data: any; finalUrl: string } | null> {
  const candidateUrls = resolveUrl(url);
  for (const u of candidateUrls) {
    try {
      const res = await fetch(u, {
        redirect: "follow",
        signal: AbortSignal.timeout(8000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });
      if (res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          return { data: json, finalUrl: u };
        } catch (e) {}
      }
    } catch (e) {}
  }
  return null;
}

async function fetchBufferWithGateways(
  url: string
): Promise<{ buffer: Buffer; finalUrl: string } | null> {
  const candidateUrls = resolveUrl(url);
  for (const u of candidateUrls) {
    try {
      const res = await fetch(u, {
        redirect: "follow",
        signal: AbortSignal.timeout(10000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
      });
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return { buffer: Buffer.from(arrayBuf), finalUrl: u };
      }
    } catch (e) {}
  }
  return null;
}

async function fetchOnChainMetadata(
  mint: string
): Promise<{ name: string; symbol: string; uri: string; pda: string } | null> {
  const pda = getMetadataPDA(mint);
  const rpcUrls = [
    "https://api.mainnet-beta.solana.com",
    "https://rpc.ankr.com/solana",
  ];
  for (const rpcUrl of rpcUrls) {
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getAccountInfo",
          params: [pda.toBase58(), { encoding: "base64" }],
        }),
        signal: AbortSignal.timeout(6000),
      });
      const json = await res.json();
      if (!json?.result?.value?.data?.[0]) continue;
      const buf = Buffer.from(json.result.value.data[0], "base64");

      let offset = 1 + 32 + 32;
      const nameLen = buf.readUInt32LE(offset);
      offset += 4;
      const name = buf
        .toString("utf8", offset, offset + nameLen)
        .replace(/\0/g, "")
        .trim();
      offset += nameLen;

      const symLen = buf.readUInt32LE(offset);
      offset += 4;
      const symbol = buf
        .toString("utf8", offset, offset + symLen)
        .replace(/\0/g, "")
        .trim();
      offset += symLen;

      const uriLen = buf.readUInt32LE(offset);
      offset += 4;
      const uri = buf
        .toString("utf8", offset, offset + uriLen)
        .replace(/\0/g, "")
        .trim();

      return { name, symbol, uri, pda: pda.toBase58() };
    } catch (e) {}
  }
  return null;
}

async function run() {
  console.log(
    "=== STEP-BY-STEP: TOKEN MINT -> METAPLEX PDA -> METADATA.JSON -> ORIGINAL IMAGE ===\n"
  );
  const tableData: any[] = [];

  for (const t of tokens) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Token: ${t.symbol} (${t.name})`);
    console.log(`Mint Address: ${t.mint}`);

    const onChain = await fetchOnChainMetadata(t.mint);
    if (!onChain) {
      console.log(`  [!] Could not fetch on-chain metadata PDA`);
      continue;
    }

    console.log(`  Metadata PDA: ${onChain.pda}`);
    console.log(`  On-chain Metadata URI: ${onChain.uri}`);

    const metaResult = await fetchJsonWithGateways(onChain.uri);
    if (!metaResult) {
      console.log(`  [!] Could not fetch metadata.json from ${onChain.uri}`);
      continue;
    }

    const metadataJson = metaResult.data;
    const originalImageUrl = metadataJson.image;
    console.log(`  Original Image URL: ${originalImageUrl}`);

    if (!originalImageUrl) {
      console.log(`  [!] No "image" field found in metadata.json`);
      continue;
    }

    const imgResult = await fetchBufferWithGateways(originalImageUrl);
    if (!imgResult) {
      console.log(`  [!] Could not fetch image buffer`);
      continue;
    }

    let dimensions = "Unknown";
    let format = "Unknown";
    try {
      const size = sizeOf(imgResult.buffer);
      dimensions = `${size.width} × ${size.height} px`;
      format = (size.type || "unknown").toUpperCase();
    } catch (e) {
      if (imgResult.buffer.toString("utf8", 0, 50).includes("<svg")) {
        dimensions = "1000 × 1000 px (Vector)";
        format = "SVG";
      }
    }

    const fileSizeBytes = imgResult.buffer.length;
    const fileSizeKB = (fileSizeBytes / 1024).toFixed(1) + " KB";
    console.log(`  [+] Original Format: ${format}`);
    console.log(`  [+] Original Dimensions: ${dimensions}`);
    console.log(
      `  [+] Original File Size: ${fileSizeKB} (${fileSizeBytes} bytes)`
    );

    tableData.push({
      Symbol: t.symbol,
      Name: t.name,
      MintAddress: t.mint,
      MetadataPDA: onChain.pda,
      MetadataURI: onChain.uri,
      OriginalImageURL: originalImageUrl,
      Format: format,
      PixelDimensions: dimensions,
      FileSizeBytes: fileSizeBytes,
      FileSizeKB: fileSizeKB,
    });
  }

  console.log(
    "\n\n========================= SUMMARY TABLE ========================="
  );
  console.table(
    tableData.map((d) => ({
      Token: d.Symbol,
      Name: d.Name,
      Format: d.Format,
      Dimensions: d.PixelDimensions,
      FileSize: d.FileSizeKB,
      OriginalImageUrl:
        d.OriginalImageURL.length > 45
          ? d.OriginalImageURL.substring(0, 42) + "..."
          : d.OriginalImageURL,
    }))
  );

  console.log(
    "\n========================= COMPLETE JSON OUTPUT ========================="
  );
  console.log(JSON.stringify(tableData, null, 2));
}

run();
