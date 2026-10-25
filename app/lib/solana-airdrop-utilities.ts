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
  type Instruction,
} from "@solana/kit";
import {
  TOKEN_PROGRAM_ADDRESS,
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
} from "@solana-program/token";
import { getTransferSolInstruction } from "@solana-program/system";
import type { AppClient, ClusterMoniker } from "./solana-client";
import { calculateSupplyBaseUnits } from "./solana-token-creator";

export const SOL_AIRDROP_BATCH_SIZE = 15;
export const SPL_AIRDROP_BATCH_SIZE = 8;

export interface RecipientEntry {
  address: string;
  amount: string;
  valid: boolean;
  error?: string;
}

export interface ParseResult {
  entries: RecipientEntry[];
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  totalAmount: number;
  hasDuplicates: boolean;
}

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/**
 * Validates whether a given string is a valid Solana public key address.
 */
export function isValidSolanaAddress(addr: string): boolean {
  if (!addr || addr.length < 32 || addr.length > 44) return false;
  return BASE58_REGEX.test(addr);
}

/**
 * Parses raw CSV or pasted text of recipient lines into structured RecipientEntries.
 * Supports: `address,amount`, `address amount`, `address\tamount`.
 */
export function parseRecipientsText(
  rawText: string,
  deduplicate = false
): ParseResult {
  const lines = rawText.split(/\r?\n/);
  const rawEntries: RecipientEntry[] = [];
  const seenAddresses = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith("#") || rawLine.startsWith("//")) {
      continue;
    }

    // Split on comma, tab, or space
    const parts = rawLine.split(/[,\t ]+/).filter(Boolean);
    if (parts.length === 0) continue;

    const candidateAddr = parts[0]?.trim();
    const candidateAmount = parts[1]?.trim() || "0";

    const isAddrValid = isValidSolanaAddress(candidateAddr);
    const amountNum = parseFloat(candidateAmount);
    const isAmountValid = !isNaN(amountNum) && amountNum > 0;

    let error: string | undefined;
    if (!isAddrValid) {
      error = "Invalid Solana address format";
    } else if (!isAmountValid) {
      error = "Amount must be a positive number";
    }

    const isValid = isAddrValid && isAmountValid;

    if (isAddrValid) {
      seenAddresses.set(
        candidateAddr,
        (seenAddresses.get(candidateAddr) || 0) + 1
      );
    }

    rawEntries.push({
      address: candidateAddr,
      amount: candidateAmount,
      valid: isValid,
      error,
    });
  }

  let finalEntries: RecipientEntry[] = rawEntries;
  let duplicateCount = 0;

  seenAddresses.forEach((count) => {
    if (count > 1) duplicateCount += count - 1;
  });

  if (deduplicate && duplicateCount > 0) {
    const aggregated = new Map<string, RecipientEntry>();

    for (const item of rawEntries) {
      if (!item.valid) {
        aggregated.set(`invalid_${Math.random()}`, item);
        continue;
      }

      if (aggregated.has(item.address)) {
        const existing = aggregated.get(item.address)!;
        const newTotal = (
          parseFloat(existing.amount) + parseFloat(item.amount)
        ).toString();
        aggregated.set(item.address, {
          ...existing,
          amount: newTotal,
        });
      } else {
        aggregated.set(item.address, { ...item });
      }
    }

    finalEntries = Array.from(aggregated.values());
  }

  let validCount = 0;
  let invalidCount = 0;
  let totalAmount = 0;

  for (const item of finalEntries) {
    if (item.valid) {
      validCount++;
      totalAmount += parseFloat(item.amount) || 0;
    } else {
      invalidCount++;
    }
  }

  return {
    entries: finalEntries,
    validCount,
    invalidCount,
    duplicateCount,
    totalAmount,
    hasDuplicates: duplicateCount > 0,
  };
}

export interface ExecuteSolBatchParams {
  client: AppClient;
  payer: TransactionSigner;
  recipients: { address: Address; amountSol: number }[];
  cluster: ClusterMoniker;
  treasuryWallet?: string;
  platformFeeSol?: number;
}

/**
 * Executes a single atomic batch of Native SOL transfers.
 */
export async function executeSolAirdropBatch(
  params: ExecuteSolBatchParams
): Promise<{ txSignature: string }> {
  const { client, payer, recipients, platformFeeSol, treasuryWallet } = params;
  const instructions: Instruction[] = [];

  for (const item of recipients) {
    const lamportUnits = BigInt(Math.round(item.amountSol * 1e9));
    instructions.push(
      getTransferSolInstruction({
        source: payer,
        destination: item.address,
        amount: lamports(lamportUnits),
      })
    );
  }

  if (platformFeeSol && platformFeeSol > 0) {
    const feeLamports = BigInt(Math.round(platformFeeSol * 1e9));
    const dest = address(
      treasuryWallet || "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU"
    );
    instructions.push(
      getTransferSolInstruction({
        source: payer,
        destination: dest,
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

export interface ExecuteSplBatchParams {
  client: AppClient;
  payer: TransactionSigner;
  mintAddress: Address;
  decimals: number;
  recipients: { address: Address; amount: string }[];
  cluster: ClusterMoniker;
  treasuryWallet?: string;
  platformFeeSol?: number;
}

/**
 * Executes a single atomic batch of SPL Token transfers with idempotent ATA auto-creation.
 */
export async function executeSplAirdropBatch(
  params: ExecuteSplBatchParams
): Promise<{ txSignature: string }> {
  const {
    client,
    payer,
    mintAddress,
    decimals,
    recipients,
    platformFeeSol,
    treasuryWallet,
  } = params;

  const [sourceAta] = await findAssociatedTokenPda({
    mint: mintAddress,
    owner: payer.address,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const instructions: Instruction[] = [];

  for (const item of recipients) {
    const [recipientAta] = await findAssociatedTokenPda({
      mint: mintAddress,
      owner: item.address,
      tokenProgram: TOKEN_PROGRAM_ADDRESS,
    });

    // 1. Idempotent create ATA (creates account if missing, no-ops if already exists)
    instructions.push(
      getCreateAssociatedTokenIdempotentInstruction({
        payer,
        ata: recipientAta,
        owner: item.address,
        mint: mintAddress,
      })
    );

    // 2. TransferChecked instruction
    const rawUnits = calculateSupplyBaseUnits(item.amount, decimals);
    instructions.push(
      getTransferCheckedInstruction({
        source: sourceAta,
        mint: mintAddress,
        destination: recipientAta,
        authority: payer,
        amount: rawUnits,
        decimals,
      })
    );
  }

  if (platformFeeSol && platformFeeSol > 0) {
    const feeLamports = BigInt(Math.round(platformFeeSol * 1e9));
    const dest = address(
      treasuryWallet || "9poMxa1YY7mTpCpcPmdvcy86vGgBwbL1nmDLrxV8iziU"
    );
    instructions.push(
      getTransferSolInstruction({
        source: payer,
        destination: dest,
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
