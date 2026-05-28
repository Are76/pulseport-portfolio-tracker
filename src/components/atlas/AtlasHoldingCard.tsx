import { ChevronRight } from 'lucide-react';

import type { AtlasHoldingCardData } from './atlas-holding-card-model';

type Props = {
  card: AtlasHoldingCardData;
  onSelect: (id: string) => void;
};

export function AtlasHoldingCard({ card, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`atlas-holding-card atlas-holding-card--${card.tone}`}
      onClick={() => onSelect(card.id)}
    >
      <span className="atlas-holding-card__top">
        <span className="atlas-holding-card__identity">
          <span className="atlas-holding-card__logo">
            {card.logoUrl ? <img src={card.logoUrl} alt={card.symbol} /> : card.symbol.slice(0, 1)}
          </span>
          <span>
            <strong>{card.title}</strong>
            <small>{card.symbol} / {card.chain}</small>
          </span>
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </span>
      <span className="atlas-holding-card__value">
        <strong>{card.value}</strong>
        <small className="atlas-mono">{card.change}</small>
      </span>
      <span className="atlas-holding-card__meta">
        <span><b>{card.price}</b><small>Price</small></span>
        <span><b>{card.balance}</b><small>Balance</small></span>
        <span><b>{card.share}</b><small>Share</small></span>
      </span>
    </button>
  );
}
