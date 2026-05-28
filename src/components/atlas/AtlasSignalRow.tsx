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
      <span className="atlas-signal-strip" aria-hidden="true" />
      <strong>{signal.label}</strong>
      <span className="atlas-mono">{signal.value}</span>
    </button>
  );
}
