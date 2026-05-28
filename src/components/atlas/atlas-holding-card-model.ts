import type { Asset } from '../../types';
import type { AtlasTone } from './atlas-types';

type PriceChangePeriod = '1h' | '6h' | '24h' | '7d';

export type AtlasHoldingCardData = {
  id: string;
  title: string;
  symbol: string;
  chain: string;
  value: string;
  price: string;
  change: string;
  share: string;
  balance: string;
  tone: AtlasTone;
  logoUrl?: string;
};

type BuildAtlasHoldingCardsInput<TAsset extends Asset> = {
  assets: TAsset[];
  totalValueUsd: number;
  priceChangePeriod: PriceChangePeriod;
  maxCards?: number;
  getLogoUrl?: (asset: TAsset) => string | undefined;
};

function fmtUsd(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  if (abs >= 100) return `$${value.toFixed(0)}`;
  if (abs >= 1) return `$${value.toFixed(2)}`;
  return '$0';
}

function fmtPrice(value: number): string {
  if (value <= 0) return '$0';
  if (value < 0.0001) return `$${value.toPrecision(3)}`;
  if (value < 1) return `$${value.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}`;
  return fmtUsd(value);
}

function fmtCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  return `${sign}${abs.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
}

function fmtPercent(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function toneForChange(value: number): AtlasTone {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function periodChange(asset: Asset, period: PriceChangePeriod): number {
  if (period === '1h') return asset.priceChange1h ?? 0;
  if (period === '7d') return asset.priceChange7d ?? 0;
  if (period === '6h') return 0;
  return asset.priceChange24h ?? asset.pnl24h ?? 0;
}

function chainLabel(chain: string): string {
  if (chain === 'pulsechain') return 'PulseChain';
  if (chain === 'ethereum') return 'Ethereum';
  if (chain === 'base') return 'Base';
  return chain;
}

export function buildAtlasHoldingCards<TAsset extends Asset>({
  assets,
  totalValueUsd,
  priceChangePeriod,
  maxCards = 4,
  getLogoUrl,
}: BuildAtlasHoldingCardsInput<TAsset>): AtlasHoldingCardData[] {
  return [...assets]
    .filter(asset => asset.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, maxCards)
    .map(asset => {
      const change = periodChange(asset, priceChangePeriod);
      const share = totalValueUsd > 0 ? (asset.value / totalValueUsd) * 100 : 0;
      return {
        id: asset.id,
        title: asset.name || asset.symbol,
        symbol: asset.symbol,
        chain: chainLabel(asset.chain),
        value: fmtUsd(asset.value),
        price: fmtPrice(asset.price),
        change: fmtPercent(change),
        share: `${share.toFixed(1)}%`,
        balance: fmtCompact(asset.balance),
        tone: toneForChange(change),
        logoUrl: getLogoUrl?.(asset),
      };
    });
}
