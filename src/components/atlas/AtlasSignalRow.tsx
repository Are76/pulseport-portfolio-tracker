import type { AtlasSignal } from './atlas-types';

type Props = {
  signal: AtlasSignal;
  active: boolean;
  onSelect: (detailId: string) => void;
};

export function AtlasSignalRow({ signal, active, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`atlas-clickable-card atlas-signal-row atlas-tone-${signal.tone ?? 'neutral'}`}
      aria-pressed={active}
      onClick={() => onSelect(signal.detailId)}
    >
      <span className={`atlas-signal-icon atlas-signal-icon--${signal.iconKey ?? 'holding'}`} aria-hidden="true" />
      <span className="atlas-signal-copy">
        <strong>{signal.label}</strong>
        {signal.description ? <small>{signal.description}</small> : null}
      </span>
      <span className="atlas-mono">{signal.value}</span>
    </button>
  );
}
