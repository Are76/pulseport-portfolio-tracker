import type { AtlasTokenCardData } from './atlas-types';

type Props = {
  token: AtlasTokenCardData;
  active: boolean;
  onSelect: (detailId: string) => void;
};

export function AtlasTokenCard({ token, active, onSelect }: Props) {
  return (
    <button
      type="button"
      className={`atlas-clickable-card atlas-token-card atlas-tone-${token.tone ?? 'neutral'}`}
      aria-pressed={active}
      onClick={() => onSelect(token.detailId)}
    >
      <span className="atlas-token-card__top">
        <strong>{token.symbol}</strong>
        <span className="atlas-mono">{token.change}</span>
      </span>
      <span className="atlas-token-card__price atlas-mono">{token.price}</span>
      {token.ratio ? <span className="atlas-token-card__ratio">{token.ratio}</span> : null}
    </button>
  );
}
