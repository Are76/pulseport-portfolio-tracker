import type { AtlasAllocationModel } from './atlas-types';

type Props = {
  allocation: AtlasAllocationModel;
  activeDetailId?: string;
  onSelect: (detailId: string) => void;
};

export function AtlasAllocationCard({ allocation, activeDetailId, onSelect }: Props) {
  return (
    <section className="atlas-home__panel">
      <div className="atlas-home__panel-head">
        <strong>Allocation</strong>
        <span>hybrid</span>
      </div>

      <div className="atlas-home__allocation" aria-label="Portfolio allocation">
        {allocation.segments.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={`${item.label} allocation`}
            aria-pressed={activeDetailId === item.detailId}
            style={{ width: `${Math.max(0, item.width)}%` }}
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
