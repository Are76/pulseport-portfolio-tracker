/**
 * useGasEstimates
 *
 * Estimates slow / standard / fast gas fees on PulseChain using `eth_feeHistory`
 * (4 blocks, percentiles [25, 50, 75]) with an `eth_gasPrice` fallback.
 * Refreshes every 30 seconds.
 *
 * Ported from GitLab pulsechain-dashboard/useGasEstimates.jsx and converted to TypeScript.
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_RPC     = 'https://rpc-pulsechain.g4mm4.io';
const FALLBACK_RPC    = 'https://rpc.pulsechain.com';
const REFRESH_MS      = 30_000;
const FETCH_TIMEOUT   = 10_000;
const BLOCKS          = 4;
const PERCENTILES     = [25, 50, 75];

// --- Types --------------------------------------------------------------------

export interface FeeOption {
  label: string;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  estimatedGwei: number;
}

export interface GasEstimates {
  slow: FeeOption;
  standard: FeeOption;
  fast: FeeOption;
}

export interface UseGasEstimatesResult {
  estimates: GasEstimates | null;
  loading: boolean;
  error: string | null;
}

// --- RPC helpers --------------------------------------------------------------

interface FeeHistoryResponse {
  result?: {
    baseFeePerGas: string[];
    reward: string[][];
  };
  error?: { message: string };
}

interface GasPriceResponse {
  result?: string;
}

async function rpcPost<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  return res.json() as Promise<T>;
}

async function rpcPostWithFallback<T>(
  primaryRpc: string,
  fallbackRpc: string,
  method: string,
  params: unknown[],
): Promise<T> {
  try {
    return await rpcPost<T>(primaryRpc, method, params);
  } catch {
    return await rpcPost<T>(fallbackRpc, method, params);
  }
}

// --- Estimate computation -----------------------------------------------------

async function computeEstimates(rpcUrl: string, fallbackRpc: string): Promise<GasEstimates> {
  const feeHistory = await rpcPostWithFallback<FeeHistoryResponse>(
    rpcUrl, fallbackRpc,
    'eth_feeHistory',
    [BLOCKS, 'latest', PERCENTILES],
  );

  if (feeHistory.result?.reward && feeHistory.result.baseFeePerGas) {
    const rewards = feeHistory.result.reward; // array of [p25, p50, p75] per block
    const baseFees = feeHistory.result.baseFeePerGas; // one extra entry for next block

    // Use the pending base fee (last entry) as the base
    const pendingBaseFee = BigInt(baseFees[baseFees.length - 1] ?? '0x0');

    // Average tip across blocks for each percentile
    const avgTip = (pIdx: number): bigint => {
      const tips = rewards
        .map(block => BigInt(block[pIdx] ?? '0x0'))
        .filter(t => t > 0n);
      if (tips.length === 0) return 0n;
      return tips.reduce((a, b) => a + b, 0n) / BigInt(tips.length);
    };

    const tip25 = avgTip(0);
    const tip50 = avgTip(1);
    const tip75 = avgTip(2);

    const toGwei = (wei: bigint): number => Number(wei) / 1e9;

    return {
      slow: {
        label: 'Slow',
        maxPriorityFeePerGas: tip25,
        maxFeePerGas: pendingBaseFee + tip25,
        estimatedGwei: toGwei(pendingBaseFee + tip25),
      },
      standard: {
        label: 'Standard',
        maxPriorityFeePerGas: tip50,
        maxFeePerGas: pendingBaseFee + tip50,
        estimatedGwei: toGwei(pendingBaseFee + tip50),
      },
      fast: {
        label: 'Fast',
        maxPriorityFeePerGas: tip75,
        maxFeePerGas: pendingBaseFee + tip75,
        estimatedGwei: toGwei(pendingBaseFee + tip75),
      },
    };
  }

  // Fallback: use eth_gasPrice and derive three tiers
  const gasPriceRes = await rpcPostWithFallback<GasPriceResponse>(
    rpcUrl, fallbackRpc,
    'eth_gasPrice',
    [],
  );
  const base = BigInt(gasPriceRes.result ?? '0x0');
  const toGwei = (wei: bigint): number => Number(wei) / 1e9;

  return {
    slow: {
      label: 'Slow',
      maxPriorityFeePerGas: 0n,
      maxFeePerGas: (base * 85n) / 100n,
      estimatedGwei: toGwei((base * 85n) / 100n),
    },
    standard: {
      label: 'Standard',
      maxPriorityFeePerGas: 0n,
      maxFeePerGas: base,
      estimatedGwei: toGwei(base),
    },
    fast: {
      label: 'Fast',
      maxPriorityFeePerGas: 0n,
      maxFeePerGas: (base * 120n) / 100n,
      estimatedGwei: toGwei((base * 120n) / 100n),
    },
  };
}

// --- Hook ---------------------------------------------------------------------

export function useGasEstimates(rpcUrl?: string): UseGasEstimatesResult {
  const primaryRpc  = rpcUrl ?? DEFAULT_RPC;
  const fallbackRpc = primaryRpc === DEFAULT_RPC ? FALLBACK_RPC : DEFAULT_RPC;

  const [estimates, setEstimates] = useState<GasEstimates | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchEstimates = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const result = await computeEstimates(primaryRpc, fallbackRpc);
      setEstimates(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch gas estimates');
    } finally {
      setLoading(false);
    }
  }, [primaryRpc, fallbackRpc]);

  useEffect(() => {
    fetchEstimates();
    const id = setInterval(fetchEstimates, REFRESH_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchEstimates]);

  return { estimates, loading, error };
}
