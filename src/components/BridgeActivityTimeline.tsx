import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowRight, ExternalLink, GitBranch, BarChart2 } from 'lucide-react';
import type { Asset, Chain, Transaction } from '../types';
import { TokenPnLCard } from './TokenPnLCard';

export type BridgeActivity = Transaction & {
  fromChain: Chain | 'external';
  toChain: Chain | 'external';
  fromAsset: string;
  toAsset: string;
};

export type BridgeActivityGroup = {
  date: string;
  timestamp: number;
  events: BridgeActivity[];
};

const CHAIN_LABELS: Record<BridgeActivity['fromChain'], string> = {
  pulsechain: 'PulseChain',
  ethereum: 'Ethereum',
  base: 'Base',
  external: 'External',
};

const CHAIN_SHORT: Record<BridgeActivity['fromChain'], string> = {
  pulsechain: 'PLS',
  ethereum: 'ETH',
  base: 'BASE',
  external: 'EXT',
};

const CHAIN_TONE: Record<BridgeActivity['fromChain'], string> = {
  pulsechain: '#f739ff',
  ethereum: '#818cf8',
  base: '#60a5fa',
  external: 'var(--fg-subtle)',
};

function normalizeAssetSymbol(asset: string): string {
  const clean = asset
    .replace(/\s*\((from|fork copy|system copy|liberty bridge)[^)]+\)/gi, '')
    .replace(/^B-/i, '')
    .replace(/^L-/i, '')
    .trim();

  if (/usd coin/i.test(clean)) return 'USDC';
  if (/tether/i.test(clean)) return 'USDT';
  if (/wrapped ether|weth/i.test(clean)) return 'WETH';
  if (/wrapped bitcoin|wbtc/i.test(clean)) return 'WBTC';
  if (/^ehex$/i.test(clean)) return 'HEX';
  return clean || asset;
}

function isBridgeLike(tx: Transaction): boolean {
  const asset = tx.asset || '';
  return Boolean(
    tx.bridged ||
      /\(from\s+(ethereum|eth|base)\)/i.test(asset) ||
      /liberty bridge/i.test(asset) ||
      /^B-/i.test(asset) ||
      /^L-/i.test(asset) ||
      (tx.chain === 'pulsechain' && /^(eHEX|WETH|WBTC)$/i.test(asset))
  );
}

function inferSourceChain(tx: Transaction): BridgeActivity['fromChain'] {
  const asset = tx.asset || '';
  if (/\(from\s+base\)/i.test(asset) || /^B-/i.test(asset)) return 'base';
  if (/\(from\s+(ethereum|eth)\)/i.test(asset) || /liberty bridge/i.test(asset)) return 'ethereum';
  if (tx.chain === 'base' && tx.bridged) return 'ethereum';
  if (tx.chain === 'pulsechain' && tx.bridged) return 'ethereum';
  if (tx.type === 'withdraw') return tx.chain;
  return 'external';
}

function inferTargetChain(tx: Transaction, fromChain: BridgeActivity['fromChain']): BridgeActivity['toChain'] {
  if (tx.type === 'withdraw') return fromChain === tx.chain ? 'external' : tx.chain;
  return tx.chain;
}

export function getBridgeActivities(transactions: Transaction[]): BridgeActivity[] {
  return transactions
    .filter(isBridgeLike)
    .map(tx => {
      const fromChain = inferSourceChain(tx);
      const toChain = inferTargetChain(tx, fromChain);
      const symbol = normalizeAssetSymbol(tx.asset);
      return {
        ...tx,
        fromChain,
        toChain,
        fromAsset: symbol,
        toAsset: symbol,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function groupByDate(bridgeActivities: BridgeActivity[]): Record<string, BridgeActivity[]> {
  return bridgeActivities.reduce<Record<string, BridgeActivity[]>>((acc, activity) => {
    const date = format(activity.timestamp, 'MMM d, yyyy');
    if (!acc[date]) acc[date] = [];
    acc[date].push(activity);
    return acc;
  }, {});
}

function timelineGroupsFromDates(bridgeActivities: BridgeActivity[]): BridgeActivityGroup[] {
  const groups = groupByDate(bridgeActivities);

  return Object.entries(groups)
    .map(([date, events]) => ({
      date,
      timestamp: Math.max(...events.map(event => event.timestamp)),
      events: events.sort((a, b) => b.timestamp - a.timestamp),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

function formatUsd(value: number | undefined): string {
  const v = value ?? 0;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 10_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function formatToken(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function explorerUrl(chain: Chain, hash: string): string {
  const base = chain === 'pulsechain'
    ? 'https://scan.pulsechain.com'
    : chain === 'ethereum'
      ? 'https://etherscan.io'
      : 'https://basescan.org';
  return `${base}/tx/${hash}`;
}

function findAssetForBridge(activity: BridgeActivity, assets: Asset[]): Asset | undefined {
  const wanted = normalizeAssetSymbol(activity.toAsset).toUpperCase();
  return assets.find(asset => {
    const symbol = normalizeAssetSymbol(asset.symbol).toUpperCase();
    const name = normalizeAssetSymbol(asset.name).toUpperCase();
    return asset.chain === activity.toChain && (symbol === wanted || name.includes(wanted));
  }) || assets.find(asset => normalizeAssetSymbol(asset.symbol).toUpperCase() === wanted);
}

function fallbackAsset(activity: BridgeActivity): Asset {
  const price = activity.amount > 0 ? (activity.valueUsd ?? 0) / activity.amount : 0;
  const symbol = normalizeAssetSymbol(activity.toAsset);
  return {
    id: `bridge-${activity.id}`,
    symbol,
    name: activity.asset,
    balance: activity.amount,
    price,
    value: activity.valueUsd ?? activity.amount * price,
    chain: activity.toChain === 'external' ? activity.chain : activity.toChain,
  };
}

type BridgeTimelineEventProps = {
  activity: BridgeActivity;
  assets: Asset[];
  transactions: Transaction[];
  prices: Record<string, { usd: number; usd_24h_change?: number }>;
  getLogoUrl: (asset: Asset) => string;
  onOpenPnl: (asset: Asset) => void;
};

function BridgeTimelineEvent({
  activity,
  assets,
  transactions,
  prices,
  getLogoUrl,
  onOpenPnl,
}: BridgeTimelineEventProps) {
  const [showInsight, setShowInsight] = useState(false);
  const asset = findAssetForBridge(activity, assets) ?? fallbackAsset(activity);
  const symbol = normalizeAssetSymbol(activity.toAsset);
  const relatedTxs = useMemo(() => {
    const upper = symbol.toUpperCase();
    return transactions.filter(tx =>
      normalizeAssetSymbol(tx.asset).toUpperCase() === upper ||
      normalizeAssetSymbol(tx.counterAsset ?? '').toUpperCase() === upper
    );
  }, [transactions, symbol]);

  return (
    <div className="bridge-timeline-event">
      <div className="bridge-timeline-dot" style={{ borderColor: CHAIN_TONE[activity.toChain] }} />
      <button
        type="button"
        className="bridge-event-card history-tx-row"
        onClick={() => onOpenPnl(asset)}
      >
        <div className="bridge-event-main">
          <div className="bridge-flow-row">
            <span className="bridge-chain-pill" style={{ color: CHAIN_TONE[activity.fromChain] }}>
              {CHAIN_LABELS[activity.fromChain]}
            </span>
            <ArrowRight size={14} />
            <span className="bridge-chain-pill" style={{ color: CHAIN_TONE[activity.toChain] }}>
              {CHAIN_LABELS[activity.toChain]}
            </span>
          </div>
          <div className="bridge-asset-flow">
            <span>{formatToken(activity.amount)} {activity.fromAsset}</span>
            <ArrowRight size={13} />
            <span>{activity.toAsset}</span>
          </div>
          <div className="bridge-event-meta">
            {format(activity.timestamp, 'HH:mm')} · {CHAIN_SHORT[activity.fromChain]} to {CHAIN_SHORT[activity.toChain]}
            {activity.status && <> · {activity.status}</>}
          </div>
        </div>
        <div className="bridge-event-value">
          <strong>{formatUsd(activity.valueUsd)}</strong>
          <span>{activity.hash.slice(0, 8)}...</span>
        </div>
      </button>
      <div className="bridge-event-actions">
        <button
          type="button"
          className="bridge-mini-action"
          onClick={event => {
            event.stopPropagation();
            setShowInsight(value => !value);
          }}
        >
          <BarChart2 size={12} /> Asset insight
        </button>
        <a
          className="bridge-mini-action"
          href={explorerUrl(activity.chain, activity.hash)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={event => event.stopPropagation()}
        >
          <ExternalLink size={12} /> Explorer
        </a>
      </div>
      {showInsight && (
        <div className="bridge-event-insight">
          <TokenPnLCard
            symbol={asset.symbol}
            transactions={relatedTxs}
            asset={asset}
            priceUsd={asset.price}
            plsPriceUsd={prices.pulsechain?.usd ?? 0}
            logoUrl={getLogoUrl(asset)}
          />
        </div>
      )}
    </div>
  );
}

type BridgeActivityTimelineProps = {
  activities: BridgeActivity[];
  assets: Asset[];
  transactions: Transaction[];
  prices: Record<string, { usd: number; usd_24h_change?: number }>;
  getLogoUrl: (asset: Asset) => string;
  onOpenPnl: (asset: Asset) => void;
};

export function BridgeActivityTimeline({
  activities,
  assets,
  transactions,
  prices,
  getLogoUrl,
  onOpenPnl,
}: BridgeActivityTimelineProps) {
  const groups = useMemo(() => timelineGroupsFromDates(activities), [activities]);

  if (groups.length === 0) {
    return (
      <div className="bridge-empty-state">
        <GitBranch size={18} />
        <span>No bridge activity found for the current filters.</span>
      </div>
    );
  }

  return (
    <div className="bridge-timeline">
      {groups.map(group => (
        <section key={group.date} className="bridge-date-group">
          <div className="bridge-date-header">
            <span>{group.date}</span>
            <em>{group.events.length} event{group.events.length === 1 ? '' : 's'}</em>
          </div>
          <div className="bridge-date-track">
            {group.events.map(activity => (
              <div key={activity.id}>
                <BridgeTimelineEvent
                  activity={activity}
                  assets={assets}
                  transactions={transactions}
                  prices={prices}
                  getLogoUrl={getLogoUrl}
                  onOpenPnl={onOpenPnl}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
