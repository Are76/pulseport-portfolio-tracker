import type { AtlasMetric } from './atlas-types';

type Props = {
  metric: AtlasMetric;
  active: boolean;
  onSelect: (detailId: string) => void;
};

export function AtlasMetricTile({ metric, active, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`atlas-clickable-card atlas-metric-tile atlas-tone-${metric.tone ?? 'neutral'}`}
      aria-pressed={active}
      onClick={() => onSelect(metric.detailId)}
    >
      <span className="atlas-label">{metric.label}</span>
      <strong className="atlas-metric-value atlas-mono">{metric.value}</strong>
      {metric.subvalue ? <small>{metric.subvalue}</small> : null}
    </button>
  );
}
