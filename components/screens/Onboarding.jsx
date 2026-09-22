'use client';

import { useState } from 'react';
import { Mascot } from '@/components/ui/Mascot';

const ONBOARDING_SCREENS = [
  { title: 'Move forward without pressure', text: 'Nuvora helps turn academic overload into one manageable next step.' },
  { title: 'Support, not diagnosis', text: 'Check-ins help Nuvora suggest study support. They are not medical assessments or diagnoses.' },
  { title: 'You stay in control', text: 'Your tasks and check-ins stay private to your account and are not automatically shared with your university.' },
];

// Shown once, only in Firebase mode (a genuine first-time visitor), before
// Auth — local/demo mode skips straight in, as it always has. Kept short
// on purpose: three small screens, not a long carousel.
export function Onboarding({ onDone }) {
  const [step, setStep] = useState(0);
  const screen = ONBOARDING_SCREENS[step];
  const last = step === ONBOARDING_SCREENS.length - 1;
  return <main><section className="phone splash">
    <Mascot size={90} />
    <h1>{screen.title}</h1>
    <p>{screen.text}</p>
    <div className="row" style={{ justifyContent: 'center', gap: 6, margin: '10px 0 18px' }} aria-hidden="true">
      {ONBOARDING_SCREENS.map((_, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === step ? 'var(--purple)' : 'var(--purple-soft)' }} />)}
    </div>
    <button className="primary" onClick={() => (last ? onDone() : setStep(s => s + 1))}>{last ? 'Get started' : 'Continue'}</button>
    {!last && <button className="link" onClick={onDone}>Skip</button>}
  </section></main>;
}
