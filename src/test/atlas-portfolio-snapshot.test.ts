import { describe, expect, it } from 'vitest';

import { buildAtlasHomeSnapshot } from '../components/atlas/atlas-portfolio-snapshot';
import type { Asset, HexStake } from '../types';

const assets: Asset[] = [
  { id: 'pls', symbol: 'PLS', name: 'PulseChain', balance: 1_000_000, price: 0.00005, value: 50, chain: 'pulsechain', pnl24h: 10 },
  { id: 'plsx', symbol: 'PLSX', name: 'PulseX', balance: 8_000_000, price: 0.00001, value: 80, chain: 'pulsechain', pnl24h: -5 },
  { id: 'hex', symbol: 'HEX', name: 'HEX', balance: 2_000, price: 0.01, value: 20, chain: 'ethereum', pnl24h: 2 },
];

const activeStake: HexStake = {
  id: 'stake-1',
  stakeId: 1,
  stakedHearts: 100000000000n,
  stakeShares: 1000000000000n,
  lockedDay: 100,
  stakedDays: 365,
  unlockedDay: 465,
  isAutoStake: false,
  progress: 80,
  estimatedValueUsd: 250,
  chain: 'pulsechain',
  daysRemaining: 42,
};

describe('atlas portfolio snapshot', () => {
  it('builds headline, metric, signal, token, and allocation data from real inputs', () => {
    const snapshot = buildAtlasHomeSnapshot({
      summary: { totalValue: 450, pnl24h: 1.4, pnl24hPercent: 0.31 },
      walletCount: 2,
      assets,
      stakes: [activeStake],
      lpValueUsd: 75,
      farmValueUsd: 25,
      hiddenTokenCount: 3,
    });

    expect(snapshot.headlineValue).toBe('$450');
    expect(snapshot.metrics.map(metric => metric.id)).toEqual(['change', 'stakes', 'lp', 'noise']);
    expect(snapshot.metrics[0]).toMatchObject({ value: '+0.31%', subvalue: '+$1.40', tone: 'positive' });
    expect(snapshot.metrics[1]).toMatchObject({ value: '1', subvalue: '1 active' });
    expect(snapshot.metrics[2]).toMatchObject({ value: '$100', subvalue: '22.2%' });
    expect(snapshot.signals[0].label).toBe('Top holding');
    expect(snapshot.signals[0].value).toBe('PLSX');
    expect(snapshot.tokens.map(token => token.symbol)).toEqual(['PLSX', 'PLS', 'HEX']);
    expect(snapshot.allocation.map(item => item.label)).toEqual(['PLSX', 'PLS', 'HEX']);
    expect(snapshot.allocation[0].width).toBeCloseTo(53.33, 2);
  });

  it('keeps the empty wallet state honest instead of showing fake confidence', () => {
    const snapshot = buildAtlasHomeSnapshot({
      summary: { totalValue: 0, pnl24h: 0, pnl24hPercent: 0 },
      walletCount: 0,
      assets: [],
      stakes: [],
      lpValueUsd: 0,
      farmValueUsd: 0,
      hiddenTokenCount: 0,
    });

    expect(snapshot.headlineValue).toBe('$0');
    expect(snapshot.eyebrow).toBe('Add wallet');
    expect(snapshot.metrics[1]).toMatchObject({ value: '0', subvalue: 'connect wallet' });
    expect(snapshot.tokens).toHaveLength(0);
    expect(snapshot.emptyTokenMessage).toBe('Add a wallet to see your largest holdings here.');
  });

  it('creates exact token and allocation drilldowns from live assets', () => {
    const snapshot = buildAtlasHomeSnapshot({
      summary: { totalValue: 450, pnl24h: 1.4, pnl24hPercent: 0.31 },
      walletCount: 2,
      assets,
      stakes: [],
      hiddenTokenCount: 0,
    });

    expect(snapshot.tokens.map(token => token.detailId)).toEqual([
      'token:plsx',
      'token:pls',
      'token:hex',
    ]);
    expect(snapshot.allocation.map(item => item.detailId)).toEqual([
      'token:plsx',
      'token:pls',
      'token:hex',
    ]);
    expect(snapshot.details['token:hex']).toMatchObject({
      id: 'token:hex',
      title: 'HEX',
    });
    expect(snapshot.details['token:hex'].actions[0]).toMatchObject({
      target: 'product:hex',
    });
  });
});
