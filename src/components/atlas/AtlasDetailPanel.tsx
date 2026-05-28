import type { AtlasDetailContent } from './atlas-types';

type Props = {
  detail: AtlasDetailContent;
  onAction: (target: string) => void;
};

export function AtlasDetailPanel({ detail, onAction }: Props) {
  return (
    <aside className="atlas-detail-panel" aria-label={`${detail.title} details`}>
      <div className="atlas-detail-breadcrumb">{detail.breadcrumb.join(' > ')}</div>
      <h2>{detail.title}</h2>
      <p>{detail.summary}</p>
      <div className="atlas-detail-facts">
        {detail.facts.map((fact) => (
          <div key={`${detail.id}-${fact.label}`} className={`atlas-detail-fact atlas-tone-${fact.tone ?? 'neutral'}`}>
            <span>{fact.label}</span>
            <strong className="atlas-mono">{fact.value}</strong>
          </div>
        ))}
      </div>
      <div className="atlas-detail-actions">
        {detail.actions.map((action) => (
          <button
            key={`${detail.id}-${action.label}`}
            type="button"
            className={action.variant === 'primary' ? 'is-primary' : undefined}
            onClick={() => onAction(action.target)}
          >
            {action.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
