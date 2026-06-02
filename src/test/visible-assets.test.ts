import { describe, expect, it } from 'vitest';

import type { Asset } from '../types';
import { filterVisibleAssets } from '../utils/visibleAssets';

describe('filterVisibleAssets', () => {
  it('keeps forced-visible community symbols out of spam-only hiding', () => {
    const assets: Asset[] = [
      {
        id: 'pulsechain-pcock',
        symbol: 'PCOCK',
        name: 'Peacock',
        balance: 2500,
        price: 0,
        value: 125,
        chain: 'pulsechain',
        pnl24h: 0,
      } as Asset,
      {
        id: 'pulsechain-spam',
        symbol: 'SPAM',
        name: 'Spam',
        balance: 5000,
        price: 0,
        value: 125,
        chain: 'pulsechain',
        pnl24h: 0,
      } as Asset,
      {
        id: 'pulsechain-spoofed',
        symbol: 'PCOCK',
        name: 'Copycat',
        balance: 2500,
        price: 0,
        value: 125,
        chain: 'pulsechain',
        pnl24h: 0,
      } as Asset,
    ];

    const visible = filterVisibleAssets(assets.map((asset) => ({
      ...asset,
      isSpam: asset.symbol === 'SPAM',
    })) as Asset[], {
      hiddenTokens: [],
      hideDust: true,
      hideSpam: true,
      spamTokenIds: ['pulsechain-pcock', 'pulsechain-spam', 'pulsechain-spoofed'],
    });

    expect(visible.map((asset) => asset.id)).toEqual(['pulsechain-pcock']);
  });
});
