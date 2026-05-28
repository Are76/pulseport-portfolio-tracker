import { ChevronRight } from 'lucide-react';

import type { AtlasIntelligenceCardData } from './atlas-intelligence-card-model';

type Props = {
  card: AtlasIntelligenceCardData;
  active?: boolean;
  onSelect: (target: string) => void;
};

export function AtlasIntelligenceCard({ card, active = false, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`atlas-intelligence-card atlas-intelligence-card--${card.tone ?? 'neutral'}${active ? ' is-active' : ''}`}
      onClick={() => onSelect(card.target)}
    >
      <span>
        <small>{card.label}</small>
        <strong>{card.value}</strong>
        <em>{card.subvalue}</em>
      </span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  );
}
