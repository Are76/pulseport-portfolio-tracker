import { createPublicClient, formatEther, http, isAddress } from 'viem';

import { CHAINS } from '../../constants';
import type { PortfolioDashboardDto } from './portfolio-types';

export class PortfolioServiceError extends Error {
  constructor(
    public readonly code: 'invalid_wallet' | 'unsupported_chain' | 'backend_unavailable',
    message: string,
  ) {
    super(message);
  }
}

export async function getPortfolioDashboard(
  walletAddress: string,
  chainId = 369,
): Promise<PortfolioDashboardDto> {
  if (!isAddress(walletAddress)) {
    throw new PortfolioServiceError('invalid_wallet', 'Invalid walletAddress format.');
  }

  if (chainId !== 369) {
    throw new PortfolioServiceError('unsupported_chain', 'Only PulseChain (369) is supported in this API.');
  }

  const asOf = new Date().toISOString();

  try {
    const client = createPublicClient({
      transport: http(CHAINS.pulsechain.rpc),
    });

    const nativeBalance = await client.getBalance({ address: walletAddress });
    const quantity = formatEther(nativeBalance);

    return {
      schemaVersion: 'v1',
      walletAddress: walletAddress.toLowerCase(),
      chainId,
      asOf,
      status: 'partial',
      balances: [
        {
          assetId: 'native:369:pls',
          symbol: 'PLS',
          quantity,
          pricingStatus: 'unavailable',
          valuationStatus: 'unavailable',
          priceUsd: null,
          valueUsd: null,
        },
      ],
      warnings: ['Pricing and valuation are not yet migrated to backend in schema v1.'],
      summary: {
        totalValueUsd: 0,
        pricedAssetCount: 0,
        unpricedAssetCount: 1,
        warnings: ['Pricing and valuation are not yet migrated to backend in schema v1.'],
      },
    };
  } catch {
    throw new PortfolioServiceError('backend_unavailable', 'Portfolio backend is currently unavailable.');
  }
}
