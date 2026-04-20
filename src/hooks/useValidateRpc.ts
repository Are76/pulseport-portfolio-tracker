/**
 * useValidateRpc
 *
 * Validates that a given RPC URL connects to PulseChain (chainId 369 / 0x171).
 * Uses a raw `eth_chainId` fetch (no ethers/viem dependency).
 *
 * Ported from GitLab pulsechain-dashboard/useValidateRpc.js and converted to TypeScript.
 */
import { useState, useEffect, useCallback } from 'react';

const PULSECHAIN_CHAIN_ID = '0x171'; // 369 in hex
const FETCH_TIMEOUT = 8_000;

export interface UseValidateRpcResult {
  isValid: boolean;
  isChecking: boolean;
  error: string | null;
  validateRpc: (url: string) => Promise<boolean>;
}

export function useValidateRpc(initialUrl?: string | null): UseValidateRpcResult {
  const [isValid,    setIsValid]    = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const validateRpc = useCallback(async (url: string): Promise<boolean> => {
    if (!url || !url.startsWith('http')) {
      setIsValid(false);
      setError('Invalid URL - must start with http:// or https://');
      return false;
    }

    setIsChecking(true);
    setError(null);
    setIsValid(false);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json: { result?: string; error?: { message: string } } = await res.json();

      if (json.error) {
        throw new Error(json.error.message);
      }

      const chainId = (json.result ?? '').toLowerCase();
      // Accept both "0x171" and the decimal string "369"
      const valid = chainId === PULSECHAIN_CHAIN_ID || parseInt(chainId, 16) === 369;

      if (!valid) {
        const decimal = parseInt(chainId, 16);
        setError(`Wrong chain - expected PulseChain (369) but got chain ID ${decimal}`);
        setIsValid(false);
        return false;
      }

      setIsValid(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      setError(msg);
      setIsValid(false);
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Validate on mount if an initial URL is provided
  useEffect(() => {
    if (initialUrl) {
      validateRpc(initialUrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isValid, isChecking, error, validateRpc };
}
