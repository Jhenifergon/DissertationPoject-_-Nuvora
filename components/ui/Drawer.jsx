'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

// An accessible drawer: moves focus in on open, returns it to the trigger
// on close, traps Tab/Shift+Tab within itself, and closes on Escape or a
// click on the backdrop — none of which the previous version did.
export function Drawer({ open, onClose, triggerRef, children }) {
  const drawerRef = useRef(null);
  const firstFocusableRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const triggerEl = triggerRef.current;
    firstFocusableRef.current?.focus();
    function onKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (triggerEl?.isConnected) triggerEl.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;
  return <>
    <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu" ref={drawerRef}>
      <button className="icon close" ref={firstFocusableRef} onClick={onClose} aria-label="Close menu"><X /></button>
      {children}
    </div>
  </>;
}
