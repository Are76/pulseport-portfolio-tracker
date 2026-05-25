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

const testWalletAddress = '0x0000000000000000000000000000000000000001';

describe('hex stake service native contract reads', () => {
  const walletAddress = testWalletAddress;

  it('stakeCount=0 returns empty positions with partial status and warnings', async () => {
    mockReadContract.mockReset();
    mockReadContract.mockResolvedValueOnce(0n).mockResolvedValueOnce(100n);

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
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
      .mockResolvedValueOnce([3n, 750000000n, 1000000000000n, 80n, 10n, 0n, false])
      .mockResolvedValueOnce(Array.from({ length: 20 }, () => [100000000n, 1000000000000n, 0n]));

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    expect(dto.positions).toHaveLength(3);
    expect(dto.positions[0].stakeStatus).toBe('pending');
    expect(dto.positions[1].stakeStatus).toBe('active');
    expect(dto.positions[2].stakeStatus).toBe('overdue');
    expect(dto.positions[0].principalHex).toBe('1.23456789');
    expect(dto.positions[0].stakeShares).toBe('2500000000000');
    expect(dto.positions[0].tShares).toBe('2.5');
    expect(dto.positions[0].yieldHex).toBe('0');
    expect(dto.positions[1].yieldHex).toBe('0');
    expect(dto.positions[2].yieldHex).toBe('10');
    expect(dto.positions[0].warnings.some((w) => w.includes('Pending stake has no realized yield'))).toBe(true);
    expect(dto.positions[0].provenance.notes?.some((n) => n.includes('yield.pending=no-realized-yield'))).toBe(true);
    expect(dto.positions[0].pricing.status).toBe('unavailable');
    expect(dto.positions[0].valuation.status).toBe('unavailable');
    expect(dto.positions[0].pnl.status).toBe('unavailable');
    expect(dto.summary.activeStakeCount).toBe(1);
    expect(dto.summary.totalPrincipalHex).toBe('13.73456789');
    expect(dto.summary.totalTShares).toBe('6.5');
    expect(dto.summary.totalYieldHex).toBe('10');
  });

  it('returns partial success when one stakeLists index fails', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(3n)
      .mockResolvedValueOnce(100n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 100n, 10n, 0n, false])
      .mockRejectedValueOnce(new Error('stake idx 1 failed'))
      .mockResolvedValueOnce([3n, 300000000n, 3000000000000n, 80n, 10n, 0n, false])
      .mockResolvedValueOnce(Array.from({ length: 20 }, () => [100000000n, 1000000000000n, 0n]));

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
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

    await expect(getHexStakeDashboard(testWalletAddress, 369)).rejects.toMatchObject({
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
      if (functionName === 'dailyDataRange') return Promise.resolve(Array.from({ length: 1 }, () => [100000000n, 1000000000000n, 0n]));
      return Promise.reject(new Error('unexpected call'));
    });

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    expect(dto.positions).toHaveLength(25);
    expect(maxInFlight).toBeLessThanOrEqual(10);
  });

  it('maps contract read failure to backend_unavailable', async () => {
    mockReadContract.mockReset();
    mockReadContract.mockRejectedValueOnce(new Error('rpc down'));

    await expect(getHexStakeDashboard(testWalletAddress, 369)).rejects.toMatchObject({
      code: 'backend_unavailable',
      message: 'HEX stakes backend is currently unavailable.',
    });
  });

  it('keeps yield 0 when dailyDataRange fails', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(100n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 90n, 5n, 0n, false])
      .mockRejectedValueOnce(new Error('dailyDataRange failed'));

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    expect(dto.positions[0].yieldHex).toBe('0');
    expect(dto.positions[0].warnings.some((w) => w.includes('dailyDataRange call failed'))).toBe(true);
    expect(dto.positions[0].warnings.filter((w) => w.includes('dailyData missing for day')).length).toBe(0);
  });

  it('preserves bigint precision for yield math', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(10n)
      .mockResolvedValueOnce([1n, 100000000n, 1234567890123456n, 1n, 5n, 0n, false])
      .mockResolvedValueOnce(Array.from({ length: 9 }, () => [98765432109876n, 3333333333333333n, 0n]));

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    expect(dto.positions[0].yieldHex).not.toBe('0');
    expect(dto.positions[0].yieldHex?.includes('e')).toBe(false);
  });


  it('warns when dailyDataRange response is incomplete and does not fabricate missing-day yield', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(100n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 90n, 10n, 0n, false])
      .mockResolvedValueOnce(Array.from({ length: 5 }, () => [100000000n, 1000000000000n, 0n]));

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    expect(dto.positions[0].warnings.some((w) => w.includes('dailyDataRange returned incomplete data'))).toBe(true);
    expect(dto.positions[0].warnings.some((w) => w.includes('dailyData missing for day'))).toBe(true);
    expect(dto.positions[0].yieldHex).toBe('5');
    expect(dto.summary.totalYieldHex).toBe('5');
  });


  it('overdue stake yield stops accruing at maturityDay', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(120n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 100n, 2n, 0n, false])
      .mockResolvedValueOnce(Array.from({ length: 20 }, () => [100000000n, 1000000000000n, 0n]));

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    expect(dto.positions[0].stakeStatus).toBe('overdue');
    expect(dto.positions[0].yieldHex).toBe('2');
    expect(dto.summary.totalYieldHex).toBe('2');
  });

  it('bounds dailyDataRange end day to latest actually-required stake day', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(2n)
      .mockResolvedValueOnce(500n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 100n, 2n, 0n, false])
      .mockResolvedValueOnce([2n, 100000000n, 1000000000000n, 120n, 1n, 0n, false])
      .mockResolvedValueOnce(Array.from({ length: 21 }, () => [100000000n, 1000000000000n, 0n]));

    await getHexStakeDashboard(testWalletAddress, 369);
    const dailyDataRangeCall = mockReadContract.mock.calls.find((call) => call[0]?.functionName === 'dailyDataRange');
    expect(dailyDataRangeCall?.[0]?.args).toEqual([100n, 121n]);
  });

  it('overdue short-term stake does not expand dailyDataRange to latestYieldDay', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(1000n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 10n, 3n, 0n, false])
      .mockResolvedValueOnce(Array.from({ length: 3 }, () => [100000000n, 1000000000000n, 0n]));

    await getHexStakeDashboard(testWalletAddress, 369);
    const dailyDataRangeCall = mockReadContract.mock.calls.find((call) => call[0]?.functionName === 'dailyDataRange');
    expect(dailyDataRangeCall?.[0]?.args).toEqual([10n, 13n]);
  });

  it('global dailyDataRange failure produces bounded warning output for long stakes', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(4000n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 1n, 3000n, 0n, false])
      .mockRejectedValueOnce(new Error('dailyDataRange failed'));

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    const positionWarnings = dto.positions[0].warnings;
    expect(positionWarnings.filter((w) => w.includes('dailyDataRange call failed')).length).toBe(1);
    expect(positionWarnings.filter((w) => w.includes('dailyData missing for day')).length).toBe(0);
    expect(positionWarnings.length).toBeLessThan(10);
  });

  it('lockedDay equals currentDay yields zero and no false missing-data warning', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(100n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 100n, 10n, 0n, false])
      .mockResolvedValueOnce(Array.from({ length: 1 }, () => [100000000n, 1000000000000n, 0n]));

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    expect(dto.positions[0].yieldHex).toBe('0');
    expect(dto.positions[0].warnings.some((w) => w.includes('dailyData missing for day'))).toBe(false);
  });


  it('locks full native lifecycle yield/status/summary invariants in one deterministic fixture', async () => {
    mockReadContract.mockReset();
    const dayRows = Array.from({ length: 25 }, () => [100000000n, 1000000000000n, 0n]);

    mockReadContract
      .mockResolvedValueOnce(5n)
      .mockResolvedValueOnce(105n)
      .mockResolvedValueOnce([11n, 100000000n, 1000000000000n, 106n, 5n, 0n, false])
      .mockResolvedValueOnce([12n, 100000000n, 1000000000000n, 100n, 10n, 0n, false])
      .mockResolvedValueOnce([13n, 100000000n, 1000000000000n, 90n, 10n, 0n, false])
      .mockResolvedValueOnce([14n, 100000000n, 1000000000000n, 80n, 20n, 95n, false])
      .mockResolvedValueOnce([15n, 100000000n, 1000000000000n, 70n, 15n, 0n, true])
      .mockResolvedValueOnce(dayRows);

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    expect(dto.positions).toHaveLength(5);

    const pending = dto.positions.find((position) => position.stakeStatus === 'pending');
    const active = dto.positions.find((position) => position.stakeStatus === 'active');
    const overdue = dto.positions.find((position) => position.stakeStatus === 'overdue');
    const ended = dto.positions.find((position) => position.stakeStatus === 'ended');

    expect(pending).toBeDefined();
    expect(active).toBeDefined();
    expect(overdue).toBeDefined();
    expect(ended).toBeDefined();

    expect(pending!.stakeStatus).toBe('pending');
    expect(pending!.yieldHex).toBe('0');
    expect(pending!.warnings.some((w) => w.includes('Pending stake has no realized yield'))).toBe(true);
    expect(pending!.provenance.notes?.some((n) => n.includes('yield.pending=no-realized-yield'))).toBe(true);

    expect(active!.stakeStatus).toBe('active');
    expect(active!.yieldHex).toMatch(/^\d+/);

    expect(overdue!.stakeStatus).toBe('overdue');
    expect(overdue!.yieldHex).toMatch(/^\d+/);

    expect(ended!.stakeStatus).toBe('ended');
    expect(ended!.unlockedDay).toBe(95);
    expect(ended!.endedDaysAgo).toBe(10);
    expect(ended!.yieldHex).toMatch(/^\d+/);

    expect(dto.summary.activeStakeCount).toBe(1);
    expect(dto.summary.endedStakeCount).toBe(1);
    const summedYield = dto.positions.reduce((acc, position) => acc + Number(position.yieldHex ?? '0'), 0);
    expect(Number(dto.summary.totalYieldHex)).toBe(summedYield);
    expect(dto.summary.valuationStatus).toBe('unavailable');
    expect(dto.summary.pnlStatus).toBe('unavailable');

    for (const position of dto.positions) {
      expect(position.pricing.status).toBe('unavailable');
      expect(position.valuation.status).toBe('unavailable');
      expect(position.pnl.status).toBe('unavailable');
    }

    const dailyDataRangeCall = mockReadContract.mock.calls.find((call) => call[0]?.functionName === 'dailyDataRange');
    expect(dailyDataRangeCall?.[0]?.args).toEqual([70n, 105n]);
  });

  it('active stake uses completed in-term days only', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(105n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 100n, 10n, 0n, false])
      .mockResolvedValueOnce(Array.from({ length: 5 }, () => [100000000n, 1000000000000n, 0n]));

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    expect(dto.positions[0].stakeStatus).toBe('active');
    expect(dto.positions[0].yieldHex).toBe('5');
    expect(dto.summary.totalYieldHex).toBe('5');
  });

  it('classifies unlocked native stake as ended and stops yield at unlockedDay', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(110n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 90n, 20n, 100n, false])
      .mockResolvedValueOnce(Array.from({ length: 10 }, () => [100000000n, 1000000000000n, 0n]));

    const dto = await getHexStakeDashboard(testWalletAddress, 369);
    expect(dto.positions[0].stakeStatus).toBe('ended');
    expect(dto.positions[0].unlockedDay).toBe(100);
    expect(dto.positions[0].endedDaysAgo).toBe(10);
    expect(dto.positions[0].yieldHex).toBe('10');
    expect(dto.positions[0].warnings.some((w) => w.includes('capped at unlockedDay'))).toBe(true);
    expect(dto.summary.endedStakeCount).toBe(1);
    expect(dto.summary.activeStakeCount).toBe(0);
  });

  it('ended stake dailyDataRange window is bounded by unlockedDay', async () => {
    mockReadContract.mockReset();
    mockReadContract
      .mockResolvedValueOnce(1n)
      .mockResolvedValueOnce(500n)
      .mockResolvedValueOnce([1n, 100000000n, 1000000000000n, 100n, 500n, 121n, false])
      .mockResolvedValueOnce(Array.from({ length: 21 }, () => [100000000n, 1000000000000n, 0n]));

    await getHexStakeDashboard(testWalletAddress, 369);
    const dailyDataRangeCall = mockReadContract.mock.calls.find((call) => call[0]?.functionName === 'dailyDataRange');
    expect(dailyDataRangeCall?.[0]?.args).toEqual([100n, 121n]);
  });

});
