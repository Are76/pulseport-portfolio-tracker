import type { Asset, FarmPosition, HexStake, LpPosition } from '../../types';
import type { AtlasHomeSnapshot, AtlasMetric, AtlasSignal, AtlasTokenCardData } from './atlas-types';

type AtlasSummaryInput = {
  totalValue: number;
  pnl24h: number;
  pnl24hPercent: number;
};

type AtlasSnapshotInput = {
  summary: AtlasSummaryInput;
  walletCount: number;
  assets: Asset[];
  stakes: HexStake[];
  lpPositions?: LpPosition[];
  farmPositions?: FarmPosition[];
  lpValueUsd?: number;
  farmValueUsd?: number;
  hiddenTokenCount: number;
};

const MAX_TOKENS = 4;

function formatUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  if (abs >= 100) return `$${value.toFixed(0)}`;
  if (abs >= 1) return `$${value.toFixed(2)}`;
  if (abs >= 0.01) return `$${value.toFixed(2)}`;
  if (abs > 0) return `$${value.toPrecision(3)}`;
  return '$0';
}

function formatSignedUsd(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${formatUsd(Math.abs(value))}`;
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatPrice(value: number): string {
  if (value <= 0) return '$0';
  if (value < 0.0001) return `$${value.toPrecision(3)}`;
  if (value < 1) return `$${value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
  return formatUsd(value);
}

function toneForChange(value: number) {
  if (value > 0) return 'positive' as const;
  if (value < 0) return 'negative' as const;
  return 'neutral' as const;
}

function activeStakeCount(stakes: HexStake[]): number {
  return stakes.filter(stake => (stake.daysRemaining ?? 0) > 0).length;
}

function sumPositionValue(positions: Array<{ totalUsd: number }> | undefined): number {
  return positions?.reduce((sum, position) => sum + position.totalUsd, 0) ?? 0;
}

function tokenDetailId(asset: Asset): string {
  return `token:${asset.id}`;
}

export function buildAtlasHomeSnapshot(input: AtlasSnapshotInput): AtlasHomeSnapshot {
  const sortedAssets = [...input.assets]
    .filter(asset => asset.value > 0)
    .sort((a, b) => b.value - a.value);
  const activeStakes = activeStakeCount(input.stakes);
  const lpValue = input.lpValueUsd ?? sumPositionValue(input.lpPositions);
  const farmValue = input.farmValueUsd ?? sumPositionValue(input.farmPositions);
  const defiValue = lpValue + farmValue;
  const defiShare = input.summary.totalValue > 0 ? (defiValue / input.summary.totalValue) * 100 : 0;
  const topHolding = sortedAssets[0];

  const metrics: AtlasMetric[] = [
    {
      id: 'change',
      label: '24h',
      value: formatPercent(input.summary.pnl24hPercent),
      subvalue: formatSignedUsd(input.summary.pnl24h),
      tone: toneForChange(input.summary.pnl24hPercent),
      detailId: 'portfolio-change',
    },
    {
      id: 'stakes',
      label: 'Stakes',
      value: String(activeStakes),
      subvalue: input.walletCount > 0 ? `${activeStakes} active` : 'connect wallet',
      detailId: 'stakes',
    },
    {
      id: 'lp',
      label: 'LP',
      value: formatUsd(defiValue),
      subvalue: `${defiShare.toFixed(1)}%`,
      detailId: 'liquidity',
    },
    {
      id: 'noise',
      label: 'Noise',
      value: String(input.hiddenTokenCount),
      subvalue: input.hiddenTokenCount === 1 ? 'hidden' : 'hidden',
      detailId: 'hidden-noise',
    },
  ];

  const signals: AtlasSignal[] = [
    {
      id: 'top-holding',
      label: 'Top holding',
      value: topHolding?.symbol ?? 'None',
      tone: topHolding ? toneForChange(topHolding.pnl24h ?? topHolding.priceChange24h ?? 0) : 'muted',
      detailId: topHolding ? tokenDetailId(topHolding) : 'portfolio-change',
    },
    {
      id: 'wallets',
      label: 'Wallets tracked',
      value: String(input.walletCount),
      tone: input.walletCount > 0 ? 'accent' : 'muted',
      detailId: 'portfolio-change',
    },
    {
      id: 'defi',
      label: 'Liquidity + farms',
      value: formatUsd(defiValue),
      tone: defiValue > 0 ? 'positive' : 'muted',
      detailId: 'liquidity',
    },
  ];

  const tokens: AtlasTokenCardData[] = sortedAssets.slice(0, MAX_TOKENS).map(asset => {
    const change = asset.pnl24h ?? asset.priceChange24h ?? 0;
    return {
      id: asset.id,
      symbol: asset.symbol,
      price: formatPrice(asset.price),
      change: formatPercent(change),
      ratio: formatUsd(asset.value),
      tone: toneForChange(change),
      detailId: tokenDetailId(asset),
    };
  });

  const details = Object.fromEntries(sortedAssets.slice(0, MAX_TOKENS).map(asset => {
    const detailId = tokenDetailId(asset);
    const change = asset.pnl24h ?? asset.priceChange24h ?? 0;

    return [detailId, {
      id: detailId,
      breadcrumb: ['Home', 'Coins', asset.symbol],
      title: asset.symbol,
      summary: `${asset.name || asset.symbol} in your tracked portfolio.`,
      facts: [
        { label: 'Price', value: formatPrice(asset.price) },
        { label: 'Your value', value: formatUsd(asset.value) },
        { label: '24h', value: formatPercent(change), tone: toneForChange(change) },
        { label: 'Chain', value: asset.chain },
      ],
      actions: [
        { label: 'Token page', target: `product:${asset.id}`, variant: 'primary' as const },
        { label: 'Transactions', target: 'history' },
      ],
    }];
  }));

  const allocationTotal = sortedAssets.reduce((sum, asset) => sum + asset.value, 0);
  const allocation = sortedAssets.slice(0, 3).map(asset => ({
    id: asset.id,
    label: asset.symbol,
    width: allocationTotal > 0 ? (asset.value / allocationTotal) * 100 : 0,
    detailId: tokenDetailId(asset),
  }));

  return {
    eyebrow: input.walletCount > 0 ? `${input.walletCount} wallet${input.walletCount === 1 ? '' : 's'}` : 'Add wallet',
    headlineValue: formatUsd(input.summary.totalValue),
    metrics,
    signals,
    allocation,
    tokens,
    details,
    emptyTokenMessage: tokens.length === 0 ? 'Add a wallet to see your largest holdings here.' : undefined,
  };
}
