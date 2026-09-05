import { parseDate, urgencyRank } from './dates';

// Deterministic "one small next action" recommendation.
//
// Rule order (always applied in this order, so the same input always
// produces the same recommendation):
//   1. Only tasks that are not marked done are considered.
//   2. Tasks are ranked by urgency: overdue, then due today, then due
//      tomorrow (within 48h), then due within a week, then later, then no
//      due date at all — see lib/dates.js `urgencyRank`.
//   3. Within the same urgency, the user's own priority setting breaks the
//      tie: high, then normal, then low.
//   4. Within the same urgency and priority, the earlier due date wins.
//   5. Any remaining tie keeps the tasks' existing order (a stable sort),
//      so the result never changes unless the underlying data changes.
//
// This never removes an urgent deadline from consideration — the pressure
// band only changes how *small* the suggested action is (see
// `recommendAction`), never which task is picked.

const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };

function priorityRank(task) {
  return PRIORITY_RANK[task.priority] ?? PRIORITY_RANK.normal;
}

function dueTimestamp(task) {
  const d = parseDate(task.due);
  return d ? d.getTime() : Infinity;
}

export function pickPriorityTask(tasks, now = new Date()) {
  const open = tasks.filter(t => !t.done);
  if (!open.length) return null;
  return [...open].sort((a, b) => {
    const urgency = urgencyRank(a.due, now) - urgencyRank(b.due, now);
    if (urgency !== 0) return urgency;
    const priority = priorityRank(a) - priorityRank(b);
    if (priority !== 0) return priority;
    return dueTimestamp(a) - dueTimestamp(b);
  })[0];
}

// A higher pressure band reduces the *size* of the suggested action for the
// same task — it never changes which task is chosen, and it never hides an
// overdue or near-due deadline.
export function recommendAction(tasks, band, now = new Date()) {
  const task = pickPriorityTask(tasks, now);
  if (!task) return null;
  const stepText = task.currentStep?.text || 'Open this task and note one small first action.';
  const actionText = band === 'Higher' ? `Just open "${task.title}". Nothing else is needed right now.` : stepText;
  return { task, actionText };
}
