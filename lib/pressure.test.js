import { describe, expect, it } from 'vitest';
import { combineWorkloadPressure, countDeadlines, deadlineAdjustment } from './pressure';

const NOW = new Date('2026-09-10T09:00:00');
const iso = daysFromNow => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};
const task = (due, done = false) => ({ due, done });

describe('countDeadlines', () => {
  it('counts each open task into exactly one tier', () => {
    const tasks = [task(iso(-1)), task(iso(0)), task(iso(1)), task(iso(5)), task(iso(20))];
    expect(countDeadlines(tasks, NOW)).toEqual({ overdueCount: 1, dueSoonCount: 2, dueWeekCount: 1 });
  });
  it('ignores completed tasks entirely', () => {
    const tasks = [task(iso(-5), true), task(iso(-1), false)];
    expect(countDeadlines(tasks, NOW)).toEqual({ overdueCount: 1, dueSoonCount: 0, dueWeekCount: 0 });
  });
  it('ignores tasks with no due date', () => {
    expect(countDeadlines([{ due: '', done: false }], NOW)).toEqual({ overdueCount: 0, dueSoonCount: 0, dueWeekCount: 0 });
  });
});

describe('deadlineAdjustment (tier boundaries)', () => {
  it('none: nothing overdue/soon/this week', () => {
    expect(deadlineAdjustment({ overdueCount: 0, dueSoonCount: 0, dueWeekCount: 0 })).toEqual({ level: 'none', points: 0 });
  });
  it('mild: exactly 1 due soon', () => {
    expect(deadlineAdjustment({ overdueCount: 0, dueSoonCount: 1, dueWeekCount: 0 })).toEqual({ level: 'mild', points: 5 });
  });
  it('mild: exactly 3 due this week (2 does not qualify)', () => {
    expect(deadlineAdjustment({ overdueCount: 0, dueSoonCount: 0, dueWeekCount: 2 })).toEqual({ level: 'none', points: 0 });
    expect(deadlineAdjustment({ overdueCount: 0, dueSoonCount: 0, dueWeekCount: 3 })).toEqual({ level: 'mild', points: 5 });
  });
  it('moderate: exactly 1 overdue', () => {
    expect(deadlineAdjustment({ overdueCount: 1, dueSoonCount: 0, dueWeekCount: 0 })).toEqual({ level: 'moderate', points: 12 });
  });
  it('moderate: exactly 2 due soon (1 only reaches mild)', () => {
    expect(deadlineAdjustment({ overdueCount: 0, dueSoonCount: 2, dueWeekCount: 0 })).toEqual({ level: 'moderate', points: 12 });
  });
  it('high: 2 or more overdue', () => {
    expect(deadlineAdjustment({ overdueCount: 2, dueSoonCount: 0, dueWeekCount: 0 })).toEqual({ level: 'high', points: 20 });
    expect(deadlineAdjustment({ overdueCount: 5, dueSoonCount: 4, dueWeekCount: 6 })).toEqual({ level: 'high', points: 20 });
  });
  it('most-severe-wins: overdue outranks due-soon and due-week even if they also qualify', () => {
    expect(deadlineAdjustment({ overdueCount: 1, dueSoonCount: 2, dueWeekCount: 3 })).toEqual({ level: 'moderate', points: 12 });
  });
});

// These mirror the approved scenario table from the Phase 2 item 5
// proposal exactly, so the proposal and the implementation stay traceable
// to each other.
describe('combineWorkloadPressure — approved scenario table', () => {
  const scenarios = [
    { n: 1, baseScore: 10, overdue: 0, soon: 0, week: 0, adjusted: 10, band: 'Low' },
    { n: 2, baseScore: 10, overdue: 0, soon: 0, week: 3, adjusted: 15, band: 'Low' },
    { n: 3, baseScore: 30, overdue: 1, soon: 0, week: 0, adjusted: 42, band: 'Moderate' },
    { n: 4, baseScore: 60, overdue: 2, soon: 1, week: 2, adjusted: 80, band: 'Higher' },
    { n: 5, baseScore: 90, overdue: 0, soon: 0, week: 0, adjusted: 90, band: 'Higher' },
    { n: 6, baseScore: 0, overdue: 5, soon: 4, week: 6, adjusted: 20, band: 'Low' },
    { n: 7, baseScore: 33, overdue: 0, soon: 0, week: 0, adjusted: 33, band: 'Low' },
    { n: 8, baseScore: 32, overdue: 1, soon: 0, week: 0, adjusted: 44, band: 'Moderate' },
    { n: 9, baseScore: 66, overdue: 0, soon: 1, week: 0, adjusted: 71, band: 'Higher' },
    { n: 10, baseScore: 66, overdue: 0, soon: 0, week: 0, adjusted: 66, band: 'Moderate' },
    { n: 11, baseScore: 50, overdue: 0, soon: 2, week: 5, adjusted: 62, band: 'Moderate' },
  ];

  function makeTasks({ overdue, soon, week }) {
    const tasks = [];
    for (let i = 0; i < overdue; i++) tasks.push(task(iso(-1 - i)));
    for (let i = 0; i < soon; i++) tasks.push(task(iso(i % 2))); // alternates today/tomorrow
    for (let i = 0; i < week; i++) tasks.push(task(iso(2 + (i % 6)))); // spread across days 2-7
    return tasks;
  }

  it.each(scenarios)('scenario $n: base $baseScore + overdue=$overdue soon=$soon week=$week -> $adjusted ($band)', s => {
    const baseRisk = { score: s.baseScore, factors: { workload: 0, taskInitiation: 0, focus: 0, rest: 0, confidence: 0 }, band: 'placeholder', message: 'placeholder' };
    const result = combineWorkloadPressure(baseRisk, makeTasks(s), NOW);
    expect(result.score).toBe(s.adjusted);
    expect(result.band).toBe(s.band);
  });
});

describe('combineWorkloadPressure — general behaviour', () => {
  it('keeps the original self-report score available as baseScore', () => {
    const baseRisk = { score: 40, factors: {}, band: 'Moderate', message: 'x' };
    const result = combineWorkloadPressure(baseRisk, [], NOW);
    expect(result.baseScore).toBe(40);
    expect(result.score).toBe(40);
  });

  it('never exceeds 100 even with a high base score and a high deadline level', () => {
    const baseRisk = { score: 95, factors: {}, band: 'Higher', message: 'x' };
    const tasks = [task(iso(-1)), task(iso(-2))];
    const result = combineWorkloadPressure(baseRisk, tasks, NOW);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('records which deadline level and points were applied, for transparency', () => {
    const baseRisk = { score: 20, factors: {}, band: 'Low', message: 'x' };
    const result = combineWorkloadPressure(baseRisk, [task(iso(-1))], NOW);
    expect(result.deadline).toEqual({ overdueCount: 1, dueSoonCount: 0, dueWeekCount: 0, level: 'moderate', points: 12 });
  });
});
