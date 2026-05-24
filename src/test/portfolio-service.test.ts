import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetBalance = vi.fn();
const mockReadContract = vi.fn();

vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    getBalance: mockGetBalance,
    readContract: mockReadContract,
  })),
  http: vi.fn(() => ({})),
  isAddress: vi.fn((value: string) => /^0x[a-fA-F0-9]{40}$/.test(value)),
  formatEther: vi.fn(() => '1.0'),
  formatUnits: vi.fn(() => '2.0'),
}));

import { getPortfolioDashboard } from '../server/portfolio/portfolio-service';

describe('portfolio service dashboard dto', () => {
  const walletAddress = '0x0000000000000000000000000000000000000001';

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBalance.mockResolvedValue(123n);
  });

  it('keeps native PLS balance and explicit unavailable pricing/valuation statuses', async () => {
    mockReadContract.mockResolvedValue(456n);

    const dto = await getPortfolioDashboard(walletAddress, 369);

    const native = dto.balances.find((balance) => balance.assetId === 'native:369:pls');
    expect(native).toBeDefined();
    expect(native?.chainId).toBe(369);
    expect(native?.address).toBe('native');
    expect(native?.pricingStatus).toBe('unavailable');
    expect(native?.valuationStatus).toBe('unavailable');
    expect(native?.priceUsd).toBeNull();
    expect(native?.valueUsd).toBeNull();
  });

  it('adds known ERC20 balances keyed by contract address identity', async () => {
    mockReadContract.mockResolvedValue(789n);

    const dto = await getPortfolioDashboard(walletAddress, 369);

    const plsx = dto.balances.find((balance) => balance.address === '0x95b303987a60c71504d99aa1b13b4da07b0790ab');
    expect(plsx).toBeDefined();
    expect(plsx?.assetId).toBe('erc20:369:0x95b303987a60c71504d99aa1b13b4da07b0790ab');
    expect(plsx?.symbol).toBe('PLSX');
    expect(plsx?.name).toBe('PulseX');
  });

  it('continues building DTO when one token balance fetch fails', async () => {
    mockReadContract
      .mockResolvedValueOnce(111n)
      .mockRejectedValueOnce(new Error('token read failed'));

    const dto = await getPortfolioDashboard(walletAddress, 369);

    expect(dto.balances.some((balance) => balance.assetId === 'native:369:pls')).toBe(true);
    expect(dto.balances.some((balance) => balance.assetId === 'erc20:369:0x95b303987a60c71504d99aa1b13b4da07b0790ab')).toBe(true);
    expect(dto.balances.some((balance) => balance.assetId === 'erc20:369:0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d')).toBe(false);
  });

  it('sets summary unpriced count to include native and fetched ERC20 balances', async () => {
    mockReadContract.mockResolvedValue(222n);

    const dto = await getPortfolioDashboard(walletAddress, 369);

    expect(dto.summary.pricedAssetCount).toBe(0);
    expect(dto.summary.unpricedAssetCount).toBe(dto.balances.length);
  });
});
