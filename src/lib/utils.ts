import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Shared number formatters (used across LP/DeFi components) ---------------

/** Format a USD amount. Always positive - caller handles sign. */
export function fmtUsd(n: number, maxFrac = 2): string {
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: maxFrac })}`;
}

/** Format a token amount with automatic B/M/K abbreviation. */
export function fmtTok(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

// --- RPC Fallback Utility ----------------------------------------------------

/**
 * Executes `fetchFn` against the primary RPC URL first.
 * If the primary throws (network error, timeout, non-2xx), retries sequentially
 * through each entry in `fallbackRpcs` until one succeeds or all are exhausted.
 *
 * @param primaryRpc   - Primary RPC endpoint URL.
 * @param fallbackRpcs - Ordered list of fallback RPC endpoint URLs.
 * @param fetchFn      - Async function that receives an RPC URL and returns T.
 * @returns The result from the first RPC that succeeds.
 * @throws  The last error if every RPC fails.
 */
export async function fetchWithRpcFallback<T>(
  primaryRpc: string,
  fallbackRpcs: string[],
  fetchFn: (rpcUrl: string) => Promise<T>,
): Promise<T> {
  const rpcs = [primaryRpc, ...fallbackRpcs];
  let lastError: unknown;
  for (const rpc of rpcs) {
    try {
      return await fetchFn(rpc);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}
