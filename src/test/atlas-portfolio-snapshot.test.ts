import { describe, expect, it } from 'vitest';

import { buildAtlasHomeSnapshot } from '../components/atlas/atlas-portfolio-snapshot';
import type { Asset, HexStake } from '../types';

const assets: Asset[] = [
  { id: 'pls', symbol: 'PLS', name: 'PulseChain', balance: 1_000_000, price: 0.00005, value: 50, chain: 'pulsechain', pnl24h: 10 },
  { id: 'plsx', symbol: 'PLSX', name: 'PulseX', balance: 8_000_000, price: 0.00001, value: 80, chain: 'pulsechain', pnl24h: -5 },
  { id: 'hex', symbol: 'HEX', name: 'HEX', balance: 2_000, price: 0.01, value: 20, chain: 'ethereum', pnl24h: 2 },
];

const richerAssets: Asset[] = [
  { id: 'pls', symbol: 'PLS', name: 'PulseChain', balance: 100, price: 0.01, value: 5_000, chain: 'pulsechain', pnl24h: 8 },
  { id: 'plsx', symbol: 'PLSX', name: 'PulseX', balance: 100, price: 0.01, value: 3_000, chain: 'pulsechain', pnl24h: -2 },
  { id: 'inc', symbol: 'INC', name: 'Incentive', balance: 100, price: 0.01, value: 1_500, chain: 'pulsechain', pnl24h: 4 },
  { id: 'hex', symbol: 'HEX', name: 'HEX', balance: 100, price: 0.01, value: 1_200, chain: 'pulsechain', pnl24h: 3 },
  { id: 'ehex', symbol: 'eHEX', name: 'eHEX', balance: 100, price: 0.01, value: 800, chain: 'pulsechain', pnl24h: -1 },
  { id: 'pdai', symbol: 'pDAI', name: 'DAI', balance: 100, price: 0.01, value: 300, chain: 'pulsechain', pnl24h: 0.5 },
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
    });

    expect(snapshot.headlineValue).toBe('$450');
    expect(snapshot.metrics.map(metric => metric.id)).toEqual(['change', 'stakes', 'lp', 'top']);
    expect(snapshot.metrics[0]).toMatchObject({ value: '+0.31%', subvalue: '+$1.40', tone: 'positive' });
    expect(snapshot.metrics[1]).toMatchObject({ value: '1', subvalue: '1 active' });
    expect(snapshot.metrics[2]).toMatchObject({ value: '$100', subvalue: '22.2% allocated' });
    expect(snapshot.metrics[3]).toMatchObject({ value: 'PLSX', subvalue: '$80.00', tone: 'negative' });
    expect(snapshot.signals[0].label).toBe('Top holding');
    expect(snapshot.signals[0].value).toBe('PLSX');
    expect(snapshot.signals[0]).toMatchObject({
      description: '$80.00 of current value',
      iconKey: 'holding',
    });
    expect(snapshot.tokens.map(token => token.symbol)).toEqual(['PLSX', 'PLS', 'HEX']);
    expect(snapshot.quickActions.map(action => action.label)).toEqual([
      'Portfolio insights',
      'Review transactions',
      'Rebalance planner',
      'Exit plan',
    ]);
    expect(snapshot.allocation.segments.map(item => item.label)).toEqual(['PLSX', 'PLS', 'HEX']);
    expect(snapshot.allocation.topWeights.map(item => item.label)).toEqual(['PLSX', 'PLS', 'HEX']);
    expect(snapshot.allocation.segments[0].width).toBeCloseTo(53.33, 2);
  });

  it('builds top-6 live prices, decision support actions, and hybrid allocation data', () => {
    const snapshot = buildAtlasHomeSnapshot({
      summary: { totalValue: 12_000, pnl24h: 320, pnl24hPercent: 2.74 },
      walletCount: 2,
      assets: richerAssets,
      stakes: [],
      getTokenIconUrl: (asset) => `/logos/${asset.symbol.toLowerCase()}.png`,
    });

    expect(snapshot.tokens).toHaveLength(6);
    expect(snapshot.tokens.map(token => token.symbol)).toEqual(['PLS', 'PLSX', 'INC', 'HEX', 'eHEX', 'pDAI']);
    expect(snapshot.quickActions.map(action => action.label)).toEqual([
      'Portfolio insights',
      'Review transactions',
      'Rebalance planner',
      'Exit plan',
    ]);
    expect(snapshot.allocation.segments.map(item => item.label)).toEqual(['PLS', 'PLSX', 'INC', 'HEX', 'eHEX', 'pDAI']);
    expect(snapshot.allocation.topWeights.map(item => item.label)).toEqual(['PLS', 'PLSX', 'INC', 'HEX']);
    expect(snapshot.allocation.topWeights[0]).toMatchObject({
      label: 'PLS',
      value: '$5.0K',
    });
    expect(snapshot.allocation.topWeights[0].percent).toBeCloseTo(42.37, 2);
    expect(snapshot.metrics.some(metric => metric.label === 'Noise')).toBe(false);
    expect(snapshot.tokens[0].iconUrl).toBe('/logos/pls.png');
  });

  it('keeps the empty wallet state honest instead of showing fake confidence', () => {
    const snapshot = buildAtlasHomeSnapshot({
      summary: { totalValue: 0, pnl24h: 0, pnl24hPercent: 0 },
      walletCount: 0,
      assets: [],
      stakes: [],
      lpValueUsd: 0,
      farmValueUsd: 0,
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
    });

    expect(snapshot.tokens.map(token => token.detailId)).toEqual([
      'token:plsx',
      'token:pls',
      'token:hex',
    ]);
    expect(snapshot.allocation.segments.map(item => item.detailId)).toEqual([
      'token:plsx',
      'token:pls',
      'token:hex',
    ]);
    expect(snapshot.allocation.topWeights.map(item => item.detailId)).toEqual([
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

  it('preserves a meaningful wallet value for positive sub-dollar holdings', () => {
    const snapshot = buildAtlasHomeSnapshot({
      summary: { totalValue: 0.42, pnl24h: 0, pnl24hPercent: 0 },
      walletCount: 1,
      assets: [
        { id: 'dust', symbol: 'DUST', name: 'Dust', balance: 42, price: 0.01, value: 0.42, chain: 'pulsechain' },
      ],
      stakes: [],
    });

    expect(snapshot.details['token:dust'].facts).toContainEqual({
      label: 'Your value',
      value: '$0.42',
    });
  });
});
