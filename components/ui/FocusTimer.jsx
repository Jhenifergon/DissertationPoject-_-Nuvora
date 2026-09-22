'use client';

import { useEffect, useRef, useState } from 'react';
import { formatSeconds } from '@/lib/timer';

// A real, working countdown timer — Overwhelmed Mode's "low energy" path
// and Learn's "two-minute task starter" both used to just describe a timer
// in text without actually having one. The optional tone is a plain
// generated sine wave (Web Audio API) at low volume, started only by an
// explicit tap — never bundled audio, never autoplay, matching the "no
// background music, nothing plays itself" rule.
export function FocusTimer({ seconds = 120, showTone = true }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [toneOn, setToneOn] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  function stopTone() {
    if (!audioRef.current) return;
    try { audioRef.current.oscillator.stop(); audioRef.current.ctx.close(); } catch { /* already stopped */ }
    audioRef.current = null;
  }
  useEffect(() => stopTone, []);

  function toggleTone() {
    if (toneOn) { stopTone(); setToneOn(false); return; }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 220;
      gain.gain.value = 0.03;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      audioRef.current = { ctx, oscillator, gain };
      setToneOn(true);
    } catch { /* Web Audio unavailable — the timer itself still works fine */ }
  }

  return <div className="focus-timer">
    <div className="timer-display" role="status" aria-live="polite">{finished ? 'Time’s up — well done.' : formatSeconds(remaining)}</div>
    <div className="row">
      {!running && <button className="primary" onClick={() => { setFinished(false); setRunning(true); }}>{remaining === seconds ? 'Start' : 'Resume'}</button>}
      {running && <button onClick={() => setRunning(false)}>Pause</button>}
      <button onClick={() => { setRunning(false); setFinished(false); setRemaining(seconds); }} disabled={remaining === seconds && !running}>Reset</button>
    </div>
    {showTone && <button className="link" onClick={toggleTone}>{toneOn ? 'Turn off soft tone' : 'Play a soft tone (optional)'}</button>}
  </div>;
}
