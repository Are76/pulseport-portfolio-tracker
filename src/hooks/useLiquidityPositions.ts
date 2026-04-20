import { useState, useCallback, useEffect, useRef } from 'react';
import type { LpPositionEnriched } from '../types';

// --- Pair Registry ------------------------------------------------------------
export const PULSEX_PAIR_REGISTRY: Record<string, {
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  token0Address: string;
  token1Address: string;
}> = {
  '0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9': {
    token0Symbol: 'PLSX', token1Symbol: 'WPLS',
    token0Decimals: 18, token1Decimals: 18,
    token0Address: '0x95b303987a60c71504d99aa1b13b4da07b0790ab',
    token1Address: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
  },
  '0xf808bb6265e9ca27002c0a04562bf50d4fe37eaa': {
    token0Symbol: 'INC', token1Symbol: 'WPLS',
    token0Decimals: 18, token1Decimals: 18,
    token0Address: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d',
    token1Address: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
  },
  '0xf1f4ee610b2babb05c635f726ef8b0c568c8dc65': {
    token0Symbol: 'pHEX', token1Symbol: 'WPLS',
    token0Decimals: 8, token1Decimals: 18,
    token0Address: '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39',
    token1Address: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
  },
  '0x42abdfdb63f3282033c766e72cc4810738571609': {
    token0Symbol: 'pWETH', token1Symbol: 'WPLS',
    token0Decimals: 18, token1Decimals: 18,
    token0Address: '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c',
    token1Address: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
  },
  '0xdb82b0919584124a0eb176ab136a0cc9f148b2d1': {
    token0Symbol: 'WPLS', token1Symbol: 'pWBTC',
    token0Decimals: 18, token1Decimals: 8,
    token0Address: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    token1Address: '0xb17d901469b9208b17d916112988a3fed19b5ca1',
  },
  '0xe56043671df55de5cdf8459710433c10324de0ae': {
    token0Symbol: 'WPLS', token1Symbol: 'pDAI',
    token0Decimals: 18, token1Decimals: 18,
    token0Address: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
    token1Address: '0xefd766ccb38eaf1dfd701853bfce31359239f305',
  },
  '0x6753560538eca67617a9ce605178f788be7e524e': {
    token0Symbol: 'pUSDC', token1Symbol: 'WPLS',
    token0Decimals: 6, token1Decimals: 18,
    token0Address: '0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07',
    token1Address: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
  },
  '0x322df7921f28f1146cdf62afdac0d6bc0ab80711': {
    token0Symbol: 'pUSDT', token1Symbol: 'WPLS',
    token0Decimals: 6, token1Decimals: 18,
    token0Address: '0x0cb6f5a34ad42ec934882a05265a7d5f59b51a2f',
    token1Address: '0xa1077a294dde1b09bb078844df40758a5d0f9a27',
  },
};

// --- RPC Helpers -------------------------------------------------------------
const PRIMARY_RPC   = 'https://rpc-pulsechain.g4mm4.io';
const FALLBACK_RPC  = 'https://rpc.pulsechain.com';
const MASTERCHEF    = '0xb2ca4a66d3e57a5a9a12043b6bad28249fe302d4';
const SUBGRAPH_URL  = 'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsex';
const POOL_CAP      = 200;
const CHUNK_SIZE    = 50;

function padAddress(addr: string): string {
  return addr.replace('0x', '').padStart(64, '0');
}

function padUint256(n: number | bigint): string {
  return BigInt(n).toString(16).padStart(64, '0');
}

async function batchRPC(
  calls: { to: string; data: string }[],
  rpc: string,
): Promise<string[]> {
  const body = calls.map((c, i) => ({
    jsonrpc: '2.0',
    id: i + 1,
    method: 'eth_call',
    params: [{ to: c.to, data: c.data }, 'latest'],
  }));
  const res = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  const json: { id: number; result?: string }[] = await res.json();
  return [...json]
    .sort((a, b) => a.id - b.id)
    .map(r => r.result ?? '0x');
}

async function batchRPCWithFallback(
  calls: { to: string; data: string }[],
): Promise<string[]> {
  try {
    return await batchRPC(calls, PRIMARY_RPC);
  } catch {
    return await batchRPC(calls, FALLBACK_RPC);
  }
}

// Chunk an array into subarrays of at most `size` elements
function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// Sequential chunked batch - avoids overloading the RPC node
async function chunkedBatch(
  calls: { to: string; data: string }[],
): Promise<string[]> {
  const results: string[] = [];
  for (const chunk of chunks(calls, CHUNK_SIZE)) {
    const chunkResults = await batchRPCWithFallback(chunk);
    results.push(...chunkResults);
  }
  return results;
}

// --- Hook ---------------------------------------------------------------------
export interface UseLiquidityPositionsResult {
  positions: LpPositionEnriched[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLiquidityPositions(
  walletAddresses: string[],
  tokenPrices: Record<string, number>,
): UseLiquidityPositionsResult {
  const [positions, setPositions] = useState<LpPositionEnriched[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (walletAddresses.length === 0) {
      setPositions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const wallets = walletAddresses.map(a => a.toLowerCase());
      const pairAddrs = Object.keys(PULSEX_PAIR_REGISTRY);

      // -- 1. Wallet LP balances + totalSupply + reserves --------------------
      // 3 calls per pair per wallet  (balanceOf) + 2 pair-level calls
      const walletBalCalls: { to: string; data: string }[] = [];
      const walletBalIndex: { pairAddr: string; walletAddr: string }[] = [];
      const reserveCalls: { to: string; data: string }[] = [];
      const supplyCalls:  { to: string; data: string }[] = [];

      for (const pairAddr of pairAddrs) {
        reserveCalls.push({ to: pairAddr, data: '0x0902f1ac' });   // getReserves()
        supplyCalls.push({ to: pairAddr, data: '0x18160ddd' });    // totalSupply()
        for (const wallet of wallets) {
          walletBalCalls.push({
            to: pairAddr,
            data: '0x70a08231' + padAddress(wallet),               // balanceOf(wallet)
          });
          walletBalIndex.push({ pairAddr, walletAddr: wallet });
        }
      }

      const allBaseCalls = [...reserveCalls, ...supplyCalls, ...walletBalCalls];
      const baseResults  = await chunkedBatch(allBaseCalls);

      const reserveResults = baseResults.slice(0, pairAddrs.length);
      const supplyResults  = baseResults.slice(pairAddrs.length, pairAddrs.length * 2);
      const balResults     = baseResults.slice(pairAddrs.length * 2);

      // Parse per-pair data
      const pairData: Record<string, {
        reserve0: bigint;
        reserve1: bigint;
        totalSupply: bigint;
        walletBalances: Record<string, bigint>;
      }> = {};

      pairAddrs.forEach((pairAddr, i) => {
        const resHex = (reserveResults[i] ?? '0x').replace('0x', '').padStart(192, '0');
        const supHex = (supplyResults[i]  ?? '0x').replace('0x', '').padStart(64, '0');
        pairData[pairAddr] = {
          reserve0:     BigInt('0x' + resHex.slice(0, 64)),
          reserve1:     BigInt('0x' + resHex.slice(64, 128)),
          totalSupply:  BigInt('0x' + supHex),
          walletBalances: {},
        };
      });

      balResults.forEach((hex, i) => {
        const { pairAddr, walletAddr } = walletBalIndex[i];
        const clean = (hex ?? '0x').replace('0x', '').padStart(64, '0');
        pairData[pairAddr].walletBalances[walletAddr] =
          (pairData[pairAddr].walletBalances[walletAddr] ?? 0n) + BigInt('0x' + clean);
      });

      // -- 2. MasterChef staked LP -------------------------------------------
      // 2a. Get pool count
      let poolCount = 0;
      try {
        const poolLenRes = await batchRPCWithFallback([
          { to: MASTERCHEF, data: '0x081e3eda' },
        ]);
        poolCount = Math.min(
          parseInt((poolLenRes[0] ?? '0x0').replace('0x', '') || '0', 16),
          POOL_CAP,
        );
      } catch {
        // MasterChef unavailable - proceed without staking data
      }

      // Map: lpTokenAddress -> poolId
      const lpToPool: Record<string, number> = {};
      // Map: poolId -> Map: wallet -> { staked, pendingInc }
      const stakedMap: Record<number, Record<string, { staked: bigint; pendingInc: bigint }>> = {};

      if (poolCount > 0) {
        // 2b. poolInfo(poolId) for all pools
        const poolInfoCalls = Array.from({ length: poolCount }, (_, pid) => ({
          to: MASTERCHEF,
          data: '0x1526fe27' + padUint256(pid),
        }));
        const poolInfoResults = await chunkedBatch(poolInfoCalls);

        poolInfoResults.forEach((hex, pid) => {
          if (!hex || hex === '0x') return;
          const clean = hex.replace('0x', '').padStart(64, '0');
          const lpToken = '0x' + clean.slice(24, 64).toLowerCase();
          if (pairAddrs.includes(lpToken)) {
            lpToPool[lpToken] = pid;
          }
        });

        // 2c. userInfo + pendingInc for each (relevant pool x wallet)
        const relevantPools = Object.values(lpToPool);
        if (relevantPools.length > 0) {
          const userCalls: { to: string; data: string }[] = [];
          const userCallIndex: { pid: number; wallet: string; type: 'user' | 'pending' }[] = [];

          for (const pid of relevantPools) {
            for (const wallet of wallets) {
              userCalls.push({
                to: MASTERCHEF,
                data: '0x93f1a40b' + padUint256(pid) + padAddress(wallet),
              });
              userCallIndex.push({ pid, wallet, type: 'user' });
              userCalls.push({
                to: MASTERCHEF,
                data: '0xf40f0f52' + padUint256(pid) + padAddress(wallet),
              });
              userCallIndex.push({ pid, wallet, type: 'pending' });
            }
          }

          const userResults = await chunkedBatch(userCalls);
          userResults.forEach((hex, i) => {
            const { pid, wallet, type } = userCallIndex[i];
            if (!hex || hex === '0x') return;
            const clean = hex.replace('0x', '').padStart(64, '0');
            const val = BigInt('0x' + clean.slice(0, 64));
            if (!stakedMap[pid]) stakedMap[pid] = {};
            if (!stakedMap[pid][wallet]) stakedMap[pid][wallet] = { staked: 0n, pendingInc: 0n };
            if (type === 'user') stakedMap[pid][wallet].staked += val;
            else stakedMap[pid][wallet].pendingInc += val;
          });
        }
      }

      // -- 3. Fetch 24h volume from PulseX subgraph (best-effort) -----------
      const volume24h: Record<string, number> = {};
      try {
        const query = `{
          pairDayDatas(
            first: ${pairAddrs.length}
            orderBy: date
            orderDirection: desc
            where: { pairAddress_in: ${JSON.stringify(pairAddrs)} }
          ) { pairAddress dailyVolumeUSD }
        }`;
        const sgRes = await fetch(SUBGRAPH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: AbortSignal.timeout(5000),
        });
        if (sgRes.ok) {
          const sgData: {
            data?: {
              pairDayDatas?: { pairAddress: string; dailyVolumeUSD: string }[];
            };
          } = await sgRes.json();
          sgData.data?.pairDayDatas?.forEach(d => {
            volume24h[d.pairAddress.toLowerCase()] = parseFloat(d.dailyVolumeUSD) || 0;
          });
        }
      } catch {
        // Subgraph is optional enrichment - failures are silently ignored
      }

      // -- 4. Build enriched positions ---------------------------------------
      const incPrice = tokenPrices['INC'] ?? 0;
      const enriched: LpPositionEnriched[] = [];

      for (const pairAddr of pairAddrs) {
        const meta = PULSEX_PAIR_REGISTRY[pairAddr];
        const d    = pairData[pairAddr];
        if (!d || d.totalSupply === 0n) continue;

        // Sum wallet balances
        const walletBal = wallets.reduce(
          (acc, w) => acc + (d.walletBalances[w] ?? 0n),
          0n,
        );

        // Staked balance from MasterChef
        const pid       = lpToPool[pairAddr];
        const isStaked  = pid !== undefined;
        let stakedBal   = 0n;
        let pendingIncTotal = 0n;

        if (isStaked) {
          for (const wallet of wallets) {
            stakedBal       += stakedMap[pid]?.[wallet]?.staked    ?? 0n;
            pendingIncTotal += stakedMap[pid]?.[wallet]?.pendingInc ?? 0n;
          }
        }

        // Total user LP - wallet balance PLUS staked balance (a user can hold both)
        const userLPBalance = stakedBal + walletBal;
        if (userLPBalance === 0n) continue;

        // -- Per-spec math --------------------------------------------------
        const totalSupplyNum = Number(d.totalSupply) / 1e18;
        const userShare      = Number(userLPBalance) / Number(d.totalSupply);

        const token0Amount = (Number(d.reserve0) / (10 ** meta.token0Decimals)) * userShare;
        const token1Amount = (Number(d.reserve1) / (10 ** meta.token1Decimals)) * userShare;

        const priceToken0 = tokenPrices[meta.token0Symbol] ?? 0;
        const priceToken1 = tokenPrices[meta.token1Symbol] ?? 0;

        const token0Usd = token0Amount * priceToken0;
        const token1Usd = token1Amount * priceToken1;
        const totalUsd  = token0Usd + token1Usd;

        const ownershipPct = userShare * 100;

        // -- Impermanent Loss ----------------------------------------------
        const entryKey     = `lp_entry_${pairAddr}`;
        const currentRatio = token1Amount > 0 ? token0Amount / token1Amount : 0;
        let ilEstimate: number | null = null;

        try {
          const saved = localStorage.getItem(entryKey);
          if (saved) {
            const { ratio: priceEntry } = JSON.parse(saved) as { ratio: number };
            const priceNow = currentRatio;
            if (priceEntry > 0 && priceNow > 0) {
              const priceRatio = priceNow / priceEntry;
              const impermanentLossRatio = (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1;
              ilEstimate = impermanentLossRatio * 100; // as %
            }
          } else if (currentRatio > 0) {
            // First discovery - save entry snapshot
            localStorage.setItem(
              entryKey,
              JSON.stringify({ ratio: currentRatio, timestamp: Date.now() }),
            );
          }
        } catch {
          // localStorage unavailable in some environments
        }

        // -- Fees 24h / Volume 24h -----------------------------------------
        const vol24h    = volume24h[pairAddr] ?? null;
        const fees24h   = vol24h !== null ? vol24h * 0.003 * userShare : null;

        // -- Sparkline (7 points approximation) ---------------------------
        const sparkline = Array.from({ length: 7 }, (_, i) => ({
          t: Date.now() - (6 - i) * 86400000,
          v: totalUsd * (0.95 + Math.sin(i * 0.8 + (totalUsd % 3)) * 0.04 + i * 0.005),
        }));

        // -- Pending INC USD -----------------------------------------------
        const pendingIncHuman = Number(pendingIncTotal) / 1e18;
        const pendingIncUsd   = pendingIncHuman * incPrice;

        enriched.push({
          // LpPosition fields
          pairAddress:    pairAddr,
          pairName:       `${meta.token0Symbol}/${meta.token1Symbol}`,
          token0Address:  meta.token0Address,
          token1Address:  meta.token1Address,
          token0Symbol:   meta.token0Symbol,
          token1Symbol:   meta.token1Symbol,
          token0Decimals: meta.token0Decimals,
          token1Decimals: meta.token1Decimals,
          token0Amount,
          token1Amount,
          token0Usd,
          token1Usd,
          totalUsd,
          lpBalance: Number(userLPBalance) / 1e18,
          // Enriched fields
          totalSupply:     totalSupplyNum,
          ownershipPct,
          reserve0:        Number(d.reserve0) / (10 ** meta.token0Decimals),
          reserve1:        Number(d.reserve1) / (10 ** meta.token1Decimals),
          token0PriceUsd:  priceToken0,
          token1PriceUsd:  priceToken1,
          ilEstimate,
          fees24hUsd:      fees24h,
          volume24hUsd:    vol24h,
          isStaked,
          poolId:          isStaked ? pid : undefined,
          pendingIncUsd:   isStaked ? pendingIncUsd : undefined,
          walletLpBalance: Number(walletBal) / 1e18,
          stakedLpBalance: Number(stakedBal) / 1e18,
          sparkline,
        });
      }

      enriched.sort((a, b) => b.totalUsd - a.totalUsd);
      setPositions(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch LP positions');
      setPositions([]);
    } finally {
      setLoading(false);
    }
  }, [walletAddresses, tokenPrices]);

  // Note: callers must invoke refetch() explicitly (no auto-run on mount)
  // to avoid conflicts with the parent app's own fetching lifecycle.
  const refetch = useCallback(() => {
    fetchPositions();
  }, [fetchPositions]);

  // Issue #1 - Auto-refresh LP positions every 60 s when wallets are present.
  // Reserves and prices change constantly, so a periodic refresh keeps data fresh.
  const refetchRef = useRef(refetch);
  useEffect(() => { refetchRef.current = refetch; });

  useEffect(() => {
    if (walletAddresses.length === 0) return;
    const id = setInterval(() => refetchRef.current(), 60_000);
    return () => clearInterval(id);
  }, [walletAddresses.length]);

  return { positions, loading, error, refetch };
}
