'use client';

import { useEffect, useRef } from 'react';

// Reusable modal sheet with complete keyboard focus management. This mirrors
// the accessible menu drawer behaviour: focus enters the dialog when it opens,
// Tab/Shift+Tab stay inside it, Escape closes it, and focus returns to the
// control that opened it.
export function AccessibleSheet({ label, onClose, triggerRef, children }) {
  const sheetRef = useRef(null);

  useEffect(() => {
    const triggerEl = triggerRef.current;
    const sheet = sheetRef.current;
    if (!sheet) return undefined;

    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const initialTarget = sheet.querySelector('[autofocus]') || sheet.querySelector(focusableSelector);
    initialTarget?.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab' || !sheetRef.current) return;

      const focusable = Array.from(sheetRef.current.querySelectorAll(focusableSelector));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (triggerEl?.isConnected) triggerEl.focus();
    };
  }, [onClose, triggerRef]);

  return <>
    <div className="sheet-backdrop" aria-hidden="true" onClick={onClose} />
    <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={sheetRef}>
      {children}
    </div>
  </>;
}
