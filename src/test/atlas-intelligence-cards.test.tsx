import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AtlasIntelligenceCard } from '../components/atlas/AtlasIntelligenceCard';
import { buildAtlasDefiSummaryCards, buildAtlasStakeSummaryCards } from '../components/atlas/atlas-intelligence-card-model';
import type { HexStake, LpPositionEnriched } from '../types';

const stake: HexStake = {
  id: 'stake-1',
  stakeId: 1,
  stakedHearts: 100000000000n,
  stakeShares: 2500000000000n,
  lockedDay: 100,
  stakedDays: 365,
  unlockedDay: 465,
  isAutoStake: false,
  progress: 88,
  estimatedValueUsd: 450,
  totalValueUsd: 510,
  chain: 'pulsechain',
  daysRemaining: 20,
  stakedHex: 1000,
  tShares: 2.5,
};

const lpPosition: LpPositionEnriched = {
  pairAddress: '0xlp',
  pairName: 'PLS / INC',
  token0Address: '0x0',
  token1Address: '0x1',
  token0Symbol: 'PLS',
  token1Symbol: 'INC',
  token0Decimals: 18,
  token1Decimals: 18,
  token0Amount: 100,
  token1Amount: 5,
  token0Usd: 50,
  token1Usd: 50,
  totalUsd: 100,
  lpBalance: 10,
  totalSupply: 1000,
  ownershipPct: 1,
  reserve0: 10000,
  reserve1: 500,
  token0PriceUsd: 0.5,
  token1PriceUsd: 10,
  ilEstimate: null,
  fees24hUsd: 4,
  volume24hUsd: 1200,
  isStaked: true,
  poolId: 2,
  pendingIncUsd: 12,
  walletLpBalance: 0,
  stakedLpBalance: 10,
  sparkline: [],
};

describe('Atlas intelligence card model', () => {
  it('builds stake cards that surface value, ending soon, and yield context', () => {
    const cards = buildAtlasStakeSummaryCards({
      stakes: [stake, { ...stake, id: 'stake-2', daysRemaining: 220, chain: 'ethereum' }],
      dailyYieldHex: 8,
      dailyYieldUsd: 0.64,
      maturityValueUsd: 1020,
    });

    expect(cards.map(card => card.id)).toEqual(['active-stakes', 'ending-soon', 'daily-yield', 'maturity']);
    expect(cards[0]).toMatchObject({ label: 'Active stakes', value: '2', target: 'all' });
    expect(cards[1]).toMatchObject({ label: 'Ending soon', value: '1', target: 'ending-soon', tone: 'negative' });
    expect(cards[2]).toMatchObject({ value: '8 HEX', subvalue: '$0.64 / day' });
  });

  it('builds DeFi cards that separate farming from wallet LP', () => {
    const cards = buildAtlasDefiSummaryCards({
      positions: [lpPosition, { ...lpPosition, pairAddress: '0xwallet', isStaked: false, totalUsd: 40, pendingIncUsd: 0 }],
      incPrice: 0.5,
    });

    expect(cards.map(card => card.id)).toEqual(['defi-value', 'farms', 'wallet-lp', 'pending-inc']);
    expect(cards[0]).toMatchObject({ value: '$140', target: 'all' });
    expect(cards[1]).toMatchObject({ value: '1', target: 'farm' });
    expect(cards[2]).toMatchObject({ value: '1', target: 'lp' });
    expect(cards[3]).toMatchObject({ value: '$12.00' });
  });
});

describe('AtlasIntelligenceCard', () => {
  it('calls onSelect with its target', () => {
    const onSelect = vi.fn();

    render(
      <AtlasIntelligenceCard
        card={{ id: 'ending-soon', label: 'Ending soon', value: '1', subvalue: 'Needs attention', tone: 'negative', target: 'ending-soon' }}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Ending soon/i }));

    expect(onSelect).toHaveBeenCalledWith('ending-soon');
  });
});
