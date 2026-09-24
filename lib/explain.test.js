import { describe, expect, it } from 'vitest';
import { calculatePressure } from './risk';
import { explainPressure, rankFactorContributions } from './explain';

const NOW = new Date('2026-09-10T09:00:00');
const iso = daysFromNow => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

describe('rankFactorContributions', () => {
  it('ranks by weighted contribution, not raw value', () => {
    // rest has a higher raw value but a smaller weight (15%) than
    // taskInitiation (25%), so with a close value taskInitiation should
    // still outrank it once weights are applied.
    const factors = { workload: 0, taskInitiation: 80, focus: 0, rest: 81, confidence: 0 };
    const ranked = rankFactorContributions(factors);
    const initiation = ranked.find(f => f.key === 'taskInitiation');
    const rest = ranked.find(f => f.key === 'rest');
    expect(initiation.contribution).toBeGreaterThan(rest.contribution);
  });
});

describe('explainPressure', () => {
  it('names the actual largest contributor for a given answer set', () => {
    // Low mood (workload) but very hard task initiation should make task
    // initiation the standout factor.
    const risk = calculatePressure({ mood: 1, sleep: 5, focus: 5, initiation: 1, confidence: 5 });
    const bullets = explainPressure(risk, [], NOW);
    expect(bullets.some(b => b.includes('Task initiation was the largest contributor'))).toBe(true);
  });

  it('mentions low rest when rest is a high-value factor', () => {
    const risk = calculatePressure({ mood: 2, sleep: 1, focus: 3, initiation: 3, confidence: 3 });
    const bullets = explainPressure(risk, [], NOW);
    expect(bullets.some(b => b.toLowerCase().includes('rest'))).toBe(true);
  });

  it('reports the actual overdue and due-soon task counts, not a generic statement', () => {
    const risk = calculatePressure({ mood: 3, sleep: 3, focus: 3, initiation: 3, confidence: 3 });
    const tasks = [
      { done: false, due: iso(-1) },
      { done: false, due: iso(0) },
      { done: true, due: iso(-5) }, // completed tasks must not be counted
    ];
    const bullets = explainPressure(risk, tasks, NOW);
    expect(bullets).toContain('One assignment is overdue.');
    expect(bullets).toContain('One assignment is due within 48 hours.');
  });

  it('pluralises correctly for multiple overdue/due-soon tasks', () => {
    const risk = calculatePressure({ mood: 3, sleep: 3, focus: 3, initiation: 3, confidence: 3 });
    const tasks = [
      { done: false, due: iso(-1) },
      { done: false, due: iso(-2) },
      { done: false, due: iso(0) },
      { done: false, due: iso(1) },
    ];
    const bullets = explainPressure(risk, tasks, NOW);
    expect(bullets).toContain('2 assignments are overdue.');
    expect(bullets).toContain('2 assignments are due within 48 hours.');
  });

  it('never produces an empty explanation', () => {
    const risk = calculatePressure({ mood: 2, sleep: 4, focus: 4, initiation: 4, confidence: 4 });
    expect(explainPressure(risk, [], NOW).length).toBeGreaterThan(0);
  });

  it('surfaces the deadline point adjustment when the risk was already combined (item 5)', () => {
    const risk = calculatePressure({ mood: 3, sleep: 3, focus: 3, initiation: 3, confidence: 3 });
    const combined = { ...risk, deadline: { overdueCount: 1, dueSoonCount: 0, dueWeekCount: 0, level: 'moderate', points: 12 } };
    const bullets = explainPressure(combined, [], NOW);
    expect(bullets).toContain("Upcoming deadlines added 12 points to today's result.");
  });

  it('falls back to recalculating deadline info for older checkins with no .deadline field', () => {
    const risk = calculatePressure({ mood: 3, sleep: 3, focus: 3, initiation: 3, confidence: 3 });
    const tasks = [{ done: false, due: iso(-1) }];
    const bullets = explainPressure(risk, tasks, NOW);
    expect(bullets).toContain('One assignment is overdue.');
    expect(bullets).toContain("Upcoming deadlines added 12 points to today's result.");
  });

  it('does not mention deadlines at all when there is no adjustment', () => {
    const risk = calculatePressure({ mood: 3, sleep: 3, focus: 3, initiation: 3, confidence: 3 });
    const bullets = explainPressure(risk, [], NOW);
    expect(bullets.some(b => b.includes('points to'))).toBe(false);
  });
});

describe('explainPressure for the shareable Support summary', () => {
  it('forSharing leaves out score-only lines but keeps the actual difficulties', () => {
    // Low rest/focus/confidence values produce "had a smaller effect" lines.
    const risk = calculatePressure({ mood: 4, sleep: 5, focus: 5, initiation: 1, confidence: 5 });
    const combined = { ...risk, deadline: { overdueCount: 1, dueSoonCount: 0, dueWeekCount: 0, level: 'moderate', points: 12 } };

    const onScreen = explainPressure(combined, [], NOW);
    expect(onScreen.some(b => b.includes('had a smaller effect'))).toBe(true);
    expect(onScreen).toContain("Upcoming deadlines added 12 points to today's result.");

    const shared = explainPressure(combined, [], NOW, { forSharing: true });
    expect(shared.some(b => b.includes('had a smaller effect'))).toBe(false);
    expect(shared.some(b => b.includes('points'))).toBe(false);
    expect(shared).toContain('One assignment is overdue.');
    expect(shared.length).toBeGreaterThan(0);
  });
});
