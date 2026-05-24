import { describe, expect, it, vi } from 'vitest';

const mockReadContract = vi.fn();

vi.mock('viem', () => ({
  isAddress: vi.fn((value: string) => /^0x[a-fA-F0-9]{40}$/.test(value)),
  createPublicClient: vi.fn(() => ({ readContract: mockReadContract })),
  http: vi.fn(() => ({})),
  formatUnits: vi.fn((value: bigint, decimals: number) => {
    const base = 10n ** BigInt(decimals);
    const whole = value / base;
    const frac = value % base;
    if (frac === 0n) return whole.toString();
    return `${whole}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
  }),
}));

import { getHexStakeDashboard, HexStakeServiceError } from '../server/hex-stakes/hex-stake-service';

describe('hex stake service native contract reads', () => {
  const walletAddress = '0x0000000000000000000000000000000000000001';

  it('stakeCount=0 returns empty positions with partial status and warnings', async () => {
    mockReadContract.mockReset();
    mockReadContract.mockResolvedValueOnce(0n).mockResolvedValueOnce(100n);

    const dto = await getHexStakeDashboard(walletAddress, 369);
    expect(dto.status).toBe('partial');
    expect(dto.positions).toEqual([]);
    expect(dto.summary.activeStakeCount).toBe(0);
    expect(dto.warnings[0]).toContain('Native');
  });

  it('maps stake entries and status conversion pending/active/overdue', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(3n)
      .mockResolvedValueOnce(100n)
      .mockResolvedValueOnce([1n, 123456789n, 2500000000000n, 110n, 10n, 0n, false])
      .mockResolvedValueOnce([2n, 500000000n, 3000000000000n, 100n, 5n, 0n, false])
      .mockResolvedValueOnce([3n, 750000000n, 1000000000000n, 80n, 10n, 0n, false]);

    const dto = await getHexStakeDashboard(walletAddress, 369);
    expect(dto.positions).toHaveLength(3);
    expect(dto.positions[0].stakeStatus).toBe('pending');
    expect(dto.positions[1].stakeStatus).toBe('active');
    expect(dto.positions[2].stakeStatus).toBe('overdue');
    expect(dto.positions[0].principalHex).toBe('1.23456789');
    expect(dto.positions[0].stakeShares).toBe('2500000000000');
    expect(dto.positions[0].tShares).toBe('2.5');
    expect(dto.positions[0].pricing.status).toBe('unavailable');
    expect(dto.positions[0].valuation.status).toBe('unavailable');
    expect(dto.positions[0].pnl.status).toBe('unavailable');
    expect(dto.summary.activeStakeCount).toBe(3);
    expect(dto.summary.totalPrincipalHex).toBe('13.73456789');
    expect(dto.summary.totalTShares).toBe('6.5');
  });

  it('maps contract read failure to backend_unavailable', async () => {
    mockReadContract.mockReset();
    mockReadContract.mockRejectedValueOnce(new Error('rpc down'));

    await expect(getHexStakeDashboard(walletAddress, 369)).rejects.toMatchObject({
      code: 'backend_unavailable',
      message: 'HEX stakes backend is currently unavailable.',
    });
  });
});
