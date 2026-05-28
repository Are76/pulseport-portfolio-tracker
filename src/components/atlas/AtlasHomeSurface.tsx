import { useMemo, useState } from 'react';

import { AtlasDetailPanel } from './AtlasDetailPanel';
import { AtlasDetailSheet } from './AtlasDetailSheet';
import { AtlasMetricTile } from './AtlasMetricTile';
import { AtlasSignalRow } from './AtlasSignalRow';
import { AtlasTokenCard } from './AtlasTokenCard';
import { buildAtlasDetail, type AtlasDetailId } from './atlas-detail-model';
import type { AtlasMetric, AtlasSignal, AtlasTokenCardData } from './atlas-types';

type Props = {
  onNavigate: (target: string) => void;
};

const METRICS: AtlasMetric[] = [
  { id: 'change', label: '24h', value: '+3.8%', subvalue: '+$3,182', tone: 'positive', detailId: 'portfolio-change' },
  { id: 'stakes', label: 'Stakes', value: '18', subvalue: '1 due soon', detailId: 'stakes' },
  { id: 'lp', label: 'LP', value: '$12.6K', subvalue: '15%', detailId: 'liquidity' },
  { id: 'noise', label: 'Noise', value: '2', subvalue: 'hidden', detailId: 'hidden-noise' },
];

const SIGNALS: AtlasSignal[] = [
  { id: 'plsx-strength', label: 'PLSX strength', value: '+4.1%', tone: 'positive', detailId: 'signal-plsx-strength' },
  { id: 'stake-soon', label: 'Stake soon', value: 'Open', tone: 'accent', detailId: 'stakes' },
  { id: 'lp-up', label: 'LP up', value: '15%', tone: 'muted', detailId: 'liquidity' },
];

const TOKENS: AtlasTokenCardData[] = [
  { id: 'pls', symbol: 'PLS', price: '$0.00000694', change: '-3.21%', ratio: '0.07 x Sac', tone: 'negative', detailId: 'token-pls' },
  { id: 'plsx', symbol: 'PLSX', price: '$0.0000053', change: '-3.51%', ratio: '0.76 PLS', tone: 'negative', detailId: 'signal-plsx-strength' },
  { id: 'inc', symbol: 'INC', price: '$0.317', change: '-2.69%', ratio: '45,740 PLS', tone: 'negative', detailId: 'liquidity' },
  { id: 'hex', symbol: 'HEX', price: '$0.00115', change: '-5.77%', ratio: '165 PLS', tone: 'negative', detailId: 'stakes' },
];

export function AtlasHomeSurface({ onNavigate }: Props) {
  const [selectedDetailId, setSelectedDetailId] = useState<AtlasDetailId | string>('portfolio-change');
  const [sheetOpen, setSheetOpen] = useState(false);
  const detail = useMemo(() => buildAtlasDetail(selectedDetailId), [selectedDetailId]);

  const selectDetail = (detailId: string) => {
    setSelectedDetailId(detailId);
    const shouldOpenSheet = typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 767px)').matches;
    setSheetOpen(shouldOpenSheet);
  };

  return (
    <section className="atlas-home atlas-surface">
      <header className="atlas-home__hero">
        <div>
          <span className="atlas-home__eyebrow">Portfolio</span>
          <h1 className="atlas-mono">$84,920</h1>
        </div>
        <div className="atlas-home__range" aria-label="Time range">
          <button type="button" className="is-active">24h</button>
          <button type="button">7d</button>
          <button type="button">30d</button>
          <button type="button">90d</button>
        </div>
      </header>

      <div className="atlas-home__layout">
        <div>
          <div className="atlas-home__metrics">
            {METRICS.map((metric) => (
              <AtlasMetricTile key={metric.id} metric={metric} active={selectedDetailId === metric.detailId} onSelect={selectDetail} />
            ))}
          </div>

          <div className="atlas-home__middle">
            <div className="atlas-home__panel">
              <div className="atlas-home__panel-head"><strong>Signals</strong><span>4</span></div>
              {SIGNALS.map((signal) => (
                <AtlasSignalRow key={signal.id} signal={signal} active={selectedDetailId === signal.detailId} onSelect={selectDetail} />
              ))}
            </div>
            <div className="atlas-home__panel">
              <div className="atlas-home__panel-head"><strong>Allocation</strong><span>wallet-aware</span></div>
              <div className="atlas-home__allocation" aria-label="Portfolio allocation">
                <span style={{ width: '42%' }}>PLSX</span>
                <span style={{ width: '31%' }}>HEX</span>
                <span style={{ width: '12%' }}>INC</span>
              </div>
            </div>
          </div>

          <div className="atlas-home__tokens">
            {TOKENS.map((token) => (
              <AtlasTokenCard key={token.id} token={token} active={selectedDetailId === token.detailId} onSelect={selectDetail} />
            ))}
          </div>
        </div>

        <AtlasDetailPanel detail={detail} onAction={onNavigate} />
      </div>

      <AtlasDetailSheet detail={detail} open={sheetOpen} onClose={() => setSheetOpen(false)} onAction={onNavigate} />
    </section>
  );
}
