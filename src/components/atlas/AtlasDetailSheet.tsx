import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import type { AtlasDetailContent } from './atlas-types';
import { AtlasDetailPanel } from './AtlasDetailPanel';

type Props = {
  detail: AtlasDetailContent;
  open: boolean;
  onClose: () => void;
  onAction: (target: string) => void;
};

export function AtlasDetailSheet({ detail, open, onClose, onAction }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusableControls = bodyRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusableControls?.length) return;

      const firstControl = focusableControls[0];
      const lastControl = focusableControls[focusableControls.length - 1];
      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    };

    closeButtonRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="atlas-detail-sheet" role="dialog" aria-modal="true" aria-label={`${detail.title} details`}>
      <button type="button" className="atlas-detail-sheet__backdrop" aria-label="Dismiss detail panel" onClick={onClose} />
      <div ref={bodyRef} className="atlas-detail-sheet__body">
        <span className="atlas-detail-sheet__handle" aria-hidden="true" />
        <button ref={closeButtonRef} type="button" className="atlas-detail-sheet__close" aria-label="Close detail panel" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <AtlasDetailPanel detail={detail} onAction={onAction} />
      </div>
    </div>
  );
}
