import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import type { AtlasDetailContent } from './atlas-types';
import { AtlasDetailPanel } from './AtlasDetailPanel';

type Props = {
  detail: AtlasDetailContent;
  open: boolean;
  onClose: () => void;
  onAction: (target: string) => void;
};

export function AtlasDetailDrawer({ detail, open, onClose, onAction }: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    const isolatedElements = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== drawerRef.current)
      .map(element => ({
        element,
        ariaHidden: element.getAttribute('aria-hidden'),
        inert: element.inert,
      }));
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

    document.body.style.overflow = 'hidden';
    isolatedElements.forEach(({ element }) => {
      element.setAttribute('aria-hidden', 'true');
      element.inert = true;
    });
    closeButtonRef.current?.focus();
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      isolatedElements.forEach(({ element, ariaHidden, inert }) => {
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
        element.inert = inert;
      });
      previousFocus?.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div ref={drawerRef} className="atlas-detail-drawer" role="dialog" aria-modal="true" aria-label={`${detail.title} details`}>
      <button type="button" className="atlas-detail-drawer__backdrop" aria-label="Dismiss detail panel" onClick={onClose} />
      <div ref={bodyRef} className="atlas-detail-drawer__body">
        <button ref={closeButtonRef} type="button" className="atlas-detail-drawer__close" aria-label="Close detail panel" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
        <AtlasDetailPanel detail={detail} onAction={onAction} />
      </div>
    </div>,
    document.body,
  );
}
