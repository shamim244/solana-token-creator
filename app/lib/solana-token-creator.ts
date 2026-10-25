import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  generateKeyPairSigner,
  lamports,
  address,
  getAddressEncoder,
  getProgramDerivedAddress,
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
  getInitializeMintInstruction,
  getMintToInstruction,
  getMintSize,
  findAssociatedTokenPda,
  getCreateAssociatedTokenInstruction,
  getSetAuthorityInstruction,
  AuthorityType,
} from "@solana-program/token";
import {
  getCreateAccountInstruction,
  getTransferSolInstruction,
} from "@solana-program/system";
import { getCreateMetadataAccountV3InstructionDataSerializer } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey } from "@metaplex-foundation/umi";
import type { AppClient, ClusterMoniker } from "./solana-client";
import { parseTransactionError } from "./errors";

export const METAPLEX_PROGRAM_ID = address(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const PLATFORM_TREASURY = address(
  "54Xn6d6X4wHrkZ9eHnC8F2v56yZ8K5j2Q8s7J3k4L5m6"
);

export interface CreateTokenParams {
  name: string;
  symbol: string;
  decimals: number;
  supply: string;
  description?: string;
  imageUrl?: string;
  metadataUri?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  tags?: string[];
  revokeFreeze: boolean;
  revokeMint: boolean;
  revokeUpdate: boolean;
  treasuryWallet?: string;
  baseFeeSol?: number;
  revokeFreezeFeeSol?: number;
  revokeMintFeeSol?: number;
  revokeUpdateFeeSol?: number;
  absorbNetworkRent?: boolean;
  discountPercent?: number;
}

export interface CreateTokenResult {
  mintAddress: Address;
  txSignature: string;
}

/**
 * Calculates raw base units from human-readable supply string and decimals.
 */
export function calculateSupplyBaseUnits(
  supplyStr: string,
  decimals: number
): bigint {
  const cleanSupply = supplyStr.replace(/,/g, "").trim();
  const [whole, fraction = ""] = cleanSupply.split(".");
  const baseUnitsPerToken = 10n ** BigInt(decimals);
  const normalizedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return (
    BigInt(whole || "0") * baseUnitsPerToken + BigInt(normalizedFraction || "0")
  );
}

/**
 * Derives the Metaplex Metadata PDA for a given Mint address.
 */
export async function getMetadataPda(mint: Address): Promise<Address> {
  const encoder = getAddressEncoder();
  const [pda] = await getProgramDerivedAddress({
    programAddress: METAPLEX_PROGRAM_ID,
    seeds: [
      new TextEncoder().encode("metadata"),
      encoder.encode(METAPLEX_PROGRAM_ID),
      encoder.encode(mint),
    ],
  });
  return pda;
}

/**
 * Creates, mints, attaches metadata, and configures authorities for an SPL Token atomically.
 */
export async function createAndDeployToken(
  client: AppClient,
  payer: TransactionSigner,
  params: CreateTokenParams,
  cluster: ClusterMoniker
): Promise<CreateTokenResult> {
  const mintKeypair = await generateKeyPairSigner();
  const rpc = client.rpc;
  const isLocalnet = cluster === "localnet";

  // 1. Fetch rent exemption and blockhash in parallel
  const [mintRent, { value: latestBlockhash }] = await Promise.all([
    rpc.getMinimumBalanceForRentExemption(BigInt(getMintSize())).send(),
    rpc.getLatestBlockhash().send(),
  ]);

  // 2. Derive ATA for the creator
  const [ata] = await findAssociatedTokenPda({
    owner: payer.address,
    mint: mintKeypair.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  // 3. Calculate supply
  const rawSupply = calculateSupplyBaseUnits(params.supply, params.decimals);

  // 4. Build Atomic Instruction List
  const instructions: Instruction[] = [];

  // Instruction A: Allocate Mint Account
  instructions.push(
    getCreateAccountInstruction({
      payer,
      newAccount: mintKeypair,
      lamports: lamports(mintRent),
      space: getMintSize(),
      programAddress: TOKEN_PROGRAM_ADDRESS,
    })
  );

  // Instruction B: Initialize Mint
  instructions.push(
    getInitializeMintInstruction({
      mint: mintKeypair.address,
      decimals: params.decimals,
      mintAuthority: payer.address,
      freezeAuthority: params.revokeFreeze ? payer.address : payer.address,
    })
  );

  // Instruction C: Metaplex Token Metadata V3 (on non-localnet or if supported)
  if (!isLocalnet) {
    try {
      const metadataPda = await getMetadataPda(mintKeypair.address);
      const metadataSerializer =
        getCreateMetadataAccountV3InstructionDataSerializer();

      // Prefer decentralized metadata JSON URI over raw image URL
      const metadataUri = params.metadataUri || params.imageUrl || "";

      const serializedData = metadataSerializer.serialize({
        data: {
          name: params.name,
          symbol: params.symbol,
          uri: metadataUri,
          sellerFeeBasisPoints: 0,
          creators: [
            {
              address: publicKey(payer.address),
              verified: true,
              share: 100,
            },
          ],
          collection: null,
          uses: null,
        },
        isMutable: !params.revokeUpdate,
        collectionDetails: null,
      });

      const metadataIx: Instruction = {
        programAddress: METAPLEX_PROGRAM_ID,
        accounts: [
          { address: metadataPda, role: AccountRole.WRITABLE },
          { address: mintKeypair.address, role: AccountRole.READONLY },
          { address: payer.address, role: AccountRole.READONLY_SIGNER },
          { address: payer.address, role: AccountRole.WRITABLE_SIGNER },
          { address: payer.address, role: AccountRole.READONLY_SIGNER },
          {
            address: address("11111111111111111111111111111111"),
            role: AccountRole.READONLY,
          },
          {
            address: address("SysvarRent111111111111111111111111111111111"),
            role: AccountRole.READONLY,
          },
        ],
        data: serializedData,
      };

      instructions.push(metadataIx);
    } catch (err) {
      console.warn(
        "Metaplex metadata instruction building failed, proceeding with SPL Token creation:",
        err
      );
    }
  }

  // Instruction D: Create Creator's Associated Token Account
  instructions.push(
    getCreateAssociatedTokenInstruction({
      payer,
      ata,
      owner: payer.address,
      mint: mintKeypair.address,
    })
  );

  // Instruction E: Mint 100% of Initial Supply to Creator's ATA
  instructions.push(
    getMintToInstruction({
      mint: mintKeypair.address,
      token: ata,
      mintAuthority: payer,
      amount: rawSupply,
    })
  );

  // Instruction F: Revoke Freeze Authority (Essential for Raydium / DEX trust)
  if (params.revokeFreeze) {
    instructions.push(
      getSetAuthorityInstruction({
        owned: mintKeypair.address,
        owner: payer,
        authorityType: AuthorityType.FreezeAccount,
        newAuthority: null,
      })
    );
  }

  // Instruction G: Revoke Mint Authority (Guarantees Capped Supply)
  if (params.revokeMint) {
    instructions.push(
      getSetAuthorityInstruction({
        owned: mintKeypair.address,
        owner: payer,
        authorityType: AuthorityType.MintTokens,
        newAuthority: null,
      })
    );
  }

  // Instruction H: Platform Service Fee (All-Inclusive Model with Dynamic Configuration)
  // Devnet & Mainnet fees are dynamically configured via the Admin Panel
  if (cluster === "mainnet" || cluster === "devnet") {
    const defaultBase = cluster === "mainnet" ? 0.15 : 0.0;
    const baseFee = params.baseFeeSol ?? defaultBase;
    const freezeFee = params.revokeFreezeFeeSol ?? 0.1;
    const mintFee = params.revokeMintFeeSol ?? 0.1;
    const updateFee = params.revokeUpdateFeeSol ?? 0.1;
    const shouldAbsorb = params.absorbNetworkRent ?? true;
    const destinationTreasury = address(
      params.treasuryWallet || PLATFORM_TREASURY
    );

    let allInclusiveTotalSol = baseFee;
    if (params.revokeFreeze) allInclusiveTotalSol += freezeFee;
    if (params.revokeMint) allInclusiveTotalSol += mintFee;
    if (params.revokeUpdate) allInclusiveTotalSol += updateFee;

    // Apply partner / promotional discount if applicable
    if (params.discountPercent && params.discountPercent > 0) {
      const discountMultiplier = Math.max(
        0,
        (100 - params.discountPercent) / 100
      );
      allInclusiveTotalSol =
        Math.round(allInclusiveTotalSol * discountMultiplier * 1000) / 1000;
    }

    const allInclusiveLamports = BigInt(Math.round(allInclusiveTotalSol * 1e9));

    // Mandatory on-chain account rent:
    // Mint: mintRent (~1,461,600 lamports)
    // ATA: 2,039,280 lamports (165 bytes)
    // Metaplex V3 Metadata: 5,616,720 lamports (679 bytes)
    const ataRentLamports = 2039280n;
    const metadataRentLamports = isLocalnet ? 0n : 5616720n;
    const totalNetworkRentLamports =
      mintRent + ataRentLamports + metadataRentLamports;

    // Absorb network rent if configured, otherwise full transfer
    const platformTransferLamports = shouldAbsorb
      ? allInclusiveLamports > totalNetworkRentLamports
        ? allInclusiveLamports - totalNetworkRentLamports
        : 0n
      : allInclusiveLamports;

    if (platformTransferLamports > 0n) {
      instructions.push(
        getTransferSolInstruction({
          source: payer,
          destination: destinationTreasury,
          amount: lamports(platformTransferLamports),
        })
      );
    }
  }

  // 5. Compose Atomic Transaction Message (Version 0)
  const draftMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstructions(instructions, m)
  );

  // 6. Sign with both payer and newly generated mint keypair
  const signedTx = await signTransactionMessageWithSigners(draftMessage);
  assertIsTransactionWithBlockhashLifetime(signedTx);

  // Extract signature string
  const signatureBytes = getSignatureFromTransaction(signedTx);
  const txSignature = signatureBytes.toString();

  // 7. Send & Confirm atomically
  const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc: client.rpc,
    rpcSubscriptions: client.rpcSubscriptions,
  });

  try {
    await sendAndConfirm(signedTx, {
      commitment: "confirmed",
    });
  } catch (err: unknown) {
    const parsed = parseTransactionError(err);
    const friendlyError = new Error(parsed);
    (friendlyError as { cause?: unknown }).cause = err;
    throw friendlyError;
  }

  return {
    mintAddress: mintKeypair.address,
    txSignature,
  };
}
