import { describe, expect, it } from 'vitest';
import { makeCustomStep, nextStepAfter, suggestAlternativeSteps } from './steps';

const task = (id, currentStep) => ({ id, currentStep });

describe('suggestAlternativeSteps', () => {
  it('returns more than one alternative, each with a unique id', () => {
    const alts = suggestAlternativeSteps(task('t1'));
    expect(alts.length).toBeGreaterThan(1);
    const ids = new Set(alts.map(a => a.id));
    expect(ids.size).toBe(alts.length);
  });
  it('every alternative starts undone', () => {
    suggestAlternativeSteps(task('t1')).forEach(a => {
      expect(a.done).toBe(false);
      expect(a.completedAt).toBeNull();
    });
  });
});

describe('makeCustomStep', () => {
  it('builds a fresh, undone step from user-edited text', () => {
    const step = makeCustomStep(task('t1'), '  Read page 3  ');
    expect(step.text).toBe('Read page 3');
    expect(step.done).toBe(false);
    expect(step.completedAt).toBeNull();
  });
});

describe('nextStepAfter', () => {
  it('moves to the next step in the fixed progression', () => {
    const first = nextStepAfter(task('t1', { text: 'Open the file or page and read only the title.' }));
    expect(first.text).toBe('Write or type just the first sentence.');
  });

  it('falls back to a supportive message once the progression is exhausted', () => {
    const last = nextStepAfter(task('t1', { text: 'Look back over what you have done so far.' }));
    expect(last.text).toMatch(/progress/i);
  });

  it('falls back gracefully for a step outside the known progression', () => {
    const result = nextStepAfter(task('t1', { text: 'Some custom step the user typed.' }));
    expect(typeof result.text).toBe('string');
    expect(result.text.length).toBeGreaterThan(0);
  });

  it('always returns an undone step', () => {
    const result = nextStepAfter(task('t1', { text: 'Write or type just the first sentence.' }));
    expect(result.done).toBe(false);
    expect(result.completedAt).toBeNull();
  });
});
