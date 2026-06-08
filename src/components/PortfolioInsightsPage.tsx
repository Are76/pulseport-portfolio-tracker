import React from 'react';
import { ArrowRight, ExternalLink, LayoutDashboard, Wallet, ShieldCheck, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
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

function fmtSignedUsd(value: number): string {
  return `${value >= 0 ? '+' : '-'}${fmtUsd(Math.abs(value))}`;
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
      .filter((row) => row.value > 0)
      .sort((a, b) => b.value - a.value);
    return rows[0];
  }, [summary.chainDistribution]);

  const positionInsights = React.useMemo(
    () => trackedAssets.map((asset) => buildPositionInsight(asset, transactions)),
    [trackedAssets, transactions],
  );

  const topPositions = positionInsights.slice(0, 8);
  const coveredPositions = React.useMemo(
    () => positionInsights.filter((row) => row.txCount > 0),
    [positionInsights],
  );
  const scoredPositions = React.useMemo(
    () => coveredPositions.filter((row) => row.deltaPct != null),
    [coveredPositions],
  );
  const positivePositions = React.useMemo(
    () => scoredPositions.filter((row) => row.deltaUsd > 0),
    [scoredPositions],
  );
  const negativePositions = React.useMemo(
    () => scoredPositions.filter((row) => row.deltaUsd < 0),
    [scoredPositions],
  );
  const bestPosition = React.useMemo(
    () => [...(positivePositions.length > 0 ? positivePositions : scoredPositions)]
      .sort((a, b) => (b.deltaPct ?? Number.NEGATIVE_INFINITY) - (a.deltaPct ?? Number.NEGATIVE_INFINITY))[0] ?? null,
    [positivePositions, scoredPositions],
  );
  const worstPosition = React.useMemo(
    () => [...(negativePositions.length > 0 ? negativePositions : scoredPositions)]
      .sort((a, b) => (a.deltaPct ?? Number.POSITIVE_INFINITY) - (b.deltaPct ?? Number.POSITIVE_INFINITY))[0] ?? null,
    [negativePositions, scoredPositions],
  );
  const topPosition = topPositions[0] ?? null;
  const trackedCapital = summary.netInvestment > 0 ? summary.netInvestment : 0;
  const trackedCapitalLabel = 'Tracked net investment';
  const trackedCapitalSub = trackedCapital > 0
    ? 'Net funded capital observed in the synced wallet scope'
    : 'Needs synced transaction baseline';
  const bestPositionLabel = positivePositions.length > 0 ? 'Best P&L' : 'Least negative P&L';
  const bestPositionSub = positivePositions.length > 0
    ? 'Strongest covered winner'
    : 'Closest covered position to break-even';
  const worstPositionLabel = negativePositions.length > 0 ? 'Worst P&L' : 'Smallest gain';
  const worstPositionSub = negativePositions.length > 0
    ? 'Biggest covered drawdown'
    : 'Weakest covered winner still in profit';
  const coverageLabel = `${coveredPositions.length}/${trackedAssets.length}`;
  const coverageSubtext = transactions.length > 0
    ? `${transactions.length.toLocaleString('en-US')} synced tx rows in current wallet scope`
    : 'No synced transaction rows in current wallet scope';
  const coverageTone = coveredPositions.length === trackedAssets.length && trackedAssets.length > 0
    ? 'var(--accent)'
    : 'var(--fg-primary)';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Portfolio Insights"
        subtitle="Transaction-backed coin analytics for invested basis, current value, and where your book is winning or bleeding."
      />

      <div className="portfolio-insights-summary-grid">
        <div className="portfolio-insights-hero-card">
          <div className="portfolio-insights-card-label">Total current value</div>
          <div className="portfolio-insights-hero-value">{fmtUsd(summary.totalValue)}</div>
          <div className="portfolio-insights-card-sub">
            {wallets.length} wallet{wallets.length === 1 ? '' : 's'} in view
            {dominantChain ? ` - dominant ${CHAIN_LABELS[dominantChain.chain]}` : ''}
          </div>
        </div>
        <StatGrid
          cols={3}
          items={[
            {
              label: trackedCapitalLabel,
              value: trackedCapital > 0 ? fmtUsd(trackedCapital) : '-',
              sub: trackedCapitalSub,
            },
            {
              label: 'Total P&L',
              value: trackedCapital > 0 ? fmtSignedUsd(summary.unifiedPnl) : '-',
              sub: trackedCapital > 0 ? fmtPct((summary.unifiedPnl / trackedCapital) * 100) : 'No investable baseline yet',
              color: summary.unifiedPnl >= 0 ? 'var(--accent)' : 'var(--negative)',
            },
            {
              label: 'Coverage status',
              value: coverageLabel,
              sub: coverageSubtext,
              color: coverageTone,
            },
          ]}
        />
      </div>

      <div className="portfolio-insights-secondary-grid">
        <div className="overview-section-card portfolio-insights-feature-card">
          <div className="portfolio-insights-feature-head">
            <div>
              <div className="overview-section-title">Top position</div>
              <div className="portfolio-insights-card-sub">Largest coin by current value</div>
            </div>
            <BarChart3 size={16} color="var(--accent)" />
          </div>
          {topPosition ? (
            <>
              <div className="portfolio-insights-feature-value">{topPosition.asset.symbol}</div>
              <div className="portfolio-insights-card-sub">
                {fmtUsd(topPosition.currentUsd)} current value · {CHAIN_LABELS[topPosition.asset.chain]}
              </div>
            </>
          ) : (
            <div className="portfolio-insights-card-sub">Add wallets and sync transactions to surface position analytics.</div>
          )}
        </div>

        <div className="overview-section-card portfolio-insights-feature-card">
          <div className="portfolio-insights-feature-head">
            <div>
              <div className="overview-section-title">{bestPositionLabel}</div>
              <div className="portfolio-insights-card-sub">{bestPositionSub}</div>
            </div>
            <TrendingUp size={16} color="var(--accent)" />
          </div>
          {bestPosition ? (
            <>
              <div className="portfolio-insights-feature-value">{bestPosition.asset.symbol}</div>
              <div className="portfolio-insights-card-sub" style={{ color: 'var(--accent)' }}>
                {fmtSignedUsd(bestPosition.deltaUsd)} · {fmtPct(bestPosition.deltaPct)}
              </div>
            </>
          ) : (
            <div className="portfolio-insights-card-sub">No positions with enough transaction context yet.</div>
          )}
        </div>

        <div className="overview-section-card portfolio-insights-feature-card">
          <div className="portfolio-insights-feature-head">
            <div>
              <div className="overview-section-title">{worstPositionLabel}</div>
              <div className="portfolio-insights-card-sub">{worstPositionSub}</div>
            </div>
            <TrendingDown size={16} color="var(--negative)" />
          </div>
          {worstPosition ? (
            <>
              <div className="portfolio-insights-feature-value">{worstPosition.asset.symbol}</div>
              <div className="portfolio-insights-card-sub" style={{ color: 'var(--negative)' }}>
                {fmtSignedUsd(worstPosition.deltaUsd)} · {fmtPct(worstPosition.deltaPct)}
              </div>
            </>
          ) : (
            <div className="portfolio-insights-card-sub">No losing position is measurable yet from the synced scope.</div>
          )}
        </div>

        <div className="overview-section-card portfolio-insights-actions-card">
          <div className="portfolio-insights-feature-head">
            <div>
              <div className="overview-section-title">Next actions</div>
              <div className="portfolio-insights-card-sub">Jump straight to the surfaces that explain the book.</div>
            </div>
            <ShieldCheck size={16} color="var(--fg-subtle)" />
          </div>
          <button className="btn-ghost portfolio-insights-action-button" onClick={onOpenHistory}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LayoutDashboard size={14} />
              Review transactions
            </span>
            <ArrowRight size={14} />
          </button>
          <button className="btn-ghost portfolio-insights-action-button" onClick={onOpenWallets}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Wallet size={14} />
              Inspect wallet balances
            </span>
            <ArrowRight size={14} />
          </button>
          {topPosition && (
            <button
              className="btn-ghost portfolio-insights-action-button"
              onClick={() => onOpenProduct(topPosition.asset)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <ExternalLink size={14} />
                Inspect {topPosition.asset.symbol}
              </span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="overview-section-card">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div>
            <div className="overview-section-title">Top Positions</div>
            <div className="portfolio-insights-card-sub">Current value vs remaining invested basis by coin</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--fg-subtle)' }}>
            {topPositions.length} of {trackedAssets.length} visible positions
          </div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {topPositions.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--fg-muted)', fontSize: 13 }}>
              Add wallets and sync transactions to build coin-level insights.
            </div>
          ) : (
            <>
              <div className="portfolio-insights-table-head">
                <span>Position</span>
                <span>Invested</span>
                <span>Current</span>
                <span>P&amp;L</span>
                <span>Coverage</span>
                <span />
              </div>
              {topPositions.map((row) => (
                <div
                  key={row.asset.id}
                  className="portfolio-insights-row"
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
                      {row.asset.name} · {CHAIN_LABELS[row.asset.chain]} · {shortenAddress(row.asset.address)}
                    </div>
                  </button>

                  <div>
                    <div className="portfolio-insights-cell-value">
                      {row.investedUsd > 0 ? fmtUsd(row.investedUsd) : '-'}
                    </div>
                    <div className="portfolio-insights-card-sub">remaining basis</div>
                  </div>

                  <div>
                    <div className="portfolio-insights-cell-value">
                      {fmtUsd(row.currentUsd)}
                    </div>
                    <div className="portfolio-insights-card-sub">spot value</div>
                  </div>

                  <div>
                    <div
                      className="portfolio-insights-cell-value"
                      style={{ color: row.deltaUsd >= 0 ? 'var(--accent)' : 'var(--negative)' }}
                    >
                      {fmtSignedUsd(row.deltaUsd)}
                    </div>
                    <div className="portfolio-insights-card-sub">{fmtPct(row.deltaPct)}</div>
                  </div>

                  <div>
                    <div className="portfolio-insights-cell-value">
                      {row.txCount.toLocaleString('en-US')}
                    </div>
                    <div className="portfolio-insights-card-sub">
                      {row.txCount > 0 ? 'tx-backed' : 'needs coverage'}
                    </div>
                  </div>

                  <button className="btn-ghost" onClick={() => onOpenPnl(row.asset)} style={{ whiteSpace: 'nowrap' }}>
                    Open P&amp;L
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
