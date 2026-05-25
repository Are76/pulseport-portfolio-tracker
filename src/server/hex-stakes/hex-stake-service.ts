import { createPublicClient, formatUnits, http, isAddress } from 'viem';

import { CHAINS } from '../../constants';
import type { HexStakeDashboardDto, HexStakePositionDto } from './hex-stake-types';

const PULSECHAIN_ID = 369;
const HEX_CONTRACT_ADDRESS = '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39';
const HEX_ASSET_ID = 'erc20:369:0x2b591e99afe9f32eaa6214f7b7629768c40eeb39';
const STAKE_LISTS_BATCH_SIZE = 10;

const HEX_STAKE_ABI = [
  { type: 'function', name: 'stakeCount', stateMutability: 'view', inputs: [{ name: 'stakerAddr', type: 'address' }], outputs: [{ name: 'count', type: 'uint256' }] },
  {
    type: 'function', name: 'stakeLists', stateMutability: 'view',
    inputs: [{ name: 'stakerAddr', type: 'address' }, { name: 'stakeIndex', type: 'uint256' }],
    outputs: [
      { name: 'stakeId', type: 'uint40' },
      { name: 'stakedHearts', type: 'uint72' },
      { name: 'stakeShares', type: 'uint72' },
      { name: 'lockedDay', type: 'uint16' },
      { name: 'stakedDays', type: 'uint16' },
      { name: 'unlockedDay', type: 'uint16' },
      { name: 'isAutoStake', type: 'bool' },
    ],
  },
  { type: 'function', name: 'currentDay', stateMutability: 'view', inputs: [], outputs: [{ name: 'day', type: 'uint256' }] },
  {
    type: 'function', name: 'dailyDataRange', stateMutability: 'view',
    inputs: [{ name: 'beginDay', type: 'uint256' }, { name: 'endDay', type: 'uint256' }],
    outputs: [{ name: 'list', type: 'tuple[]', components: [
      { name: 'dayPayoutTotal', type: 'uint72' },
      { name: 'dayStakeSharesTotal', type: 'uint72' },
      { name: 'dayUnclaimedSatoshisTotal', type: 'uint56' },
    ] }],
  },
] as const;

const MIGRATION_WARNING = 'Native PulseChain HEX stake reads are implemented for active and ended lifecycle coverage. Pricing, PnL, HSI, and HTT are not implemented yet.';

type HexStakeListEntry = readonly [number | bigint, bigint, bigint, number | bigint, number | bigint, number | bigint, boolean];
type HexDailyDataEntry = readonly [bigint, bigint, bigint];


function calculateYieldHearts(stakeShares: bigint, dayData: HexDailyDataEntry[]): bigint {
  return dayData.reduce((acc, [dayPayoutTotal, dayStakeSharesTotal]) => {
    if (dayStakeSharesTotal <= 0n) return acc;
    return acc + (stakeShares * dayPayoutTotal) / dayStakeSharesTotal;
  }, 0n);
}


type HexDailyDataObject = { dayPayoutTotal: bigint; dayStakeSharesTotal: bigint; dayUnclaimedSatoshisTotal: bigint };

function normalizeDailyDataEntry(entry: HexDailyDataEntry | HexDailyDataObject): HexDailyDataEntry {
  if (Array.isArray(entry)) return [BigInt(entry[0]), BigInt(entry[1]), BigInt(entry[2])];
  const obj = entry as HexDailyDataObject;
  return [obj.dayPayoutTotal, obj.dayStakeSharesTotal, obj.dayUnclaimedSatoshisTotal];
}

function classifyStakeStatus(lockedDay: number, stakedDays: number, currentDay: number, unlockedDay: number): HexStakePositionDto['stakeStatus'] {
  if (unlockedDay !== 0) return 'ended';
  if (lockedDay > currentDay) return 'pending';
  if (lockedDay + stakedDays >= currentDay) return 'active';
  return 'overdue';
}

export class HexStakeServiceError extends Error {
  public readonly cause: unknown;
  constructor(public readonly code: 'invalid_wallet' | 'unsupported_chain' | 'backend_unavailable', message: string, options?: { cause?: unknown }) {
    super(message); this.name = 'HexStakeServiceError'; this.cause = options?.cause;
  }
}

export async function getHexStakeDashboard(walletAddress: string, chainId = PULSECHAIN_ID): Promise<HexStakeDashboardDto> {
  if (!isAddress(walletAddress)) throw new HexStakeServiceError('invalid_wallet', 'Invalid walletAddress format.');
  if (chainId !== PULSECHAIN_ID) throw new HexStakeServiceError('unsupported_chain', 'Only PulseChain (369) is supported in this API.');

  const asOf = new Date().toISOString();
  const normalizedWalletAddress = walletAddress.toLowerCase();

  try {
    const client = createPublicClient({ transport: http(CHAINS.pulsechain.rpc) });
    const [stakeCountRaw, currentDayRaw] = await Promise.all([
      client.readContract({ address: HEX_CONTRACT_ADDRESS, abi: HEX_STAKE_ABI, functionName: 'stakeCount', args: [walletAddress] }),
      client.readContract({ address: HEX_CONTRACT_ADDRESS, abi: HEX_STAKE_ABI, functionName: 'currentDay' }),
    ]);

    const stakeCount = Number(stakeCountRaw);
    const currentDay = Number(currentDayRaw);

    const successfulStakes: { index: number; stake: HexStakeListEntry }[] = [];
    const failedStakeIndexes: number[] = [];

    for (let start = 0; start < stakeCount; start += STAKE_LISTS_BATCH_SIZE) {
      const end = Math.min(start + STAKE_LISTS_BATCH_SIZE, stakeCount);
      const batch = Array.from({ length: end - start }, (_, offset) => start + offset);

      const settled = await Promise.allSettled(
        batch.map((idx) => client.readContract({
          address: HEX_CONTRACT_ADDRESS,
          abi: HEX_STAKE_ABI,
          functionName: 'stakeLists',
          args: [walletAddress, BigInt(idx)],
        })),
      );

      settled.forEach((result, pos) => {
        const idx = batch[pos];
        if (result.status === 'fulfilled') successfulStakes.push({ index: idx, stake: result.value as HexStakeListEntry });
        else failedStakeIndexes.push(idx);
      });
    }

    if (stakeCount > 0 && successfulStakes.length === 0) {
      throw new HexStakeServiceError('backend_unavailable', 'HEX stakes backend is currently unavailable.');
    }

    const partialWarning = failedStakeIndexes.length > 0
      ? `Partial native stake read: ${failedStakeIndexes.length}/${stakeCount} stakeLists indexes failed.`
      : null;

    const yieldEligible = successfulStakes.filter(({ stake }) => {
      const lockedDay = Number(stake[3]);
      const stakedDays = Number(stake[4]);
      const unlockedDay = Number(stake[5]);
      const status = classifyStakeStatus(lockedDay, stakedDays, currentDay, unlockedDay);
      return lockedDay <= currentDay && status !== 'pending' && status !== 'ended';
    });
    const earliestLockedDay = yieldEligible.length > 0 ? Math.min(...yieldEligible.map((x) => Number(x.stake[3]))) : null;
    const latestYieldDay = currentDay > 0 ? currentDay - 1 : 0;
    const latestRequiredStakeDay = yieldEligible.length > 0
      ? Math.max(...yieldEligible.map(({ stake }) => {
        const lockedDay = Number(stake[3]);
        const stakedDays = Number(stake[4]);
        const maturityDay = lockedDay + stakedDays - 1;
        return Math.min(maturityDay, latestYieldDay);
      }))
      : null;

    let dailyDataByDay = new Map<number, HexDailyDataEntry>();
    let dailyDataWarning: string | null = null;
    let dailyDataRangeFailed = false;

    if (
      earliestLockedDay !== null
      && latestRequiredStakeDay !== null
      && earliestLockedDay <= latestRequiredStakeDay
    ) {
      try {
        const dailyData = await client.readContract({
          address: HEX_CONTRACT_ADDRESS,
          abi: HEX_STAKE_ABI,
          functionName: 'dailyDataRange',
          args: [BigInt(earliestLockedDay), BigInt(latestRequiredStakeDay + 1)],
        }) as readonly (HexDailyDataEntry | HexDailyDataObject)[];

        dailyDataByDay = new Map(dailyData.map((entry, idx) => [earliestLockedDay + idx, normalizeDailyDataEntry(entry)]));


        const expectedDays = latestRequiredStakeDay - earliestLockedDay + 1;
        if (dailyData.length < expectedDays) {
          dailyDataWarning = `dailyDataRange returned incomplete data (${dailyData.length}/${expectedDays} days).`;
        }
      } catch {
        dailyDataWarning = 'dailyDataRange call failed; yield cannot be fully determined.';
        dailyDataRangeFailed = true;
      }
    }

    let totalYieldHeartsRaw = 0n;
    const positions: HexStakePositionDto[] = successfulStakes.map(({ stake }) => {
      const [stakeId, stakedHearts, stakeShares, lockedDayRaw, stakedDaysRaw, unlockedDayRaw] = stake;
      const lockedDay = Number(lockedDayRaw);
      const stakedDays = Number(stakedDaysRaw);
      const unlockedDay = Number(unlockedDayRaw);
      const stakeStatus = classifyStakeStatus(lockedDay, stakedDays, currentDay, unlockedDay);
      const endedDaysAgo = stakeStatus === 'ended' ? Math.max(0, currentDay - unlockedDay) : null;
      let yieldHearts = 0n;
      const warnings = [
        'Pricing, valuation, and PnL are not implemented for HEX stakes yet.',
      ];
      const provenanceNotes = [
        'chainId=369',
        'methods=stakeCount,stakeLists,currentDay,dailyDataRange',
        `dailyDataRange.startDay=${earliestLockedDay ?? 'na'}`,
        `dailyDataRange.endDay=${latestRequiredStakeDay ?? 'na'}`,
      ];
      if (stakeStatus === 'pending') {
        warnings.push('Pending stake has no realized yield yet; yieldHex remains 0.');
        provenanceNotes.push('yield.pending=no-realized-yield');
      } else if (stakeStatus === 'ended') {
        warnings.push('Ended stake yield is capped at unlockedDay.');
        provenanceNotes.push('yield.ended=stopped-at-unlockedDay');
        provenanceNotes.push(`lifecycle.ended.unlockedDay=${unlockedDay}`);
        if (endedDaysAgo !== null) provenanceNotes.push(`lifecycle.ended.daysAgo=${endedDaysAgo}`);
      } else {
        const maturityDay = lockedDay + stakedDays - 1;
        const endDay = Math.min(maturityDay, latestYieldDay);
        const days: HexDailyDataEntry[] = [];
        for (let day = lockedDay; day <= endDay; day += 1) {
          const entry = dailyDataByDay.get(day);
          if (!entry) {
            if (!dailyDataRangeFailed) warnings.push(`dailyData missing for day ${day}; yield may be incomplete.`);
            continue;
          }
          days.push(entry);
        }
        yieldHearts = calculateYieldHearts(BigInt(stakeShares), days);
      }
      totalYieldHeartsRaw += yieldHearts;
      if (dailyDataWarning) warnings.push(dailyDataWarning);
      if (partialWarning) warnings.push(partialWarning);
      return {
        stakeId: stakeId.toString(),
        stakeSource: 'native',
        stakeStatus,
        chainId,
        assetId: HEX_ASSET_ID,
        contractAddress: HEX_CONTRACT_ADDRESS,
        lockedDay,
        stakedDays,
        unlockedDay,
        endedDaysAgo,
        principalHex: formatUnits(stakedHearts, 8),
        stakeShares: stakeShares.toString(),
        tShares: formatUnits(stakeShares, 12),
        yieldHex: formatUnits(yieldHearts, 8),
        bpdYield: null,
        bpdYieldStatus: 'unknown',
        pricing: { status: 'unavailable', priceUsd: null, source: null, observedAt: null },
        valuation: { status: 'unavailable', valueUsd: null },
        pnl: { status: 'unavailable', realizedUsd: null, unrealizedUsd: null },
        warnings,
        provenance: {
          source: 'pulseport.hex-stakes.native-contract-reads-v1',
          observedAt: asOf,
          notes: provenanceNotes,
        },
      };
    });

    const totalPrincipalRaw = successfulStakes.reduce((acc, x) => acc + BigInt(x.stake[1]), 0n);
    const totalTSharesRaw = successfulStakes.reduce((acc, x) => acc + BigInt(x.stake[2]), 0n);

    const rootWarnings = [MIGRATION_WARNING, ...(partialWarning ? [partialWarning] : [])];
    const rootNotes = ['source=HEX contract reads', 'methods=stakeCount,stakeLists,currentDay,dailyDataRange', `chainId=${chainId}`, `asOf=${asOf}`];
    if (partialWarning) rootNotes.push(`failedStakeIndexes=${failedStakeIndexes.join(',')}`);

    return {
      schemaVersion: 'v1', walletAddress: normalizedWalletAddress, chainId, asOf,
      status: positions.length === 0 ? 'partial' : 'available',
      positions,
      summary: {
        activeStakeCount: positions.filter((p) => p.stakeStatus === 'active').length,
        endedStakeCount: positions.filter((p) => p.stakeStatus === 'ended').length,
        unsupportedStakeCount: 0,
        totalPrincipalHex: formatUnits(totalPrincipalRaw, 8),
        totalYieldHex: formatUnits(totalYieldHeartsRaw, 8),
        totalTShares: formatUnits(totalTSharesRaw, 12),
        valuationStatus: 'unavailable',
        pnlStatus: 'unavailable',
        warnings: rootWarnings,
      },
      tShareMetrics: { status: 'unknown', shareRate: null, tSharePriceHex: null, tSharePriceUsd: null, activeTShares: formatUnits(totalTSharesRaw, 12), averagePaidUsdPerTShare: null, warnings: ['tShare metrics requiring dailyData are not implemented yet.', ...(partialWarning ? [partialWarning] : [])] },
      warnings: rootWarnings,
      provenance: { source: 'pulseport.hex-stakes.native-contract-reads-v1', observedAt: asOf, notes: rootNotes },
    };
  } catch (error) {
    if (error instanceof HexStakeServiceError) throw error;
    throw new HexStakeServiceError('backend_unavailable', 'HEX stakes backend is currently unavailable.', { cause: error });
  }
}
