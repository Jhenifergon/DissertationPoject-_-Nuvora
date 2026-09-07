import { describe, expect, it } from 'vitest';
import { buildPatternInsights, dayOfWeekPattern, mostFrequentContributor, orderByUsage } from './patterns';

function checkin(factors, daysAgo, hour = 12) {
  const d = new Date('2026-09-07T00:00:00');
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour);
  return { risk: { score: 50, factors }, createdAt: d.toISOString() };
}

const initiationHeavy = { workload: 20, taskInitiation: 90, focus: 20, rest: 20, confidence: 20 };
const restHeavy = { workload: 20, taskInitiation: 20, focus: 20, rest: 90, confidence: 20 };

describe('mostFrequentContributor', () => {
  it('returns null with fewer than 3 scored check-ins (not enough to call it a pattern)', () => {
    const checkins = [checkin(initiationHeavy, 0), checkin(initiationHeavy, 1)];
    expect(mostFrequentContributor(checkins)).toBeNull();
  });

  it('identifies task initiation as the recurring largest contributor', () => {
    const checkins = [checkin(initiationHeavy, 0), checkin(initiationHeavy, 1), checkin(initiationHeavy, 2), checkin(restHeavy, 3)];
    const result = mostFrequentContributor(checkins);
    expect(result.factor).toBe('taskInitiation');
    expect(result.count).toBe(3);
    expect(result.of).toBe(4);
  });

  it('returns null when no single factor is a genuine majority (avoids overclaiming from noise)', () => {
    const checkins = [
      checkin(initiationHeavy, 0),
      checkin(restHeavy, 1),
      checkin({ workload: 90, taskInitiation: 20, focus: 20, rest: 20, confidence: 20 }, 2),
      checkin({ workload: 20, taskInitiation: 20, focus: 90, rest: 20, confidence: 20 }, 3),
    ];
    expect(mostFrequentContributor(checkins)).toBeNull();
  });

  it('ignores incomplete check-ins (no risk/factors) when counting', () => {
    const checkins = [checkin(initiationHeavy, 0), checkin(initiationHeavy, 1), checkin(initiationHeavy, 2), { risk: null, createdAt: new Date().toISOString() }];
    const result = mostFrequentContributor(checkins);
    expect(result.of).toBe(3);
  });

  it('only looks at the most recent sampleSize check-ins', () => {
    const recent = Array.from({ length: 3 }, (_, i) => checkin(initiationHeavy, i));
    const old = Array.from({ length: 10 }, (_, i) => checkin(restHeavy, i + 3));
    const result = mostFrequentContributor([...recent, ...old], 3);
    expect(result.factor).toBe('taskInitiation');
    expect(result.of).toBe(3);
  });
});

describe('dayOfWeekPattern', () => {
  it('returns null with fewer than 6 scored check-ins', () => {
    const checkins = [checkin(initiationHeavy, 0), checkin(initiationHeavy, 1)];
    expect(dayOfWeekPattern(checkins)).toBeNull();
  });

  it('finds a genuine gap between the highest and lowest average days', () => {
    // 2026-09-07 is a Monday. daysAgo 0 and 7 are both Mondays; 3 and 10 are Fridays.
    const checkins = [
      { risk: { score: 80 }, createdAt: new Date('2026-09-07T09:00:00').toISOString() },
      { risk: { score: 85 }, createdAt: new Date('2026-08-31T09:00:00').toISOString() },
      { risk: { score: 20 }, createdAt: new Date('2026-09-04T09:00:00').toISOString() },
      { risk: { score: 25 }, createdAt: new Date('2026-08-28T09:00:00').toISOString() },
      { risk: { score: 22 }, createdAt: new Date('2026-08-21T09:00:00').toISOString() },
      { risk: { score: 78 }, createdAt: new Date('2026-08-24T09:00:00').toISOString() },
    ];
    const result = dayOfWeekPattern(checkins);
    expect(result.highestDay).toBe('Monday');
    expect(result.lowestDay).toBe('Friday');
  });

  it('returns null when the gap between days is too small to be meaningful', () => {
    const checkins = [
      { risk: { score: 50 }, createdAt: new Date('2026-09-07T09:00:00').toISOString() },
      { risk: { score: 52 }, createdAt: new Date('2026-08-31T09:00:00').toISOString() },
      { risk: { score: 48 }, createdAt: new Date('2026-09-04T09:00:00').toISOString() },
      { risk: { score: 51 }, createdAt: new Date('2026-08-28T09:00:00').toISOString() },
    ];
    expect(dayOfWeekPattern(checkins)).toBeNull();
  });

  it('returns null when only one weekday has enough samples', () => {
    const sameDay = Array.from({ length: 6 }, (_, i) => {
      const d = new Date('2026-09-07T09:00:00');
      d.setDate(d.getDate() - i * 7);
      return { risk: { score: 50 + i }, createdAt: d.toISOString() };
    });
    expect(dayOfWeekPattern(sameDay)).toBeNull();
  });
});

describe('buildPatternInsights', () => {
  it('returns an empty array, not a placeholder message, when there is not enough data', () => {
    expect(buildPatternInsights([])).toEqual([]);
    expect(buildPatternInsights([checkin(initiationHeavy, 0)])).toEqual([]);
  });

  it('includes both insights when both are available', () => {
    const checkins = [
      { risk: { score: 80, factors: initiationHeavy }, createdAt: new Date('2026-09-07T09:00:00').toISOString() },
      { risk: { score: 85, factors: initiationHeavy }, createdAt: new Date('2026-08-31T09:00:00').toISOString() },
      { risk: { score: 82, factors: initiationHeavy }, createdAt: new Date('2026-08-24T09:00:00').toISOString() },
      { risk: { score: 20, factors: restHeavy }, createdAt: new Date('2026-09-04T09:00:00').toISOString() },
      { risk: { score: 25, factors: restHeavy }, createdAt: new Date('2026-08-28T09:00:00').toISOString() },
      { risk: { score: 22, factors: restHeavy }, createdAt: new Date('2026-08-21T09:00:00').toISOString() },
    ];
    const insights = buildPatternInsights(checkins);
    expect(insights.length).toBe(2);
    expect(insights[0]).toMatch(/Task initiation has been your largest contributor/);
    expect(insights[1]).toMatch(/tends to be higher on Monday/);
  });
});

describe('orderByUsage', () => {
  const items = [{ id: 'start' }, { id: 'big' }, { id: 'energy' }, { id: 'reset' }, { id: 'support' }];

  it('puts the most-used item first', () => {
    const usage = { start: 1, big: 5, energy: 0, reset: 2, support: 0 };
    const ordered = orderByUsage(items, usage);
    expect(ordered[0].id).toBe('big');
    expect(ordered[1].id).toBe('reset');
  });

  it('keeps the original order when there is no usage history at all (stable sort)', () => {
    const ordered = orderByUsage(items, { start: 0, big: 0, energy: 0, reset: 0, support: 0 });
    expect(ordered.map(i => i.id)).toEqual(['start', 'big', 'energy', 'reset', 'support']);
  });

  it('does not mutate the original array', () => {
    const usage = { start: 0, big: 5, energy: 0, reset: 0, support: 0 };
    orderByUsage(items, usage);
    expect(items.map(i => i.id)).toEqual(['start', 'big', 'energy', 'reset', 'support']);
  });

  it('treats a missing usage entry the same as zero', () => {
    const ordered = orderByUsage(items, { big: 3 });
    expect(ordered[0].id).toBe('big');
  });
});
