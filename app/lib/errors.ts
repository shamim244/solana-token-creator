import {
  isSolanaError,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
} from "@solana/kit";

export function parseTransactionError(err: unknown): string {
  // 1. User rejection / cancellation in wallet
  if (
    errorChainIncludes(
      err,
      /user (?:rejected|declined)|rejected by user|User rejected the request|cancelled/i
    )
  ) {
    return "Transaction was cancelled in your wallet.";
  }

  // 2. Insufficient balance or lamports for fees / rent
  if (
    errorChainIncludes(
      err,
      /insufficient (?:funds|lamports)|custom program error: 0x1\b|custom program error: 1\b|ResultWithNegativeLamports|InsufficientFundsForRent|Attempt to debit an account but found no record/i
    )
  ) {
    return "Insufficient SOL balance. Your wallet does not have enough SOL to cover the platform fee and Solana network rent.";
  }

  // 3. Blockhash expired / timeout
  if (
    errorChainIncludes(
      err,
      /blockhash not found|blockhash expired|Transaction expired/i
    )
  ) {
    return "Transaction timed out on the Solana network. Please try again.";
  }

  // 4. Rate limiting / RPC 429
  if (errorChainIncludes(err, /429|Too Many Requests|rate limit/i)) {
    return "Solana RPC node rate limit reached. Please wait a few seconds or switch RPC endpoints.";
  }

  // 5. Transaction simulation failed
  if (
    errorChainIncludes(err, /simulation failed|Transaction simulation failed/i)
  ) {
    // Check if error contains context or logs with details
    const anyErr = err as Record<string, unknown>;
    const logs =
      (anyErr?.context as Record<string, unknown>)?.logs || anyErr?.logs || [];
    const logString = Array.isArray(logs) ? logs.join(" ") : String(logs);

    if (
      /insufficient (?:funds|lamports)|0x1\b|ResultWithNegativeLamports|Rent/i.test(
        logString
      )
    ) {
      return "Insufficient SOL balance. Your wallet does not have enough SOL to cover the deployment fee and rent.";
    }

    return "Transaction simulation failed: Insufficient SOL balance or invalid transaction parameters. Please verify your wallet balance and try again.";
  }

  const message = getDeepestMessage(err);
  return message.length > 200 ? `${message.slice(0, 200)}...` : message;
}

function errorChainIncludes(err: unknown, pattern: RegExp): boolean {
  let current: unknown = err;

  while (current instanceof Error) {
    if (pattern.test(current.message)) return true;
    current = current.cause;
  }

  return false;
}

export function isCustomProgramError(err: unknown, code: number): boolean {
  let current: unknown = err;

  while (current instanceof Error) {
    if (
      isSolanaError(current, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM) &&
      current.context.code === code
    ) {
      return true;
    }
    current = current.cause;
  }

  return false;
}

function getDeepestMessage(err: unknown): string {
  let deepest = err instanceof Error ? err.message : String(err);
  let current: unknown = err;

  while (current instanceof Error && current.cause) {
    current = current.cause;
    if (current instanceof Error) {
      deepest = current.message;
    }
  }

  return deepest;
}
