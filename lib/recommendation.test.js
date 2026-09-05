import { describe, expect, it } from 'vitest';
import { pickPriorityTask, recommendAction } from './recommendation';

const NOW = new Date('2026-09-10T09:00:00');
const iso = daysFromNow => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};
const task = (id, overrides = {}) => ({ id, title: id, done: false, currentStep: { text: `Step for ${id}` }, ...overrides });

describe('pickPriorityTask', () => {
  it('returns null when there are no tasks', () => expect(pickPriorityTask([])).toBeNull());
  it('returns null when every task is done', () => expect(pickPriorityTask([task('a', { done: true })])).toBeNull());

  it('rule 1: ignores completed tasks entirely', () => {
    const result = pickPriorityTask([task('done-one', { done: true, due: iso(-5) }), task('open-one', { due: iso(3) })], NOW);
    expect(result.id).toBe('open-one');
  });

  it('rule 2: overdue beats due-today, which beats due-tomorrow, which beats due-this-week, which beats later/no-date', () => {
    expect(pickPriorityTask([task('later', { due: iso(20) }), task('overdue', { due: iso(-1) })], NOW).id).toBe('overdue');
    expect(pickPriorityTask([task('week', { due: iso(5) }), task('today', { due: iso(0) })], NOW).id).toBe('today');
    expect(pickPriorityTask([task('week', { due: iso(5) }), task('tomorrow', { due: iso(1) })], NOW).id).toBe('tomorrow');
    expect(pickPriorityTask([task('none', {}), task('week', { due: iso(6) })], NOW).id).toBe('week');
  });

  it('rule 3: within the same urgency, higher priority wins', () => {
    const result = pickPriorityTask([task('normal', { due: iso(3), priority: 'normal' }), task('high', { due: iso(3), priority: 'high' })], NOW);
    expect(result.id).toBe('high');
  });

  it('treats a missing priority as normal', () => {
    const result = pickPriorityTask([task('low', { due: iso(3), priority: 'low' }), task('unset', { due: iso(3) })], NOW);
    expect(result.id).toBe('unset');
  });

  it('rule 4: within the same urgency and priority, the earlier due date wins', () => {
    const result = pickPriorityTask([task('later-in-week', { due: iso(6) }), task('earlier-in-week', { due: iso(2) })], NOW);
    expect(result.id).toBe('earlier-in-week');
  });

  it('rule 5: a genuine tie is broken by original array order (stable)', () => {
    const a = task('a', { due: iso(3) });
    const b = task('b', { due: iso(3) });
    expect(pickPriorityTask([a, b], NOW).id).toBe('a');
    expect(pickPriorityTask([b, a], NOW).id).toBe('b');
  });

  it('is deterministic: the same input always produces the same output', () => {
    const tasks = [task('a', { due: iso(4) }), task('b', { due: iso(-1) }), task('c', { due: iso(0), priority: 'high' })];
    const first = pickPriorityTask(tasks, NOW).id;
    const second = pickPriorityTask([...tasks], NOW).id;
    expect(first).toBe(second);
    expect(first).toBe('b');
  });
});

describe('recommendAction', () => {
  it('returns null when there is nothing to recommend', () => expect(recommendAction([], 'Low', NOW)).toBeNull());

  it('uses the task\'s current step text when the band is not Higher', () => {
    const result = recommendAction([task('a', { due: iso(0) })], 'Low', NOW);
    expect(result.actionText).toBe('Step for a');
  });

  it('shrinks the action under a Higher pressure band without dropping the deadline', () => {
    const overdue = task('urgent', { due: iso(-2) });
    const result = recommendAction([overdue, task('later', { due: iso(10) })], 'Higher', NOW);
    expect(result.task.id).toBe('urgent');
    expect(result.actionText).toContain('Just open');
    expect(result.actionText).toContain('urgent');
  });

  it('never hides an overdue task just because pressure is high', () => {
    const overdue = task('overdue-task', { due: iso(-1) });
    const easy = task('easy-task', { due: iso(15) });
    const low = recommendAction([overdue, easy], 'Low', NOW);
    const higher = recommendAction([overdue, easy], 'Higher', NOW);
    expect(low.task.id).toBe('overdue-task');
    expect(higher.task.id).toBe('overdue-task');
  });
});
