import type { AtlasDetailContent } from './atlas-types';
import { AtlasDetailPanel } from './AtlasDetailPanel';

type Props = {
  detail: AtlasDetailContent;
  open: boolean;
  onClose: () => void;
  onAction: (target: string) => void;
};

export function AtlasDetailSheet({ detail, open, onClose, onAction }: Props) {
  if (!open) return null;

  return (
    <div className="atlas-detail-sheet" role="dialog" aria-modal="true" aria-label={`${detail.title} details`}>
      <button type="button" className="atlas-detail-sheet__backdrop" aria-label="Close detail panel" onClick={onClose} />
      <div className="atlas-detail-sheet__body">
        <button type="button" className="atlas-detail-sheet__close" onClick={onClose}>Close</button>
        <AtlasDetailPanel detail={detail} onAction={onAction} />
      </div>
    </div>
  );
}
