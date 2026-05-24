import { describe, expect, it, vi } from 'vitest';

vi.mock('viem', () => ({
  isAddress: vi.fn((value: string) => /^0x[a-fA-F0-9]{40}$/.test(value)),
}));

import { getHexStakeDashboard } from '../server/hex-stakes/hex-stake-service';

describe('hex stake service dto contract', () => {
  const walletAddress = '0x0000000000000000000000000000000000000001';

  it('returns contract-stable placeholder dto with schemaVersion v1', async () => {
    const dto = await getHexStakeDashboard(walletAddress, 369);

    expect(dto.schemaVersion).toBe('v1');
    expect(dto.status).toBe('unavailable');
    expect(dto.positions).toEqual([]);
    expect(dto.summary.activeStakeCount).toBe(0);
    expect(dto.tShareMetrics.status).toBe('unavailable');
    expect(dto.warnings.length).toBeGreaterThan(0);
    expect(dto.provenance.source).toBe('pulseport.hex-stakes.contract-v1');
  });
});
