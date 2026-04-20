/**
 * useTokenSearch
 *
 * Searches PulseX V1 and V2 subgraphs simultaneously for token pairs matching
 * a search term. Returns combined, deduplicated results filtered to pairs where
 * one side has WPLS reserve ≥ 10,000,000 raw (i.e., meaningful liquidity).
 *
 * Ported from GitLab pulsechain-dashboard/useTokenSearch.jsx and converted to TypeScript.
 */
import { useState, useEffect, useRef } from 'react';

const WPLS_ADDRESS  = '0xa1077a294dde1b09bb078844df40758a5d0f9a27';
const MIN_WPLS_RESERVE = 10_000_000; // raw WPLS units (not normalised)

const SUBGRAPH_V1 = 'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsex';
const SUBGRAPH_V2 = 'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsex-v2';

const FETCH_TIMEOUT = 10_000;

// --- Types --------------------------------------------------------------------

export interface TokenSearchResult {
  id: string;
  pairAddress: string;
  token0: { id: string; symbol: string; name: string; decimals: string };
  token1: { id: string; symbol: string; name: string; decimals: string };
  reserveUSD: string;
  version: 'v1' | 'v2';
}

export interface UseTokenSearchResult {
  data: TokenSearchResult[];
  isLoading: boolean;
  isError: boolean;
  noResults: boolean;
}

// --- GraphQL helpers ----------------------------------------------------------

interface SubgraphPair {
  id: string;
  token0: { id: string; symbol: string; name: string; decimals: string };
  token1: { id: string; symbol: string; name: string; decimals: string };
  reserve0: string;
  reserve1: string;
  reserveUSD: string;
}

interface SubgraphResponse {
  data?: { pairs?: SubgraphPair[] };
  errors?: { message: string }[];
}

function buildQuery(term: string): string {
  const escaped = term.replace(/[\\'"]/g, '\\$&');
  return JSON.stringify({
    query: `{
      pairs(
        where: {
          or: [
            { token0_contains_nocase: "${escaped}" }
            { token1_contains_nocase: "${escaped}" }
          ]
        }
        first: 20
        orderBy: reserveUSD
        orderDirection: desc
      ) {
        id
        token0 { id symbol name decimals }
        token1 { id symbol name decimals }
        reserve0
        reserve1
        reserveUSD
      }
    }`,
  });
}

async function querySubgraph(
  url: string,
  term: string,
  version: 'v1' | 'v2',
): Promise<TokenSearchResult[]> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: buildQuery(term),
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });

  if (!res.ok) throw new Error(`Subgraph HTTP ${res.status}`);

  const json: SubgraphResponse = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);

  const pairs = json.data?.pairs ?? [];

  return pairs
    .filter(p => {
      // Keep only pairs that include WPLS with enough reserve
      const isToken0Wpls = p.token0.id.toLowerCase() === WPLS_ADDRESS;
      const isToken1Wpls = p.token1.id.toLowerCase() === WPLS_ADDRESS;
      if (!isToken0Wpls && !isToken1Wpls) return false;

      const wplsReserve = isToken0Wpls ? parseFloat(p.reserve0) : parseFloat(p.reserve1);
      return wplsReserve >= MIN_WPLS_RESERVE;
    })
    .map(p => ({
      id: `${version}:${p.id}`,
      pairAddress: p.id,
      token0: p.token0,
      token1: p.token1,
      reserveUSD: p.reserveUSD,
      version,
    }));
}

// --- Hook ---------------------------------------------------------------------

export function useTokenSearch(searchTerm: string): UseTokenSearchResult {
  const [data,      setData]      = useState<TokenSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError,   setIsError]   = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef    = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = searchTerm.trim();

    if (trimmed.length < 2) {
      setData([]);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    // Debounce: wait 300ms after the user stops typing
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setIsLoading(true);
      setIsError(false);

      try {
        const [v1Res, v2Res] = await Promise.allSettled([
          querySubgraph(SUBGRAPH_V1, trimmed, 'v1'),
          querySubgraph(SUBGRAPH_V2, trimmed, 'v2'),
        ]);

        const combined: TokenSearchResult[] = [];
        if (v1Res.status === 'fulfilled') combined.push(...v1Res.value);
        if (v2Res.status === 'fulfilled') combined.push(...v2Res.value);

        // Deduplicate by pairAddress (keep first occurrence - V1 first, then V2)
        const seen = new Set<string>();
        const deduped = combined.filter(p => {
          if (seen.has(p.pairAddress)) return false;
          seen.add(p.pairAddress);
          return true;
        });

        // Sort by reserveUSD descending
        deduped.sort((a, b) => parseFloat(b.reserveUSD) - parseFloat(a.reserveUSD));

        setData(deduped);
        if (v1Res.status === 'rejected' && v2Res.status === 'rejected') {
          setIsError(true);
        }
      } catch {
        setIsError(true);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const noResults = !isLoading && !isError && data.length === 0 && searchTerm.trim().length >= 2;

  return { data, isLoading, isError, noResults };
}
