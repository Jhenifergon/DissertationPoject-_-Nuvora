
import { afterEach, describe, expect, it, vi } from 'vitest';
import { isCalmSoundPlaying, startCalmSound, stopCalmSound } from './calmSound';

// jsdom has no Web Audio, so a small stand-in records what the sound asks
// for. Each AudioParam remembers the values it is ramped to.
function fakeAudio() {
  const made = { contexts: [], oscillators: [], masterPeaks: [] };
  const param = (value = 0) => ({
    value,
    setValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(v => made.masterPeaks.push(v)),
  });
  class FakeContext {
    constructor() { this.currentTime = 0; this.destination = {}; this.closed = false; made.contexts.push(this); }
    createOscillator() {
      const o = { type: '', frequency: param(), detune: param(), connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      made.oscillators.push(o);
      return o;
    }
    createGain() { return { gain: param(1), connect: vi.fn() }; }
    createBiquadFilter() { return { type: '', frequency: param(), connect: vi.fn() }; }
    close() { this.closed = true; return Promise.resolve(); }
  }
  return { FakeContext, made };
}

afterEach(() => {
  stopCalmSound();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('calm background sound', () => {
  it('starts a quiet, continuous sound that keeps playing until stopped', () => {
    const { FakeContext, made } = fakeAudio();
    vi.stubGlobal('AudioContext', FakeContext);

    expect(startCalmSound()).toBe(true);
    expect(isCalmSoundPlaying()).toBe(true);
    // Six chord voices plus the slow "breathing" oscillator; none is told to
    // stop when started, so the sound continues.
    expect(made.oscillators).toHaveLength(7);
    expect(made.oscillators.every(o => o.start.mock.calls.length === 1)).toBe(true);
    expect(made.oscillators.every(o => o.stop.mock.calls.length === 0)).toBe(true);
    // Quiet: the loudest level it fades up to stays far below full volume.
    expect(Math.max(...made.masterPeaks)).toBeLessThanOrEqual(0.05);
  });

  it('does not start a second copy if already playing', () => {
    const { FakeContext, made } = fakeAudio();
    vi.stubGlobal('AudioContext', FakeContext);
    startCalmSound();
    startCalmSound();
    expect(made.contexts).toHaveLength(1);
  });

  it('fades out, stops every voice and releases the audio device when stopped', () => {
    vi.useFakeTimers();
    const { FakeContext, made } = fakeAudio();
    vi.stubGlobal('AudioContext', FakeContext);
    startCalmSound();
    stopCalmSound();

    expect(isCalmSoundPlaying()).toBe(false);
    expect(made.oscillators.every(o => o.stop.mock.calls.length === 1)).toBe(true);
    vi.runAllTimers();
    expect(made.contexts[0].closed).toBe(true);
  });

  it('stopping when nothing is playing is harmless', () => {
    expect(() => stopCalmSound()).not.toThrow();
  });

  it('returns false and does nothing when Web Audio is unavailable or blocked', () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    expect(startCalmSound()).toBe(false);
    expect(isCalmSoundPlaying()).toBe(false);

    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('NotAllowedError'); } });
    expect(startCalmSound()).toBe(false);
    expect(isCalmSoundPlaying()).toBe(false);
  });
});
