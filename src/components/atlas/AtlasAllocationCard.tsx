import type { AtlasAllocationModel } from './atlas-types';

type Props = {
  allocation: AtlasAllocationModel;
  activeDetailId?: string;
  onSelect: (detailId: string) => void;
};

export function AtlasAllocationCard({ allocation, activeDetailId, onSelect }: Props) {
  const segmentColors = [
    { background: 'var(--atlas-accent)', color: 'var(--atlas-on-accent)' },
    { background: 'var(--atlas-fg)', color: 'var(--atlas-on-fg)' },
    { background: 'var(--atlas-blue)', color: '#fff' },
    { background: 'var(--atlas-ink-2)', color: 'var(--atlas-fg)' },
    { background: '#2a3a31', color: '#d9ffe8' },
    { background: '#3f2b55', color: '#f0ddff' },
  ] as const;

  return (
    <section className="atlas-home__panel">
      <div className="atlas-home__panel-head">
        <strong>Allocation</strong>
        <span>hybrid</span>
      </div>

      <div className="atlas-home__allocation" aria-label="Portfolio allocation">
        {allocation.segments.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={`${item.label} allocation`}
            aria-pressed={activeDetailId === item.detailId}
            style={{
              width: `${Math.max(0, item.width)}%`,
              background: segmentColors[index % segmentColors.length].background,
              color: segmentColors[index % segmentColors.length].color,
            }}
            onClick={() => onSelect(item.detailId)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="atlas-home__allocation-weights">
        <div className="atlas-home__panel-head">
          <strong>Top weights</strong>
          <span>{allocation.topWeights.length}</span>
        </div>

        {allocation.topWeights.map((item) => (
          <button
            key={item.id}
            type="button"
            className="atlas-allocation-weight-row"
            aria-pressed={activeDetailId === item.detailId}
            onClick={() => onSelect(item.detailId)}
          >
            <span>{item.label}</span>
            <span>{item.value} / {item.percent.toFixed(1)}%</span>
          </button>
        ))}
      </div>
    </section>
  );
}
