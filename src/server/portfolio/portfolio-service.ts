import { createPublicClient, formatEther, formatUnits, http, isAddress } from 'viem';

import { CHAINS } from '../../constants';
import type { PortfolioDashboardDto } from './portfolio-types';

const ERC20_BALANCE_OF_ABI = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const KNOWN_PULSECHAIN_TOKENS = [
  {
    assetId: 'erc20:369:0x95b303987a60c71504d99aa1b13b4da07b0790ab',
    address: '0x95b303987a60c71504d99aa1b13b4da07b0790ab',
    symbol: 'PLSX',
    name: 'PulseX',
    decimals: 18,
  },
  {
    assetId: 'erc20:369:0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d',
    address: '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d',
    symbol: 'INC',
    name: 'Incentive',
    decimals: 18,
  },
] as const;

export class PortfolioServiceError extends Error {
  public readonly cause: unknown;

  constructor(
    public readonly code: 'invalid_wallet' | 'unsupported_chain' | 'backend_unavailable',
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = 'PortfolioServiceError';
    this.cause = options?.cause;
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

    const erc20Balances = await Promise.all(
      KNOWN_PULSECHAIN_TOKENS.map(async (token) => {
        try {
          const rawBalance = await client.readContract({
            address: token.address,
            abi: ERC20_BALANCE_OF_ABI,
            functionName: 'balanceOf',
            args: [walletAddress],
          });

          return {
            assetId: token.assetId,
            chainId,
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            quantity: formatUnits(rawBalance, token.decimals),
            pricingStatus: 'unavailable' as const,
            valuationStatus: 'unavailable' as const,
            priceUsd: null,
            valueUsd: null,
          };
        } catch {
          return null;
        }
      }),
    );

    const balances = [
      {
        assetId: 'native:369:pls',
        chainId,
        address: 'native',
        symbol: 'PLS',
        name: 'PulseChain',
        quantity,
        pricingStatus: 'unavailable' as const,
        valuationStatus: 'unavailable' as const,
        priceUsd: null,
        valueUsd: null,
      },
      ...erc20Balances.filter((balance) => balance !== null),
    ];

    const migrationWarning = 'Pricing and valuation are not yet migrated to backend in schema v1.';
    const tokenWarning = 'Known PulseChain ERC20 balances are backend-fetched by contract address; pricing and valuation remain unavailable.';

    return {
      schemaVersion: 'v1',
      walletAddress: walletAddress.toLowerCase(),
      chainId,
      asOf,
      status: 'partial',
      balances,
      warnings: [migrationWarning, tokenWarning],
      summary: {
        totalValueUsd: 0,
        pricedAssetCount: 0,
        unpricedAssetCount: balances.length,
        warnings: [migrationWarning, tokenWarning],
      },
    };
  } catch (error) {
    throw new PortfolioServiceError('backend_unavailable', 'Portfolio backend is currently unavailable.', { cause: error });
  }
}
