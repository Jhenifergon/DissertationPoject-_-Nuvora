// A tiny pure helper so the countdown display logic is testable without
// needing to drive React timers in a test.
export function formatSeconds(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
