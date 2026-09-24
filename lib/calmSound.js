// A soft, continuous background sound for Calm Mode.
//
// It is a quiet, low, sustained chord (three sine tones, G3–D4–G4, with a
// slight detune for warmth) whose volume rises and falls very slowly, about
// once every 12 seconds, like slow breathing. A low-pass filter removes any
// harshness. It is generated with the Web Audio API, so there is no audio
// file to bundle.
//
// Nuvora does not claim this treats or calms ADHD. It is offered because
// some people find a steady background sound helps them settle and screen
// out distractions, and it is entirely optional:
//  • it only starts from a tap (turning Calm Mode on, or the header's sound
//    button) — phones and WebViews only allow sound to start from a tap,
//    and Nuvora never plays anything by itself on load;
//  • a sound button stays in the header for as long as Calm Mode is on, so
//    it can be stopped at any moment (WCAG 1.4.2, Audio Control);
//  • it fades in and out rather than starting or stopping abruptly;
//  • it can be switched off in Settings.
// If Web Audio is unavailable or blocked, it silently does nothing.

const CHORD = [
  { freq: 196.0, gain: 0.5 },   // G3
  { freq: 293.66, gain: 0.35 }, // D4
  { freq: 392.0, gain: 0.15 },  // G4, quietest
];
const DETUNE_CENTS = 4;         // a second, slightly detuned voice per note
const MASTER_GAIN = 0.035;      // quiet: background, never foreground
const BREATH_HZ = 1 / 12;       // one slow swell every ~12 seconds
const BREATH_DEPTH = 0.3;       // volume moves ±30% around the base level
const FADE_IN = 2.5;            // seconds
const FADE_OUT = 1.2;           // seconds

let current = null; // { ctx, master, sources } while playing

export function isCalmSoundPlaying() {
  return current !== null;
}

// Starts the sound (if it is not already playing). Returns true if it is
// now playing, false if audio is unavailable or was blocked.
export function startCalmSound() {
  if (current) return true;
  try {
    const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
    if (!AudioCtx) return false;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(MASTER_GAIN, now + FADE_IN);
    filter.connect(master);
    master.connect(ctx.destination);

    // Slow "breathing": a very low-frequency oscillator nudges the volume.
    const breath = ctx.createOscillator();
    const breathDepth = ctx.createGain();
    breath.frequency.value = BREATH_HZ;
    breathDepth.gain.value = MASTER_GAIN * BREATH_DEPTH;
    breath.connect(breathDepth);
    breathDepth.connect(master.gain);

    const sources = [breath];
    for (const { freq, gain } of CHORD) {
      for (const detune of [-DETUNE_CENTS, DETUNE_CENTS]) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = detune;
        g.gain.value = gain / 2;
        osc.connect(g);
        g.connect(filter);
        sources.push(osc);
      }
    }
    for (const s of sources) s.start(now);

    current = { ctx, master, sources };
    return true;
  } catch {
    current = null;
    return false;
  }
}

// Fades the sound out and releases the audio device. Safe to call when
// nothing is playing.
export function stopCalmSound() {
  if (!current) return;
  const { ctx, master, sources } = current;
  current = null;
  try {
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + FADE_OUT);
    for (const s of sources) s.stop(now + FADE_OUT + 0.05);
    setTimeout(() => { ctx.close().catch(() => {}); }, (FADE_OUT + 0.3) * 1000);
  } catch {
    try { ctx.close(); } catch { /* already closed */ }
  }
}
