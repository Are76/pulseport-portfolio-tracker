import { isAddress } from 'viem';

import type { HexStakeDashboardDto } from './hex-stake-types';

const PULSECHAIN_ID = 369;

const NOT_IMPLEMENTED_WARNING =
  'HEX stake reads are not implemented yet; this endpoint currently returns a contract-stable placeholder DTO.';

export class HexStakeServiceError extends Error {
  public readonly cause: unknown;

  constructor(
    public readonly code: 'invalid_wallet' | 'unsupported_chain' | 'backend_unavailable',
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'HexStakeServiceError';
    this.cause = options?.cause;
  }
}

export async function getHexStakeDashboard(
  walletAddress: string,
  chainId = PULSECHAIN_ID,
): Promise<HexStakeDashboardDto> {
  if (!isAddress(walletAddress)) {
    throw new HexStakeServiceError('invalid_wallet', 'Invalid walletAddress format.');
  }

  if (chainId !== PULSECHAIN_ID) {
    throw new HexStakeServiceError('unsupported_chain', 'Only PulseChain (369) is supported in this API.');
  }

  try {
    const asOf = new Date().toISOString();
    const normalizedWalletAddress = walletAddress.toLowerCase();

    return {
      schemaVersion: 'v1',
      walletAddress: normalizedWalletAddress,
      chainId,
      asOf,
      status: 'unavailable',
      positions: [],
      summary: {
        activeStakeCount: 0,
        endedStakeCount: 0,
        unsupportedStakeCount: 0,
        totalPrincipalHex: '0',
        totalYieldHex: '0',
        totalTShares: '0',
        valuationStatus: 'unavailable',
        pnlStatus: 'unavailable',
        warnings: [NOT_IMPLEMENTED_WARNING],
      },
      tShareMetrics: {
        status: 'unavailable',
        shareRate: null,
        tSharePriceHex: null,
        tSharePriceUsd: null,
        activeTShares: '0',
        averagePaidUsdPerTShare: null,
        warnings: [NOT_IMPLEMENTED_WARNING],
      },
      warnings: [NOT_IMPLEMENTED_WARNING],
      provenance: {
        source: 'pulseport.hex-stakes.contract-v1',
        observedAt: asOf,
        notes: ['No live stake scanning, pricing, yield, or ended stake discovery is executed in this phase.'],
      },
    };
  } catch (error) {
    throw new HexStakeServiceError('backend_unavailable', 'HEX stakes backend is currently unavailable.', { cause: error });
  }
}
