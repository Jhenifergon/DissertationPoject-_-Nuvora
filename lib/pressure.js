import { isDueWithin48h, isDueWithinDays, isOverdue } from './dates';
import { bandFromScore } from './risk';

// Combines the existing self-reported pressure score with the student's
// current task deadlines. This is a deliberately small, capped, rule-based
// adjustment layered on top of the self-report score — it never changes
// the self-report weights or thresholds themselves (see lib/risk.js).
//
// See the Phase 2 item 5 proposal for full rationale, boundary cases,
// scenario table, and sensitivity analysis. Summary of the rules:
//   1. Count open (not-done) tasks into exactly one tier each: overdue,
//      due soon (today/tomorrow), or due this week (2-7 days). No task is
//      counted in more than one tier.
//   2. Take the single most severe matching level below — levels are not
//      summed together.
//   3. Add that level's points to the self-report score (capped at 100),
//      then re-band the *adjusted* score using the same Low/Moderate/
//      Higher thresholds as the self-report score.
//
// Why add deadlines at all: two students can feel the same but face very
// different real workloads. The self-report captures how things feel; the
// deadlines add an objective signal. The cap and the "most severe level
// only" rule stop a long list of tasks from dominating the result.
//
// When it runs: once, at the moment a check-in is completed
// (components/screens/Checkin.jsx), using the task list as it was then. The
// combined result — including the deadline counts — is saved with the
// check-in, so later changes to tasks do not rewrite past results.

const LEVELS = [
  { level: 'high', points: 20, test: c => c.overdueCount >= 2 },
  { level: 'moderate', points: 12, test: c => c.overdueCount === 1 || c.dueSoonCount >= 2 },
  { level: 'mild', points: 5, test: c => c.dueSoonCount === 1 || c.dueWeekCount >= 3 },
  { level: 'none', points: 0, test: () => true },
];

// Counts each open task into exactly one tier so nothing is double-counted
// across overdue / due-soon / due-this-week.
export function countDeadlines(tasks, now = new Date()) {
  const open = tasks.filter(t => !t.done);
  const overdueCount = open.filter(t => isOverdue(t.due, now)).length;
  const dueSoonCount = open.filter(t => !isOverdue(t.due, now) && isDueWithin48h(t.due, now)).length;
  const dueWeekCount = open.filter(t => !isOverdue(t.due, now) && !isDueWithin48h(t.due, now) && isDueWithinDays(t.due, 7, now)).length;
  return { overdueCount, dueSoonCount, dueWeekCount };
}

export function deadlineAdjustment(counts) {
  const match = LEVELS.find(l => l.test(counts));
  return { level: match.level, points: match.points };
}

// Takes the result of lib/risk.js's calculatePressure() plus the current
// task list, and returns a new result object re-banded on the combined
// score. `baseScore` is kept on the result so the self-report figure is
// never lost, only supplemented.
export function combineWorkloadPressure(baseRisk, tasks, now = new Date()) {
  const counts = countDeadlines(tasks, now);
  const { level, points } = deadlineAdjustment(counts);
  const adjustedScore = Math.min(100, baseRisk.score + points);
  const { band, message } = bandFromScore(adjustedScore);
  return {
    ...baseRisk,
    baseScore: baseRisk.score,
    score: adjustedScore,
    band,
    message,
    deadline: { ...counts, level, points },
  };
}
