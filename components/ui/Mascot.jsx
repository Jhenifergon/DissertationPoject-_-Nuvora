'use client';

// A small, friendly cloud mascot, matching the brand's hand-drawn wireframe
// style. `mood` only changes the mouth/eyes — never the body colour — so it
// stays visually calm rather than becoming an alarm indicator.
export function Mascot({ size = 64, mood = 'calm' }) {
  const mouth = { calm: 'M40 55 Q52 63 64 55', worried: 'M40 58 Q52 52 64 58', neutral: 'M42 56 Q52 60 62 56' }[mood];
  return <svg className="mascot" width={size} height={size * 0.75} viewBox="0 0 104 78" aria-hidden="true">
    <ellipse cx="52" cy="60" rx="40" ry="7" fill="var(--purple-soft)" />
    <ellipse cx="52" cy="48" rx="46" ry="21" fill="var(--mascot)" opacity="0.85" />
    <circle cx="28" cy="37" r="21" fill="var(--mascot)" opacity="0.85" />
    <circle cx="76" cy="37" r="21" fill="var(--mascot)" opacity="0.85" />
    <circle cx="52" cy="27" r="25" fill="var(--mascot)" opacity="0.85" />
    <circle cx="40" cy="42" r="3.2" fill="var(--ink)" />
    <circle cx="64" cy="42" r="3.2" fill="var(--ink)" />
    <path d={mouth} stroke="var(--ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </svg>;
}
