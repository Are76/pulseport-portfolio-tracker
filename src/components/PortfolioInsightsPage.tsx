import React from 'react';
import { ArrowRight, ExternalLink, LayoutDashboard, Wallet } from 'lucide-react';
import type { Asset, Chain, PortfolioSummary, Transaction, Wallet as WalletType } from '../types';
import { PageHeader, StatGrid } from './DashboardPrimitives';

const CHAIN_LABELS: Record<Chain, string> = {
  pulsechain: 'PulseChain',
  ethereum: 'Ethereum',
  base: 'Base',
};

function fmtUsd(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function fmtPct(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '-';
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function shortenAddress(address?: string): string {
  if (!address || address === 'native') return 'Native';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function normalizeSymbol(symbol: string): string {
  const upper = (symbol || '').toUpperCase();
  return upper === 'WPLS' ? 'PLS' : upper;
}

function sameSymbol(left: string, right: string): boolean {
  return normalizeSymbol(left) === normalizeSymbol(right);
}

export interface PortfolioInsightsPageProps {
  wallets: WalletType[];
  assets: Asset[];
  transactions: Transaction[];
  summary: PortfolioSummary;
  onOpenProduct: (asset: Asset) => void;
  onOpenPnl: (asset: Asset) => void;
  onOpenHistory: () => void;
  onOpenWallets: () => void;
}

type PositionInsight = {
  asset: Asset;
  txCount: number;
  investedUsd: number;
  currentUsd: number;
  deltaUsd: number;
  deltaPct: number | null;
};

function buildPositionInsight(asset: Asset, transactions: Transaction[]): PositionInsight {
  const relevant = transactions.filter((tx) =>
    tx.chain === asset.chain &&
    (sameSymbol(tx.asset, asset.symbol) || sameSymbol(tx.counterAsset ?? '', asset.symbol)),
  );

  let cost = 0;
  let proceeds = 0;
  let bought = 0;
  let sold = 0;

  relevant.forEach((tx) => {
    const usd = tx.valueUsd ?? 0;
    const assetMatches = sameSymbol(tx.asset, asset.symbol);
    const counterMatches = sameSymbol(tx.counterAsset ?? '', asset.symbol);

    if (tx.type === 'swap') {
      if (assetMatches) {
        bought += tx.amount;
        cost += usd;
      }
      if (counterMatches) {
        sold += tx.counterAmount ?? 0;
        proceeds += usd;
      }
      return;
    }

    if (tx.type === 'deposit' && assetMatches) {
      bought += tx.amount;
      cost += usd;
      return;
    }

    if (tx.type === 'withdraw' && assetMatches) {
      sold += tx.amount;
      proceeds += usd;
    }
  });

  const avgCost = bought > 0 ? cost / bought : 0;
  const realizedCost = Math.min(cost, sold * avgCost);
  const remainingCost = Math.max(0, cost - realizedCost);
  const currentUsd = asset.value;
  const deltaUsd = currentUsd - remainingCost;
  const deltaPct = remainingCost > 0 ? (deltaUsd / remainingCost) * 100 : null;

  return {
    asset,
    txCount: relevant.length,
    investedUsd: remainingCost,
    currentUsd,
    deltaUsd,
    deltaPct,
  };
}

export function PortfolioInsightsPage({
  wallets,
  assets,
  transactions,
  summary,
  onOpenProduct,
  onOpenPnl,
  onOpenHistory,
  onOpenWallets,
}: PortfolioInsightsPageProps) {
  const trackedAssets = React.useMemo(
    () => assets.filter((asset) => asset.value > 0).sort((a, b) => b.value - a.value),
    [assets],
  );

  const dominantChain = React.useMemo(() => {
    const rows = Object.entries(summary.chainDistribution)
      .map(([chain, value]) => ({ chain: chain as Chain, value }))
      .sort((a, b) => b.value - a.value);
    return rows[0];
  }, [summary.chainDistribution]);

  const positionInsights = React.useMemo(
    () => trackedAssets.map((asset) => buildPositionInsight(asset, transactions)),
    [trackedAssets, transactions],
  );

  const topPositions = positionInsights.slice(0, 8);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Portfolio Insights"
        subtitle="Per-coin invested, current value, and performance from synced transaction history."
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 0.9fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div className="overview-section-card">
          <div className="overview-section-title" style={{ marginBottom: 14 }}>Action Summary</div>
          <StatGrid
            cols={4}
            items={[
              {
                label: 'Tracked value',
                value: fmtUsd(summary.totalValue),
                sub: `${wallets.length} wallet${wallets.length === 1 ? '' : 's'}`,
              },
              {
                label: 'Tracked capital',
                value: summary.netInvestment > 0 ? fmtUsd(summary.netInvestment) : '-',
                sub: summary.netInvestment > 0 ? 'ETH + stablecoin inflows' : 'Needs synced tx history',
              },
              {
                label: 'Net P&L',
                value: summary.netInvestment > 0 ? `${summary.unifiedPnl >= 0 ? '+' : '-'}${fmtUsd(Math.abs(summary.unifiedPnl))}` : '-',
                sub: summary.netInvestment > 0 ? fmtPct((summary.unifiedPnl / summary.netInvestment) * 100) : 'No investable baseline',
                color: summary.unifiedPnl >= 0 ? 'var(--accent)' : 'var(--negative)',
              },
              {
                label: 'Dominant chain',
                value: dominantChain ? CHAIN_LABELS[dominantChain.chain] : '-',
                sub: dominantChain ? fmtUsd(dominantChain.value) : 'No chain allocation yet',
              },
            ]}
          />
        </div>

        <div className="overview-section-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="overview-section-title">Quick Actions</div>
          <button className="btn-ghost" onClick={onOpenHistory} style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LayoutDashboard size={14} />
              Review transactions
            </span>
            <ArrowRight size={14} />
          </button>
          <button className="btn-ghost" onClick={onOpenWallets} style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={14} />
              Inspect wallet balances
            </span>
            <ArrowRight size={14} />
          </button>
          {topPositions[0] && (
            <button
              className="btn-ghost"
              onClick={() => onOpenProduct(topPositions[0].asset)}
              style={{ justifyContent: 'space-between' }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ExternalLink size={14} />
                Inspect {topPositions[0].asset.symbol}
              </span>
              <ArrowRight size={14} />
            </button>
          )}
          <div style={{ fontSize: 12, color: 'var(--fg-subtle)', lineHeight: 1.5 }}>
            Invested values here come from synced transaction history and current wallet scope. This surface is per coin, but not yet contract-perfect for every historical token movement.
          </div>
        </div>
      </div>

      <div className="overview-section-card">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div className="overview-section-title">Top Positions</div>
          <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
            Current value vs remaining invested basis by coin
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {topPositions.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
              Add wallets and sync transactions to build coin-level insights.
            </div>
          ) : (
            topPositions.map((row) => (
              <div
                key={row.asset.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.4fr) repeat(4, minmax(0, 1fr)) auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-elevated)',
                }}
              >
                <button
                  type="button"
                  onClick={() => onOpenProduct(row.asset)}
                  style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--fg)' }}>
                    {row.asset.symbol}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
                    {row.asset.name} - {CHAIN_LABELS[row.asset.chain]} - {shortenAddress(row.asset.address)}
                  </div>
                </button>

                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Invested</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)' }}>
                    {row.investedUsd > 0 ? fmtUsd(row.investedUsd) : '-'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Current</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)' }}>
                    {fmtUsd(row.currentUsd)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Delta</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: row.deltaUsd >= 0 ? 'var(--accent)' : 'var(--negative)' }}>
                    {row.deltaUsd >= 0 ? '+' : '-'}{fmtUsd(Math.abs(row.deltaUsd))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--fg-subtle)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Txs</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--fg)' }}>
                    {row.txCount.toLocaleString('en-US')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>{fmtPct(row.deltaPct)}</div>
                </div>

                <button className="btn-ghost" onClick={() => onOpenPnl(row.asset)} style={{ whiteSpace: 'nowrap' }}>
                  Open P&amp;L
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
