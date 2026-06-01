import { useEffect, useMemo, useState } from 'react';

import { AtlasDetailDrawer } from './AtlasDetailDrawer';
import { AtlasDetailSheet } from './AtlasDetailSheet';
import { AtlasMetricTile } from './AtlasMetricTile';
import { AtlasSignalRow } from './AtlasSignalRow';
import { AtlasTokenCard } from './AtlasTokenCard';
import { buildAtlasDetail, type AtlasDetailId } from './atlas-detail-model';
import type { AtlasHomeSnapshot, AtlasRange } from './atlas-types';

type Props = {
  onNavigate: (target: string) => void;
  snapshot?: AtlasHomeSnapshot;
};

const DEFAULT_SNAPSHOT: AtlasHomeSnapshot = {
  eyebrow: 'Portfolio',
  headlineValue: '$84,920',
  metrics: [
    { id: 'change', label: '24h', value: '+3.8%', subvalue: '+$3,182', tone: 'positive', detailId: 'portfolio-change' },
    { id: 'stakes', label: 'Stakes', value: '18', subvalue: '1 due soon', detailId: 'stakes' },
    { id: 'lp', label: 'LP', value: '$12.6K', subvalue: '15%', detailId: 'liquidity' },
    { id: 'noise', label: 'Noise', value: '2', subvalue: 'hidden', detailId: 'hidden-noise' },
  ],
  signals: [
    { id: 'plsx-strength', label: 'PLSX strength', value: '+4.1%', tone: 'positive', detailId: 'signal-plsx-strength' },
    { id: 'stake-soon', label: 'Stake soon', value: 'Open', tone: 'accent', detailId: 'stakes' },
    { id: 'lp-up', label: 'LP up', value: '15%', tone: 'muted', detailId: 'liquidity' },
  ],
  allocation: [
    { id: 'plsx', label: 'PLSX', width: 42, detailId: 'signal-plsx-strength' },
    { id: 'hex', label: 'HEX', width: 31, detailId: 'stakes' },
    { id: 'inc', label: 'INC', width: 12, detailId: 'liquidity' },
  ],
  tokens: [
    { id: 'pls', symbol: 'PLS', price: '$0.00000694', change: '-3.21%', ratio: '0.07 x Sac', tone: 'negative', detailId: 'token-pls' },
    { id: 'plsx', symbol: 'PLSX', price: '$0.0000053', change: '-3.51%', ratio: '0.76 PLS', tone: 'negative', detailId: 'signal-plsx-strength' },
    { id: 'inc', symbol: 'INC', price: '$0.317', change: '-2.69%', ratio: '45,740 PLS', tone: 'negative', detailId: 'liquidity' },
    { id: 'hex', symbol: 'HEX', price: '$0.00115', change: '-5.77%', ratio: '165 PLS', tone: 'negative', detailId: 'stakes' },
  ],
  details: {},
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
              <h2 id="atlas-token-heading">Your tokens</h2>
              <span>{snapshot.tokens.length}</span>
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
            <div className="atlas-home__panel">
              <div className="atlas-home__panel-head"><strong>Allocation</strong><span>wallet-aware</span></div>
              <div className="atlas-home__allocation" aria-label="Portfolio allocation">
                {snapshot.allocation.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`${item.label} allocation`}
                    style={{ width: `${Math.max(8, item.width)}%` }}
                    onClick={() => selectDetail(item.detailId)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="atlas-home__panel">
              <div className="atlas-home__panel-head"><strong>Signals</strong><span>{snapshot.signals.length}</span></div>
              {snapshot.signals.map((signal) => (
                <AtlasSignalRow key={signal.id} signal={signal} active={selectedDetailId === signal.detailId} onSelect={selectDetail} />
              ))}
            </div>
          </div>
        </div>

      </div>

      <AtlasDetailDrawer detail={detail} open={drawerOpen} onClose={() => setDrawerOpen(false)} onAction={onNavigate} />
      <AtlasDetailSheet detail={detail} open={sheetOpen} onClose={() => setSheetOpen(false)} onAction={onNavigate} />
    </section>
  );
}
