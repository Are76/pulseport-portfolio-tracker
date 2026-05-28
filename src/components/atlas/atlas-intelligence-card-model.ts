import type { HexStake, LpPositionEnriched } from '../../types';
import type { AtlasTone } from './atlas-types';

export type AtlasIntelligenceCardData = {
  id: string;
  label: string;
  value: string;
  subvalue: string;
  tone?: AtlasTone;
  target: string;
};

type StakeSummaryInput = {
  stakes: HexStake[];
  dailyYieldHex: number;
  dailyYieldUsd: number;
  maturityValueUsd: number;
};

type DefiSummaryInput = {
  positions: LpPositionEnriched[];
  incPrice: number;
};

function fmtUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) {
    const digits = abs >= 10_000 ? 0 : 1;
    const roundedThousands = Number((abs / 1_000).toFixed(digits));
    if (roundedThousands >= 1_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    return `$${(value / 1_000).toFixed(digits)}K`;
  }
  if (abs >= 100) return `$${value.toFixed(0)}`;
  return `$${value.toFixed(2)}`;
}

function fmtHex(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M HEX`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K HEX`;
  return `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} HEX`;
}

export function buildAtlasStakeSummaryCards({
  stakes,
  dailyYieldHex,
  dailyYieldUsd,
  maturityValueUsd,
}: StakeSummaryInput): AtlasIntelligenceCardData[] {
  const active = stakes.filter(stake => (stake.daysRemaining ?? 0) > 0);
  const endingSoon = active.filter(stake => (stake.daysRemaining ?? 0) <= 90);
  const matured = stakes.filter(stake => (stake.daysRemaining ?? 0) <= 0);

  return [
    {
      id: 'active-stakes',
      label: 'Active stakes',
      value: String(active.length),
      subvalue: `${stakes.length} total tracked`,
      tone: active.length > 0 ? 'positive' : 'muted',
      target: 'all',
    },
    {
      id: 'ending-soon',
      label: 'Ending soon',
      value: String(endingSoon.length),
      subvalue: endingSoon.length > 0 ? 'Review before maturity' : 'No near exits',
      tone: endingSoon.length > 0 ? 'negative' : 'muted',
      target: 'ending-soon',
    },
    {
      id: 'daily-yield',
      label: 'Daily yield',
      value: fmtHex(dailyYieldHex),
      subvalue: `${fmtUsd(dailyYieldUsd)} / day`,
      tone: dailyYieldHex > 0 ? 'positive' : 'muted',
      target: 'all',
    },
    {
      id: 'maturity',
      label: 'Maturity value',
      value: fmtUsd(maturityValueUsd),
      subvalue: matured.length > 0 ? `${matured.length} matured` : 'Projected active value',
      tone: 'accent',
      target: matured.length > 0 ? 'matured' : 'all',
    },
  ];
}

export function buildAtlasDefiSummaryCards({ positions, incPrice }: DefiSummaryInput): AtlasIntelligenceCardData[] {
  const staked = positions.filter(position => position.stakedLpBalance > 0);
  const walletLp = positions.filter(position => position.walletLpBalance > 0 && position.stakedLpBalance === 0);
  const totalValue = positions.reduce((sum, position) => sum + position.totalUsd, 0);
  const pendingUsd = staked.reduce((sum, position) => {
    const pendingInc = (position as LpPositionEnriched & { pendingInc?: number }).pendingInc ?? 0;
    return sum + (position.pendingIncUsd ?? pendingInc * incPrice);
  }, 0);

  return [
    {
      id: 'defi-value',
      label: 'DeFi value',
      value: fmtUsd(totalValue),
      subvalue: `${positions.length} position${positions.length === 1 ? '' : 's'}`,
      tone: totalValue > 0 ? 'positive' : 'muted',
      target: 'all',
    },
    {
      id: 'farms',
      label: 'Farms',
      value: String(staked.length),
      subvalue: staked.length > 0 ? 'Earning INC' : 'No staked LP',
      tone: staked.length > 0 ? 'accent' : 'muted',
      target: 'farm',
    },
    {
      id: 'wallet-lp',
      label: 'Wallet LP',
      value: String(walletLp.length),
      subvalue: walletLp.length > 0 ? 'Unstaked positions' : 'No wallet LP',
      tone: walletLp.length > 0 ? 'neutral' : 'muted',
      target: 'lp',
    },
    {
      id: 'pending-inc',
      label: 'Pending INC',
      value: fmtUsd(pendingUsd),
      subvalue: 'Farm rewards',
      tone: pendingUsd > 0 ? 'positive' : 'muted',
      target: 'farm',
    },
  ];
}
