import { describe, expect, it, vi } from 'vitest';

import handler from '../../api/hex-stakes/dashboard';
import * as serviceModule from '../server/hex-stakes/hex-stake-service';
import type { HexStakeDashboardResponse } from '../server/hex-stakes/hex-stake-types';

function createResponseRecorder() {
  let statusCode = 200;
  let payload: HexStakeDashboardResponse | null = null;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (body: HexStakeDashboardResponse) => {
      payload = body;
    },
    setHeader: () => undefined,
  };

  return {
    res,
    getResult: () => ({ statusCode, payload }),
  };
}

const baseDto = {
  schemaVersion: 'v1' as const,
  walletAddress: '0x0000000000000000000000000000000000000001',
  chainId: 369,
  asOf: new Date().toISOString(),
  status: 'unavailable' as const,
  positions: [],
  summary: {
    activeStakeCount: 0,
    endedStakeCount: 0,
    unsupportedStakeCount: 0,
    totalPrincipalHex: '0',
    totalYieldHex: '0',
    totalTShares: '0',
    valuationStatus: 'unavailable' as const,
    pnlStatus: 'unavailable' as const,
    warnings: ['not implemented'],
  },
  tShareMetrics: {
    status: 'unavailable' as const,
    shareRate: null,
    tSharePriceHex: null,
    tSharePriceUsd: null,
    activeTShares: '0',
    averagePaidUsdPerTShare: null,
    warnings: ['not implemented'],
  },
  warnings: ['not implemented'],
  provenance: {
    source: 'pulseport.hex-stakes.contract-v1',
    observedAt: new Date().toISOString(),
    notes: ['not implemented'],
  },
};

describe('GET /api/hex-stakes/dashboard', () => {
  it('returns schemaVersion v1 for valid wallet requests', async () => {
    vi.spyOn(serviceModule, 'getHexStakeDashboard').mockResolvedValueOnce(baseDto);
    const recorder = createResponseRecorder();

    await handler({ method: 'GET', query: { walletAddress: baseDto.walletAddress } }, recorder.res);

    const { statusCode, payload } = recorder.getResult();
    expect(statusCode).toBe(200);
    expect(payload).not.toBeNull();
    expect(payload?.ok).toBe(true);
    if (!payload || !payload.ok) throw new Error('Expected success response');
    expect(payload.data.schemaVersion).toBe('v1');
  });

  it('uses discriminated envelope by ok', async () => {
    vi.spyOn(serviceModule, 'getHexStakeDashboard').mockResolvedValueOnce(baseDto);
    const recorder = createResponseRecorder();

    await handler({ method: 'GET', query: { walletAddress: baseDto.walletAddress } }, recorder.res);

    const { payload } = recorder.getResult();
    if (!payload) throw new Error('Expected payload');
    if (payload.ok) {
      expect(payload.error).toBeNull();
      expect(payload.data).toBeDefined();
    } else {
      expect(payload.data).toBeNull();
      expect(payload.error).toBeDefined();
    }
  });

  it('returns stable error response for missing walletAddress', async () => {
    const recorder = createResponseRecorder();
    await handler({ method: 'GET', query: {} }, recorder.res);

    expect(recorder.getResult()).toEqual({
      statusCode: 400,
      payload: {
        ok: false,
        data: null,
        error: {
          code: 'invalid_wallet',
          message: 'walletAddress query parameter is required.',
        },
      },
    });
  });

  it.each(['369abc', '369.5', 'abc'])('returns invalid_chain_id for malformed chainId=%s', async (chainId) => {
    const recorder = createResponseRecorder();

    await handler({ method: 'GET', query: { walletAddress: baseDto.walletAddress, chainId } }, recorder.res);

    expect(recorder.getResult()).toEqual({
      statusCode: 400,
      payload: {
        ok: false,
        data: null,
        error: {
          code: 'invalid_chain_id',
          message: 'chainId must be an integer.',
        },
      },
    });
  });

  it('defaults missing chainId to 369', async () => {
    const spy = vi.spyOn(serviceModule, 'getHexStakeDashboard').mockResolvedValueOnce(baseDto);
    const recorder = createResponseRecorder();

    await handler({ method: 'GET', query: { walletAddress: baseDto.walletAddress } }, recorder.res);

    expect(spy).toHaveBeenCalledWith(baseDto.walletAddress, 369);
  });

  it('returns unsupported_chain for unsupported chainId', async () => {
    const recorder = createResponseRecorder();

    await handler({ method: 'GET', query: { walletAddress: baseDto.walletAddress, chainId: '1' } }, recorder.res);

    expect(recorder.getResult()).toEqual({
      statusCode: 400,
      payload: {
        ok: false,
        data: null,
        error: {
          code: 'unsupported_chain',
          message: 'Only PulseChain (369) is supported in this API.',
        },
      },
    });
  });

  it('success response includes empty positions, summary, tShareMetrics, warnings, and provenance', async () => {
    vi.spyOn(serviceModule, 'getHexStakeDashboard').mockResolvedValueOnce(baseDto);
    const recorder = createResponseRecorder();

    await handler({ method: 'GET', query: { walletAddress: baseDto.walletAddress, chainId: '369' } }, recorder.res);

    const { payload } = recorder.getResult();
    expect(payload).not.toBeNull();
    expect(payload?.ok).toBe(true);
    if (!payload || !payload.ok) throw new Error('Expected success response');

    expect(payload.data.positions).toEqual([]);
    expect(payload.data.summary).toBeDefined();
    expect(payload.data.tShareMetrics).toBeDefined();
    expect(payload.data.warnings.length).toBeGreaterThan(0);
    expect(payload.data.provenance).toBeDefined();
  });
});
