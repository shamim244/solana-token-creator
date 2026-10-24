import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  lamports,
  address,
  signTransactionMessageWithSigners,
  sendAndConfirmTransactionFactory,
  assertIsTransactionWithBlockhashLifetime,
  getSignatureFromTransaction,
  type Address,
  type TransactionSigner,
  AccountRole,
  type Instruction,
} from "@solana/kit";
import {
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  getSetAuthorityInstruction,
  getBurnCheckedInstruction,
  AuthorityType,
} from "@solana-program/token";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  getMetadataAccountDataSerializer,
  getUpdateMetadataAccountV2InstructionDataSerializer,
} from "@metaplex-foundation/mpl-token-metadata";
import type { AppClient, ClusterMoniker } from "./solana-client";
import {
  getMetadataPda,
  METAPLEX_PROGRAM_ID,
  calculateSupplyBaseUnits,
} from "./solana-token-creator";

export interface TokenInspectionResult {
  mintAddress: Address;
  decimals: number;
  supply: string;
  supplyRaw: bigint;
  isInitialized: boolean;
  mintAuthority: Address | null;
  freezeAuthority: Address | null;
  programId: string;
  // Metaplex On-Chain Metadata
  hasMetadata: boolean;
  name: string;
  symbol: string;
  uri: string;
  updateAuthority: Address | null;
  isMutable: boolean;
  // Off-Chain Metadata (from URI)
  image?: string;
  description?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  // Connected Wallet Context
  walletBalance?: string;
  walletBalanceRaw?: bigint;
  walletAta?: Address;
  isWalletMintAuthority?: boolean;
  isWalletFreezeAuthority?: boolean;
  isWalletUpdateAuthority?: boolean;
}

export interface WalletTokenItem {
  mint: Address;
  balance: string;
  balanceRaw: bigint;
  decimals: number;
  ata: Address;
}

/**
 * Strips zero-padding and trailing null bytes from Metaplex string fields.
 */
function cleanMetaplexString(val: string): string {
  return val.replace(/\0/g, "").trim();
}

/**
 * Comprehensive on-chain token inspector.
 * Fetches SPL mint parameters, Metaplex metadata, off-chain JSON, and wallet balances.
 */
export async function inspectToken(
  client: AppClient,
  mintInput: string,
  walletAddress?: Address
): Promise<TokenInspectionResult> {
  const cleanMint = mintInput.trim();
  let mintAddress: Address;
  try {
    mintAddress = address(cleanMint);
  } catch {
    throw new Error("Invalid Solana mint address format.");
  }

  // 1. Fetch Mint Account Info
  const accountInfo = await client.rpc
    .getAccountInfo(mintAddress, { encoding: "jsonParsed" })
    .send();

  if (!accountInfo.value) {
    throw new Error(`Token mint account not found on current cluster.`);
  }

  const parsedData = accountInfo.value.data as {
    parsed?: {
      info?: {
        decimals: number;
        freezeAuthority: string | null;
        isInitialized: boolean;
        mintAuthority: string | null;
        supply: string;
      };
      type?: string;
    };
    program?: string;
  };

  const info = parsedData.parsed?.info;
  if (!info) {
    throw new Error(
      "Account is not an initialized SPL Mint or Token-2022 account."
    );
  }

  const decimals = info.decimals;
  const supply = info.supply;
  const supplyRaw = BigInt(supply);
  const mintAuthority = info.mintAuthority ? address(info.mintAuthority) : null;
  const freezeAuthority = info.freezeAuthority
    ? address(info.freezeAuthority)
    : null;
  const programId = parsedData.program || "spl-token";

  // 2. Fetch Metaplex Metadata
  let hasMetadata = false;
  let name = "";
  let symbol = "";
  let uri = "";
  let updateAuthority: Address | null = null;
  let isMutable = true;
  let image: string | undefined;
  let description: string | undefined;
  let website: string | undefined;
  let twitter: string | undefined;
  let telegram: string | undefined;
  let discord: string | undefined;

  try {
    const metadataPda = await getMetadataPda(mintAddress);
    const metaInfo = await client.rpc
      .getAccountInfo(metadataPda, { encoding: "base64" })
      .send();

    if (metaInfo.value && Array.isArray(metaInfo.value.data)) {
      const base64Data = metaInfo.value.data[0];
      const binaryBytes = Uint8Array.from(atob(base64Data), (c) =>
        c.charCodeAt(0)
      );
      const [deserialized] =
        getMetadataAccountDataSerializer().deserialize(binaryBytes);

      hasMetadata = true;
      name = cleanMetaplexString(deserialized.name);
      symbol = cleanMetaplexString(deserialized.symbol);
      uri = cleanMetaplexString(deserialized.uri);
      updateAuthority = address(deserialized.updateAuthority.toString());
      isMutable = deserialized.isMutable;

      // 3. Fetch Off-Chain JSON if URI is valid http/https
      if (uri.startsWith("http://") || uri.startsWith("https://")) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const metaRes = await fetch(uri, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (metaRes.ok) {
            const metaJson = (await metaRes.json()) as {
              image?: string;
              description?: string;
              extensions?: {
                website?: string;
                twitter?: string;
                telegram?: string;
                discord?: string;
              };
              website?: string;
              twitter?: string;
              telegram?: string;
              discord?: string;
            };

            image = metaJson.image;
            description = metaJson.description;
            website = metaJson.extensions?.website || metaJson.website;
            twitter = metaJson.extensions?.twitter || metaJson.twitter;
            telegram = metaJson.extensions?.telegram || metaJson.telegram;
            discord = metaJson.extensions?.discord || metaJson.discord;
          }
        } catch {
          // Off-chain metadata fetch failure is non-fatal
        }
      }
    }
  } catch {
    // No Metaplex metadata on-chain
  }

  // 4. Check Wallet Balance & Authorities
  let walletBalance: string | undefined;
  let walletBalanceRaw: bigint | undefined;
  let walletAta: Address | undefined;

  if (walletAddress) {
    try {
      const [ata] = await findAssociatedTokenPda({
        mint: mintAddress,
        owner: walletAddress,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      });
      walletAta = ata;

      const ataInfo = await client.rpc
        .getAccountInfo(ata, { encoding: "jsonParsed" })
        .send();

      if (ataInfo.value) {
        const ataParsed = ataInfo.value.data as {
          parsed?: {
            info?: {
              tokenAmount?: {
                amount: string;
                uiAmountString: string;
              };
            };
          };
        };
        const tokenAmount = ataParsed.parsed?.info?.tokenAmount;
        if (tokenAmount) {
          walletBalanceRaw = BigInt(tokenAmount.amount);
          walletBalance = tokenAmount.uiAmountString;
        } else {
          walletBalance = "0";
          walletBalanceRaw = 0n;
        }
      } else {
        walletBalance = "0";
        walletBalanceRaw = 0n;
      }
    } catch {
      walletBalance = "0";
      walletBalanceRaw = 0n;
    }
  }

  const isWalletMintAuthority = Boolean(
    walletAddress && mintAuthority && walletAddress === mintAuthority
  );
  const isWalletFreezeAuthority = Boolean(
    walletAddress && freezeAuthority && walletAddress === freezeAuthority
  );
  const isWalletUpdateAuthority = Boolean(
    walletAddress && updateAuthority && walletAddress === updateAuthority
  );

  return {
    mintAddress,
    decimals,
    supply,
    supplyRaw,
    isInitialized: info.isInitialized,
    mintAuthority,
    freezeAuthority,
    programId,
    hasMetadata,
    name: name || "Unknown Token",
    symbol: symbol || "UNKNOWN",
    uri,
    updateAuthority,
    isMutable,
    image,
    description,
    website,
    twitter,
    telegram,
    discord,
    walletBalance,
    walletBalanceRaw,
    walletAta,
    isWalletMintAuthority,
    isWalletFreezeAuthority,
    isWalletUpdateAuthority,
  };
}

/**
 * Fetches all token holdings owned by the connected wallet on the active cluster.
 */
export async function fetchWalletTokens(
  client: AppClient,
  walletAddress: Address
): Promise<WalletTokenItem[]> {
  try {
    const res = await client.rpc
      .getTokenAccountsByOwner(
        walletAddress,
        { programId: TOKEN_PROGRAM_ADDRESS },
        { encoding: "jsonParsed" }
      )
      .send();

    const items: WalletTokenItem[] = [];

    for (const item of res.value) {
      const parsed = item.account.data as {
        parsed?: {
          info?: {
            mint: string;
            tokenAmount?: {
              amount: string;
              decimals: number;
              uiAmountString: string;
            };
          };
        };
      };

      const info = parsed.parsed?.info;
      if (!info || !info.tokenAmount) continue;

      const balanceRaw = BigInt(info.tokenAmount.amount);
      if (balanceRaw > 0n) {
        items.push({
          mint: address(info.mint),
          balance: info.tokenAmount.uiAmountString,
          balanceRaw,
          decimals: info.tokenAmount.decimals,
          ata: address(item.pubkey),
        });
      }
    }

    return items;
  } catch (error) {
    console.warn("Failed to fetch wallet token accounts:", error);
    return [];
  }
}

export interface RevokeAuthorityParams {
  mintAddress: Address;
  authorityType: "mint" | "freeze" | "update";
  payer: TransactionSigner;
  cluster: ClusterMoniker;
  treasuryWallet?: string;
  platformFeeSol?: number;
}

/**
 * Permanently revokes Mint, Freeze, or Metaplex Update authority on an existing token.
 */
export async function revokeAuthorityOnChain(
  client: AppClient,
  params: RevokeAuthorityParams
): Promise<{ txSignature: string }> {
  const { payer, mintAddress, authorityType } = params;
  const instructions: Instruction[] = [];

  if (authorityType === "freeze") {
    instructions.push(
      getSetAuthorityInstruction({
        owned: mintAddress,
        owner: payer,
        authorityType: AuthorityType.FreezeAccount,
        newAuthority: null,
      })
    );
  } else if (authorityType === "mint") {
    instructions.push(
      getSetAuthorityInstruction({
        owned: mintAddress,
        owner: payer,
        authorityType: AuthorityType.MintTokens,
        newAuthority: null,
      })
    );
  } else if (authorityType === "update") {
    const metadataPda = await getMetadataPda(mintAddress);
    const updateSerializer =
      getUpdateMetadataAccountV2InstructionDataSerializer();

    const serializedData = updateSerializer.serialize({
      data: null,
      newUpdateAuthority: null,
      primarySaleHappened: null,
      isMutable: false,
    });

    instructions.push({
      programAddress: METAPLEX_PROGRAM_ID,
      accounts: [
        { address: metadataPda, role: AccountRole.WRITABLE },
        { address: payer.address, role: AccountRole.READONLY_SIGNER },
      ],
      data: serializedData,
    });
  }

  // Add platform service fee if configured
  if (params.platformFeeSol && params.platformFeeSol > 0) {
    const feeLamports = BigInt(Math.round(params.platformFeeSol * 1e9));
    const destination = address(
      params.treasuryWallet || "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU"
    );
    instructions.push(
      getTransferSolInstruction({
        source: payer,
        destination,
        amount: lamports(feeLamports),
      })
    );
  }

  // Compose & sign transaction
  const { value: latestBlockhash } = await client.rpc
    .getLatestBlockhash({ commitment: "confirmed" })
    .send();

  const draftMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m)
  );

  const signedTx = await signTransactionMessageWithSigners(draftMessage);
  assertIsTransactionWithBlockhashLifetime(signedTx);

  const signatureBytes = getSignatureFromTransaction(signedTx);
  const txSignature = signatureBytes.toString();

  const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc: client.rpc,
    rpcSubscriptions: client.rpcSubscriptions,
  });

  await sendAndConfirm(signedTx, { commitment: "confirmed" });

  return { txSignature };
}

export interface BurnTokenParams {
  mintAddress: Address;
  amount: string;
  decimals: number;
  payer: TransactionSigner;
  cluster: ClusterMoniker;
  treasuryWallet?: string;
  platformFeeSol?: number;
}

/**
 * Permanently burns tokens from the creator's wallet ATA.
 */
export async function burnTokenOnChain(
  client: AppClient,
  params: BurnTokenParams
): Promise<{ txSignature: string }> {
  const { payer, mintAddress, amount, decimals } = params;
  const rawAmount = calculateSupplyBaseUnits(amount, decimals);

  const [ata] = await findAssociatedTokenPda({
    mint: mintAddress,
    owner: payer.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const instructions: Instruction[] = [
    getBurnCheckedInstruction({
      account: ata,
      mint: mintAddress,
      authority: payer,
      amount: rawAmount,
      decimals,
    }),
  ];

  // Optional platform fee for burn service
  if (params.platformFeeSol && params.platformFeeSol > 0) {
    const feeLamports = BigInt(Math.round(params.platformFeeSol * 1e9));
    const destination = address(
      params.treasuryWallet || "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU"
    );
    instructions.push(
      getTransferSolInstruction({
        source: payer,
        destination,
        amount: lamports(feeLamports),
      })
    );
  }

  const { value: latestBlockhash } = await client.rpc
    .getLatestBlockhash({ commitment: "confirmed" })
    .send();

  const draftMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m)
  );

  const signedTx = await signTransactionMessageWithSigners(draftMessage);
  assertIsTransactionWithBlockhashLifetime(signedTx);

  const signatureBytes = getSignatureFromTransaction(signedTx);
  const txSignature = signatureBytes.toString();

  const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc: client.rpc,
    rpcSubscriptions: client.rpcSubscriptions,
  });

  await sendAndConfirm(signedTx, { commitment: "confirmed" });

  return { txSignature };
}

export interface UpdateMetadataParams {
  mintAddress: Address;
  name: string;
  symbol: string;
  uri: string;
  payer: TransactionSigner;
  cluster: ClusterMoniker;
  treasuryWallet?: string;
  platformFeeSol?: number;
}

/**
 * Updates Metaplex token metadata on-chain.
 */
export async function updateMetadataOnChain(
  client: AppClient,
  params: UpdateMetadataParams
): Promise<{ txSignature: string }> {
  const { payer, mintAddress, name, symbol, uri } = params;
  const metadataPda = await getMetadataPda(mintAddress);
  const updateSerializer =
    getUpdateMetadataAccountV2InstructionDataSerializer();

  const serializedData = updateSerializer.serialize({
    data: {
      name,
      symbol,
      uri,
      sellerFeeBasisPoints: 0,
      creators: null,
      collection: null,
      uses: null,
    },
    newUpdateAuthority: null,
    primarySaleHappened: null,
    isMutable: true,
  });

  const instructions: Instruction[] = [
    {
      programAddress: METAPLEX_PROGRAM_ID,
      accounts: [
        { address: metadataPda, role: AccountRole.WRITABLE },
        { address: payer.address, role: AccountRole.READONLY_SIGNER },
      ],
      data: serializedData,
    },
  ];

  if (params.platformFeeSol && params.platformFeeSol > 0) {
    const feeLamports = BigInt(Math.round(params.platformFeeSol * 1e9));
    const destination = address(
      params.treasuryWallet || "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU"
    );
    instructions.push(
      getTransferSolInstruction({
        source: payer,
        destination,
        amount: lamports(feeLamports),
      })
    );
  }

  const { value: latestBlockhash } = await client.rpc
    .getLatestBlockhash({ commitment: "confirmed" })
    .send();

  const draftMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m)
  );

  const signedTx = await signTransactionMessageWithSigners(draftMessage);
  assertIsTransactionWithBlockhashLifetime(signedTx);

  const signatureBytes = getSignatureFromTransaction(signedTx);
  const txSignature = signatureBytes.toString();

  const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc: client.rpc,
    rpcSubscriptions: client.rpcSubscriptions,
  });

  await sendAndConfirm(signedTx, { commitment: "confirmed" });

  return { txSignature };
}
