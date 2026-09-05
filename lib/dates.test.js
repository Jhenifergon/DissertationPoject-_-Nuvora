import { describe, expect, it } from 'vitest';
import { daysUntil, effectiveBucket, isDueWithin48h, isDueWithinDays, isOverdue, relativeDueLabel, urgencyCategory, urgencyRank } from './dates';

const NOW = new Date('2026-09-10T09:00:00');
const iso = daysFromNow => {
  const d = new Date(NOW);
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
};

describe('daysUntil', () => {
  it('returns null for no due date', () => expect(daysUntil('', NOW)).toBeNull());
  it('returns 0 for today', () => expect(daysUntil(iso(0), NOW)).toBe(0));
  it('returns negative for overdue dates', () => expect(daysUntil(iso(-3), NOW)).toBe(-3));
  it('returns positive for future dates', () => expect(daysUntil(iso(5), NOW)).toBe(5));
});

describe('relativeDueLabel', () => {
  it('labels no due date', () => expect(relativeDueLabel('', NOW)).toBe('No due date'));
  it('labels overdue by 1 day (singular)', () => expect(relativeDueLabel(iso(-1), NOW)).toBe('Overdue by 1 day'));
  it('labels overdue by multiple days (plural)', () => expect(relativeDueLabel(iso(-2), NOW)).toBe('Overdue by 2 days'));
  it('labels due today', () => expect(relativeDueLabel(iso(0), NOW)).toBe('Due today'));
  it('labels due tomorrow', () => expect(relativeDueLabel(iso(1), NOW)).toBe('Due tomorrow'));
  it('labels days left otherwise', () => expect(relativeDueLabel(iso(4), NOW)).toBe('4 days left'));
});

describe('isOverdue / isDueWithin48h / isDueWithinDays', () => {
  it('is not overdue with no due date', () => expect(isOverdue('', NOW)).toBe(false));
  it('is overdue when in the past', () => expect(isOverdue(iso(-1), NOW)).toBe(true));
  it('is not overdue for today', () => expect(isOverdue(iso(0), NOW)).toBe(false));
  it('treats today and tomorrow as within 48h', () => {
    expect(isDueWithin48h(iso(0), NOW)).toBe(true);
    expect(isDueWithin48h(iso(1), NOW)).toBe(true);
  });
  it('does not treat overdue or 2+ days out as within 48h', () => {
    expect(isDueWithin48h(iso(-1), NOW)).toBe(false);
    expect(isDueWithin48h(iso(2), NOW)).toBe(false);
  });
  it('isDueWithinDays respects the boundary inclusively', () => {
    expect(isDueWithinDays(iso(7), 7, NOW)).toBe(true);
    expect(isDueWithinDays(iso(8), 7, NOW)).toBe(false);
    expect(isDueWithinDays(iso(-1), 7, NOW)).toBe(false);
  });
});

describe('urgencyCategory / urgencyRank boundaries', () => {
  it('categorises each boundary correctly', () => {
    expect(urgencyCategory('', NOW)).toBe('none');
    expect(urgencyCategory(iso(-1), NOW)).toBe('overdue');
    expect(urgencyCategory(iso(0), NOW)).toBe('today');
    expect(urgencyCategory(iso(1), NOW)).toBe('tomorrow');
    expect(urgencyCategory(iso(7), NOW)).toBe('week');
    expect(urgencyCategory(iso(8), NOW)).toBe('later');
  });
  it('ranks more urgent categories lower (more urgent = smaller number)', () => {
    expect(urgencyRank(iso(-1), NOW)).toBeLessThan(urgencyRank(iso(0), NOW));
    expect(urgencyRank(iso(0), NOW)).toBeLessThan(urgencyRank(iso(1), NOW));
    expect(urgencyRank(iso(1), NOW)).toBeLessThan(urgencyRank(iso(7), NOW));
    expect(urgencyRank(iso(7), NOW)).toBeLessThan(urgencyRank(iso(8), NOW));
    expect(urgencyRank(iso(8), NOW)).toBeLessThan(urgencyRank('', NOW));
  });
});

describe('effectiveBucket', () => {
  it('groups overdue, today and tomorrow tasks into today', () => {
    expect(effectiveBucket({ due: iso(-1) }, NOW)).toBe('today');
    expect(effectiveBucket({ due: iso(0) }, NOW)).toBe('today');
    expect(effectiveBucket({ due: iso(1) }, NOW)).toBe('today');
  });
  it('groups 2-7 days out into week', () => {
    expect(effectiveBucket({ due: iso(2) }, NOW)).toBe('week');
    expect(effectiveBucket({ due: iso(7) }, NOW)).toBe('week');
  });
  it('groups more than 7 days out into later', () => {
    expect(effectiveBucket({ due: iso(8) }, NOW)).toBe('later');
  });
  it('falls back to the manually chosen bucket when there is no due date', () => {
    expect(effectiveBucket({ due: '', bucket: 'week' }, NOW)).toBe('week');
    expect(effectiveBucket({ due: '' }, NOW)).toBe('later');
  });
});
