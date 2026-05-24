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
] as const;

const MIGRATION_WARNING = 'Native PulseChain HEX active stake reads are implemented. Yield, pricing, PnL, ended stake discovery, HSI, and HTT are not implemented yet.';

type HexStakeListEntry = readonly [number | bigint, bigint, bigint, number | bigint, number | bigint, number | bigint, boolean];

function classifyStakeStatus(lockedDay: number, stakedDays: number, currentDay: number): HexStakePositionDto['stakeStatus'] {
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

    const positions: HexStakePositionDto[] = successfulStakes.map(({ stake }) => {
      const [stakeId, stakedHearts, stakeShares, lockedDayRaw, stakedDaysRaw] = stake;
      const lockedDay = Number(lockedDayRaw);
      const stakedDays = Number(stakedDaysRaw);
      const warnings = [
        'Yield calculation is not implemented for native HEX stakes yet.',
        'Pricing, valuation, and PnL are not implemented for HEX stakes yet.',
        'Ended stake discovery is not implemented yet.',
      ];
      if (partialWarning) warnings.push(partialWarning);
      return {
        stakeId: stakeId.toString(),
        stakeSource: 'native',
        stakeStatus: classifyStakeStatus(lockedDay, stakedDays, currentDay),
        chainId,
        assetId: HEX_ASSET_ID,
        contractAddress: HEX_CONTRACT_ADDRESS,
        lockedDay,
        stakedDays,
        unlockedDay: null,
        principalHex: formatUnits(stakedHearts, 8),
        stakeShares: stakeShares.toString(),
        tShares: formatUnits(stakeShares, 12),
        yieldHex: null,
        bpdYield: null,
        bpdYieldStatus: 'unknown',
        pricing: { status: 'unavailable', priceUsd: null, source: null, observedAt: null },
        valuation: { status: 'unavailable', valueUsd: null },
        pnl: { status: 'unavailable', realizedUsd: null, unrealizedUsd: null },
        warnings,
        provenance: {
          source: 'pulseport.hex-stakes.native-contract-reads-v1',
          observedAt: asOf,
          notes: ['chainId=369', 'methods=stakeCount,stakeLists,currentDay', `stakeIndex=${successfulStakes.length > 0 ? 'partial-or-full' : 'none'}`],
        },
      };
    });

    const totalPrincipalRaw = successfulStakes.reduce((acc, x) => acc + BigInt(x.stake[1]), 0n);
    const totalTSharesRaw = successfulStakes.reduce((acc, x) => acc + BigInt(x.stake[2]), 0n);

    const rootWarnings = [MIGRATION_WARNING, ...(partialWarning ? [partialWarning] : [])];
    const rootNotes = ['source=HEX contract reads', 'methods=stakeCount,stakeLists,currentDay', `chainId=${chainId}`, `asOf=${asOf}`];
    if (partialWarning) rootNotes.push(`failedStakeIndexes=${failedStakeIndexes.join(',')}`);

    return {
      schemaVersion: 'v1', walletAddress: normalizedWalletAddress, chainId, asOf,
      status: positions.length === 0 ? 'partial' : 'available',
      positions,
      summary: {
        activeStakeCount: positions.filter((p) => p.stakeStatus === 'active').length,
        endedStakeCount: 0,
        unsupportedStakeCount: 0,
        totalPrincipalHex: formatUnits(totalPrincipalRaw, 8),
        totalYieldHex: '0',
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
