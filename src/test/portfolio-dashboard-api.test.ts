import { describe, expect, it, vi } from 'vitest';

import handler from '../../api/portfolio/dashboard';
import * as serviceModule from '../server/portfolio/portfolio-service';
import type { PortfolioDashboardResponse } from '../server/portfolio/portfolio-types';

function createResponseRecorder() {
  let statusCode = 200;
  let payload: PortfolioDashboardResponse | null = null;

  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (body: PortfolioDashboardResponse) => {
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
  status: 'partial' as const,
  balances: [],
  warnings: ['test warning'],
  summary: {
    totalValueUsd: 0,
    pricedAssetCount: 0,
    unpricedAssetCount: 0,
    warnings: ['test warning'],
  },
};

describe('GET /api/portfolio/dashboard', () => {
  it('returns schemaVersion v1 for valid wallet requests', async () => {
    vi.spyOn(serviceModule, 'getPortfolioDashboard').mockResolvedValueOnce(baseDto);
    const recorder = createResponseRecorder();

    await handler({ method: 'GET', query: { walletAddress: baseDto.walletAddress } }, recorder.res);

    const { statusCode, payload } = recorder.getResult();
    expect(statusCode).toBe(200);
    expect(payload?.ok).toBe(true);
    expect(payload?.data?.schemaVersion).toBe('v1');
  });

  it('returns stable error response for missing walletAddress', async () => {
    const recorder = createResponseRecorder();
    await handler({ method: 'GET', query: {} }, recorder.res);

    const { statusCode, payload } = recorder.getResult();
    expect(statusCode).toBe(400);
    expect(payload).toEqual({
      ok: false,
      data: null,
      error: {
        code: 'invalid_wallet',
        message: 'walletAddress query parameter is required.',
      },
    });
  });

  it('returns stable backend failure response without internal details', async () => {
    vi.spyOn(serviceModule, 'getPortfolioDashboard').mockRejectedValueOnce(new Error('boom stack leak'));
    const recorder = createResponseRecorder();

    await handler({ method: 'GET', query: { walletAddress: baseDto.walletAddress } }, recorder.res);

    const { statusCode, payload } = recorder.getResult();
    expect(statusCode).toBe(503);
    expect(payload).toEqual({
      ok: false,
      data: null,
      error: {
        code: 'backend_unavailable',
        message: 'Portfolio backend is currently unavailable.',
      },
    });
  });

  it('includes explicit status and warnings fields in DTO', async () => {
    vi.spyOn(serviceModule, 'getPortfolioDashboard').mockResolvedValueOnce(baseDto);
    const recorder = createResponseRecorder();

    await handler(
      { method: 'GET', query: { walletAddress: baseDto.walletAddress, chainId: '369' } },
      recorder.res,
    );

    const { payload } = recorder.getResult();
    expect(payload?.data?.status).toBe('partial');
    expect(payload?.data?.warnings).toEqual(['test warning']);
    expect(payload?.data?.summary.warnings).toEqual(['test warning']);
  });
});
