import { useEffect, useMemo, useState } from 'react';

import { AtlasAllocationCard } from './AtlasAllocationCard';
import { AtlasDetailDrawer } from './AtlasDetailDrawer';
import { AtlasDetailSheet } from './AtlasDetailSheet';
import { AtlasMetricTile } from './AtlasMetricTile';
import { AtlasQuickActionCard } from './AtlasQuickActionCard';
import { AtlasSignalRow } from './AtlasSignalRow';
import { AtlasTokenCard } from './AtlasTokenCard';
import { buildAtlasDetail, type AtlasDetailId } from './atlas-detail-model';
import type { AtlasDetailContent, AtlasHomeSnapshot, AtlasRange } from './atlas-types';

type Props = {
  onNavigate: (target: string) => void;
  snapshot?: AtlasHomeSnapshot;
};

function createDefaultTokenDetail(id: string, symbol: string, price: string, ratio: string): AtlasDetailContent {
  return {
    id: `token:${id}`,
    breadcrumb: ['Home', 'Coins', symbol],
    title: symbol,
    summary: `${symbol} market and portfolio context.`,
    facts: [
      { label: 'Price', value: price },
      { label: 'PLS ratio', value: ratio },
      { label: 'Range', value: '24h' },
    ],
    actions: [
      { label: 'Token page', target: `product:${id}`, variant: 'primary' },
      { label: 'Transactions', target: 'history' },
    ],
  };
}

const DEFAULT_TOKEN_DETAILS: Record<string, AtlasDetailContent> = {
  'token:pls': createDefaultTokenDetail('pls', 'PLS', '$0.00000694', '0.07 x Sac'),
  'token:plsx': createDefaultTokenDetail('plsx', 'PLSX', '$0.0000053', '0.76 PLS'),
  'token:inc': createDefaultTokenDetail('inc', 'INC', '$0.317', '45,740 PLS'),
  'token:hex': createDefaultTokenDetail('hex', 'HEX', '$0.00115', '165 PLS'),
};

const DEFAULT_SNAPSHOT: AtlasHomeSnapshot = {
  eyebrow: 'Portfolio',
  headlineValue: '$84,920',
  metrics: [
    { id: 'change', label: '24h', value: '+3.8%', subvalue: '+$3,182', tone: 'positive', detailId: 'portfolio-change' },
    { id: 'stakes', label: 'Stakes', value: '18', subvalue: '1 due soon', detailId: 'stakes' },
    { id: 'lp', label: 'LP / DeFi', value: '$12.6K', subvalue: '15.0% allocated', detailId: 'liquidity' },
    { id: 'top', label: 'Top holding', value: 'PLSX', subvalue: '$35.7K', tone: 'negative', detailId: 'token:plsx' },
  ],
  signals: [
    {
      id: 'plsx-strength',
      label: 'Top holding',
      value: 'PLSX',
      tone: 'negative',
      detailId: 'token:plsx',
      description: '$35.7K of current value',
      iconKey: 'holding',
    },
    {
      id: 'stake-soon',
      label: 'Active stakes',
      value: '18',
      tone: 'accent',
      detailId: 'stakes',
      description: '1 due soon across tracked HEX positions',
      iconKey: 'stakes',
    },
    {
      id: 'lp-up',
      label: 'Liquidity + farms',
      value: '$12.6K',
      tone: 'muted',
      detailId: 'liquidity',
      description: '15.0% of portfolio deployed',
      iconKey: 'defi',
    },
  ],
  allocation: {
    segments: [
      { id: 'plsx', label: 'PLSX', width: 42, detailId: 'token:plsx' },
      { id: 'hex', label: 'HEX', width: 31, detailId: 'token:hex' },
      { id: 'inc', label: 'INC', width: 12, detailId: 'token:inc' },
    ],
    topWeights: [
      { id: 'plsx', label: 'PLSX', value: '$35.7K', percent: 42.0, detailId: 'token:plsx' },
      { id: 'hex', label: 'HEX', value: '$26.3K', percent: 31.0, detailId: 'token:hex' },
      { id: 'inc', label: 'INC', value: '$10.2K', percent: 12.0, detailId: 'token:inc' },
    ],
  },
  tokens: [
    { id: 'pls', symbol: 'PLS', price: '$0.00000694', change: '-3.21%', ratio: '0.07 x Sac', tone: 'negative', detailId: 'token:pls' },
    { id: 'plsx', symbol: 'PLSX', price: '$0.0000053', change: '-3.51%', ratio: '0.76 PLS', tone: 'negative', detailId: 'token:plsx' },
    { id: 'inc', symbol: 'INC', price: '$0.317', change: '-2.69%', ratio: '45,740 PLS', tone: 'negative', detailId: 'token:inc' },
    { id: 'hex', symbol: 'HEX', price: '$0.00115', change: '-5.77%', ratio: '165 PLS', tone: 'negative', detailId: 'token:hex' },
  ],
  quickActions: [
    { id: 'insights', label: 'Portfolio insights', description: 'Open the portfolio narrative and context.', target: 'tracker' },
    { id: 'transactions', label: 'Review transactions', description: 'Go to the ledger with your current portfolio context.', target: 'history' },
    { id: 'rebalance', label: 'Rebalance planner', description: 'Set target allocation and see the best path via PLS.', target: 'overview:rebalance' },
    { id: 'exit-plan', label: 'Exit plan', description: 'Open the profit planner for phased exits.', target: 'planner' },
  ],
  details: DEFAULT_TOKEN_DETAILS,
};

const RANGES: AtlasRange[] = ['24h', '7d', '30d', '90d'];

export function AtlasHomeSurface({ onNavigate, snapshot = DEFAULT_SNAPSHOT }: Props) {
  const [selectedDetailId, setSelectedDetailId] = useState<AtlasDetailId | string>('portfolio-change');
  const [selectedRange, setSelectedRange] = useState<AtlasRange>('24h');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const detail = useMemo(
    () => buildAtlasDetail(selectedDetailId, snapshot.details, selectedRange),
    [selectedDetailId, selectedRange, snapshot.details],
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setDrawerOpen(false);
      } else {
        setSheetOpen(false);
      }
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  const selectDetail = (detailId: string) => {
    setSelectedDetailId(detailId);
    const isMobile = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 767px)').matches;
    setSheetOpen(isMobile);
    setDrawerOpen(!isMobile);
  };

  const navigateFromDetail = (target: string) => {
    setDrawerOpen(false);
    setSheetOpen(false);
    onNavigate(target);
  };

  return (
    <section className="atlas-home atlas-surface">
      <header className="atlas-home__hero">
        <div>
          <span className="atlas-home__eyebrow">{snapshot.eyebrow}</span>
          <h1 className="atlas-mono">{snapshot.headlineValue}</h1>
        </div>
        <div className="atlas-home__range" aria-label="Time range">
          {RANGES.map(range => (
            <button
              key={range}
              type="button"
              className={selectedRange === range ? 'is-active' : undefined}
              aria-pressed={selectedRange === range}
              disabled={range !== '24h'}
              title={range === '24h' ? undefined : 'Historical data coming soon'}
              onClick={() => setSelectedRange(range)}
            >
              {range}
            </button>
          ))}
        </div>
      </header>

      <div className="atlas-home__layout">
        <div>
          <div className="atlas-home__metrics">
            {snapshot.metrics.map((metric) => (
              <AtlasMetricTile key={metric.id} metric={metric} active={selectedDetailId === metric.detailId} onSelect={selectDetail} />
            ))}
          </div>

          <section className="atlas-home__token-section" aria-labelledby="atlas-token-heading">
            <div className="atlas-home__section-head">
              <h2 id="atlas-token-heading">Live Prices</h2>
              <span>top 6 by value</span>
            </div>
            <div className="atlas-home__tokens">
              {snapshot.tokens.length > 0
                ? snapshot.tokens.map((token) => (
                  <AtlasTokenCard key={token.id} token={token} active={selectedDetailId === token.detailId} onSelect={selectDetail} />
                ))
                : <p className="atlas-home__empty">{snapshot.emptyTokenMessage}</p>}
            </div>
          </section>

          <div className="atlas-home__secondary">
            <AtlasAllocationCard allocation={snapshot.allocation} activeDetailId={selectedDetailId} onSelect={selectDetail} />
            <div className="atlas-home__panel">
              <div className="atlas-home__panel-head"><strong>Signals</strong><span>{snapshot.signals.length}</span></div>
              {snapshot.signals.map((signal) => (
                <AtlasSignalRow key={signal.id} signal={signal} active={selectedDetailId === signal.detailId} onSelect={selectDetail} />
              ))}
            </div>
            <div className="atlas-home__panel">
              <div className="atlas-home__panel-head"><strong>Decision support</strong><span>{snapshot.quickActions.length}</span></div>
              {snapshot.quickActions.map((action) => (
                <AtlasQuickActionCard
                  key={action.id}
                  label={action.label}
                  description={action.description}
                  onClick={() => navigateFromDetail(action.target)}
                />
              ))}
            </div>
          </div>
        </div>

      </div>

      <AtlasDetailDrawer detail={detail} open={drawerOpen} onClose={() => setDrawerOpen(false)} onAction={navigateFromDetail} />
      <AtlasDetailSheet detail={detail} open={sheetOpen} onClose={() => setSheetOpen(false)} onAction={navigateFromDetail} />
    </section>
  );
}
