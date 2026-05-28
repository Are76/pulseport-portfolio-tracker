import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AtlasHoldingCard } from '../components/atlas/AtlasHoldingCard';
import { buildAtlasHoldingCards } from '../components/atlas/atlas-holding-card-model';
import { HoldingsTable, type HoldingDisplayAsset } from '../components/HoldingsTable';
import type { Asset } from '../types';

const assets: Asset[] = [
  { id: 'hex', symbol: 'HEX', name: 'HEX', balance: 1000, price: 0.01, value: 10, chain: 'pulsechain', pnl24h: 4 },
  { id: 'plsx', symbol: 'PLSX', name: 'PulseX', balance: 100000, price: 0.001, value: 100, chain: 'pulsechain', pnl24h: -2 },
  { id: 'inc', symbol: 'INC', name: 'Incentive', balance: 20, price: 1, value: 20, chain: 'pulsechain', priceChange7d: 8 },
];

describe('atlas holding card model', () => {
  it('sorts holdings by value and formats the card data for scanning', () => {
    const cards = buildAtlasHoldingCards({
      assets,
      totalValueUsd: 130,
      priceChangePeriod: '24h',
    });

    expect(cards.map(card => card.symbol)).toEqual(['PLSX', 'INC', 'HEX']);
    expect(cards[0]).toMatchObject({
      id: 'plsx',
      title: 'PulseX',
      value: '$100',
      price: '$0.001',
      change: '-2.00%',
      share: '76.9%',
      tone: 'negative',
    });
  });

  it('uses the selected period when choosing the change value', () => {
    const cards = buildAtlasHoldingCards({
      assets,
      totalValueUsd: 130,
      priceChangePeriod: '7d',
    });

    expect(cards.find(card => card.id === 'inc')?.change).toBe('+8.00%');
  });
});

describe('AtlasHoldingCard', () => {
  it('opens the selected holding when clicked', () => {
    const onSelect = vi.fn();

    render(
      <AtlasHoldingCard
        card={{
          id: 'plsx',
          title: 'PulseX',
          symbol: 'PLSX',
          chain: 'PulseChain',
          value: '$100',
          price: '$0.001',
          change: '-2.00%',
          share: '76.9%',
          balance: '100K',
          tone: 'negative',
        }}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /PulseX/i }));

    expect(onSelect).toHaveBeenCalledWith('plsx');
  });
});

describe('HoldingsTable Atlas card layer', () => {
  it('routes a top holding card to the token product page selection', () => {
    const onSelectAsset = vi.fn();
    const displayAssets: HoldingDisplayAsset[] = [{
      ...assets[1],
      priceUsd: assets[1].price,
      pricePls: 2,
      valueUsd: assets[1].value,
      valuePls: 200,
      leagueLabel: 'League',
      leagueRank: null,
      leagueSource: 'OpenPulseChain',
    }];

    render(
      <HoldingsTable
        assets={displayAssets}
        allAssets={displayAssets}
        wallets={[]}
        totalValueUsd={100}
        plsUsdPrice={0.0005}
        priceChangePeriod="24h"
        sortField="value"
        sortDir="desc"
        expandedIds={new Set()}
        tokenLogos={{}}
        emptyMessage="No holdings"
        currentTransactions={[]}
        manualEntries={{}}
        chainColors={{ pulsechain: '#37ff68' }}
        staticLogos={{}}
        getTokenLogoUrl={() => ''}
        explorerUrl={() => null}
        dexScreenerUrl={() => null}
        onSort={() => undefined}
        onToggleExpanded={() => undefined}
        onSelectAsset={onSelectAsset}
        onOpenPnl={() => undefined}
        onSetEntry={() => undefined}
        onClearEntry={() => undefined}
      />,
    );

    const topHoldings = screen.getByLabelText('Top holdings');
    fireEvent.click(within(topHoldings).getByRole('button', { name: /PulseX/i }));

    expect(onSelectAsset).toHaveBeenCalledWith(expect.objectContaining({ id: 'plsx' }));
  });
});
