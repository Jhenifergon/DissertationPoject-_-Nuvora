import { describe, expect, it } from 'vitest';
import { initialStepText, makeCustomStep, nextStepAfter, suggestAlternativeSteps, TASK_TYPES } from './steps';

const task = (id, currentStep, taskType) => ({ id, currentStep, taskType });

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

describe('task-type-aware progressions', () => {
  it('TASK_TYPES includes general plus at least 5 specific types', () => {
    expect(TASK_TYPES.find(t => t.id === 'general')).toBeTruthy();
    expect(TASK_TYPES.length).toBeGreaterThanOrEqual(6);
  });

  it('initialStepText differs by task type', () => {
    const essay = initialStepText('essay');
    const exam = initialStepText('exam');
    const general = initialStepText('general');
    expect(essay).not.toBe(exam);
    expect(essay).not.toBe(general);
    expect(typeof essay).toBe('string');
  });

  it('falls back to the general progression for an unset or unknown task type', () => {
    expect(initialStepText(undefined)).toBe(initialStepText('general'));
    expect(initialStepText('not-a-real-type')).toBe(initialStepText('general'));
  });

  it('nextStepAfter follows the progression for the task\'s own type, not a different one', () => {
    const essayFirst = initialStepText('essay');
    const next = nextStepAfter(task('t1', { text: essayFirst }, 'essay'));
    // Should be the essay type's second step, not general's.
    expect(next.text).not.toBe(nextStepAfter(task('t1', { text: initialStepText('general') }, 'general')).text);
    expect(next.text).toContain('argue');
  });

  it('each task type\'s progression eventually ends in the same supportive closing message', () => {
    for (const { id } of TASK_TYPES) {
      let step = { text: initialStepText(id) };
      let text = '';
      for (let i = 0; i < 10; i++) {
        const next = nextStepAfter({ id: 't1', currentStep: step, taskType: id });
        text = next.text;
        if (text.match(/progress/i)) break;
        step = { text };
      }
      expect(text).toMatch(/progress/i);
    }
  });
});
