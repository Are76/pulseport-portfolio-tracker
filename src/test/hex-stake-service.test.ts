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

import { getHexStakeDashboard } from '../server/hex-stakes/hex-stake-service';

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
    expect(dto.summary.activeStakeCount).toBe(1);
    expect(dto.summary.totalPrincipalHex).toBe('13.73456789');
    expect(dto.summary.totalTShares).toBe('6.5');
  });

  it('returns partial success when one stakeLists index fails', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(3n)
      .mockResolvedValueOnce(100n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 100n, 10n, 0n, false])
      .mockRejectedValueOnce(new Error('stake idx 1 failed'))
      .mockResolvedValueOnce([3n, 300000000n, 3000000000000n, 80n, 10n, 0n, false]);

    const dto = await getHexStakeDashboard(walletAddress, 369);
    expect(dto.positions).toHaveLength(2);
    expect(dto.status).toBe('available');
    expect(dto.warnings.some((w) => w.includes('Partial native stake read'))).toBe(true);
    expect(dto.provenance.notes?.some((n) => n.includes('failedStakeIndexes='))).toBe(true);
  });

  it('fails with backend_unavailable when all stakeLists reads fail', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(2n)
      .mockResolvedValueOnce(100n)
      .mockRejectedValueOnce(new Error('idx0'))
      .mockRejectedValueOnce(new Error('idx1'));

    await expect(getHexStakeDashboard(walletAddress, 369)).rejects.toMatchObject({
      code: 'backend_unavailable',
      message: 'HEX stakes backend is currently unavailable.',
    });
  });

  it('uses bounded/conservative stakeLists read batching', async () => {
    mockReadContract.mockReset();
    let inFlight = 0;
    let maxInFlight = 0;

    mockReadContract.mockImplementation(({ functionName, args }: { functionName: string; args?: unknown[] }) => {
      if (functionName === 'stakeCount') return Promise.resolve(25n);
      if (functionName === 'currentDay') return Promise.resolve(100n);
      if (functionName === 'stakeLists') {
        const idx = Number(args?.[1] as bigint);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        return new Promise((resolve) => {
          setTimeout(() => {
            inFlight -= 1;
            resolve([BigInt(idx + 1), 100000000n, 1000000000000n, 100n, 1n, 0n, false]);
          }, 1);
        });
      }
      return Promise.reject(new Error('unexpected call'));
    });

    const dto = await getHexStakeDashboard(walletAddress, 369);
    expect(dto.positions).toHaveLength(25);
    expect(maxInFlight).toBeLessThanOrEqual(10);
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
