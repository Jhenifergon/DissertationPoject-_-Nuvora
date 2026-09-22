'use client';

import { useEffect, useRef } from 'react';
import { Mascot } from '@/components/ui/Mascot';

// Shown when loading the student's data fails outright (not merely slow).
// Calm, specific, and — importantly — honest that nothing has been lost,
// since a failed *read* never touches anything already saved.
export function LoadError({ onRetry, onSignOut }) {
  const headingRef = useRef(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  return <main><section className="phone splash">
    <Mascot size={90} mood="neutral" />
    <h1 ref={headingRef} tabIndex={-1} style={{ textAlign: 'center' }}>We couldn’t load your study space.</h1>
    <p>Your data hasn’t been changed.</p>
    <button className="primary" onClick={onRetry}>Try again</button>
    <button className="link" onClick={onSignOut}>Sign out</button>
  </section></main>;
}
