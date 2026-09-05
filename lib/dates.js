// Supportive date handling for time-blindness.
//
// Dates are compared at day resolution (not exact time) because tasks only
// store a due *date*, not a due time. "Due within 48 hours" is therefore
// treated as "due today or due tomorrow" (0 or 1 whole days away) rather
// than an exact 48-hour clock calculation.

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseDate(due) {
  if (!due) return null;
  const d = new Date(`${due}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Whole calendar days between "now" and the due date. Negative = overdue.
export function daysUntil(due, now = new Date()) {
  const d = parseDate(due);
  if (!d) return null;
  const ms = startOfDay(d).getTime() - startOfDay(now).getTime();
  return Math.round(ms / 86400000);
}

// A calm, non-alarming label for how much time is left. Never uses
// flashing styling or shame-based language ("you're late" etc.) — the
// wording stays factual.
export function relativeDueLabel(due, now = new Date()) {
  const days = daysUntil(due, now);
  if (days === null) return 'No due date';
  if (days < 0) return days === -1 ? 'Overdue by 1 day' : `Overdue by ${Math.abs(days)} days`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}

export function isOverdue(due, now = new Date()) {
  const days = daysUntil(due, now);
  return days !== null && days < 0;
}

// "Due within 48 hours" = due today or tomorrow (see note above).
export function isDueWithin48h(due, now = new Date()) {
  const days = daysUntil(due, now);
  return days !== null && days >= 0 && days <= 1;
}

export function isDueWithinDays(due, days, now = new Date()) {
  const d = daysUntil(due, now);
  return d !== null && d >= 0 && d <= days;
}

// Ordered from most to least urgent. Used both for grouping and for
// task-recommendation ranking, so the two stay consistent with each other.
const URGENCY_ORDER = ['overdue', 'today', 'tomorrow', 'week', 'later', 'none'];

export function urgencyCategory(due, now = new Date()) {
  const days = daysUntil(due, now);
  if (days === null) return 'none';
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 7) return 'week';
  return 'later';
}

export function urgencyRank(due, now = new Date()) {
  return URGENCY_ORDER.indexOf(urgencyCategory(due, now));
}

// A task's display group (Today / Week / Later) is calculated from its due
// date so the grouping stays correct even if the tab it was created under
// no longer matches. Tasks with no due date fall back to whichever bucket
// the user originally chose (there is no date to calculate a group from).
export function effectiveBucket(task, now = new Date()) {
  if (!task.due) return task.bucket || 'later';
  const cat = urgencyCategory(task.due, now);
  if (cat === 'overdue' || cat === 'today' || cat === 'tomorrow') return 'today';
  if (cat === 'week') return 'week';
  return 'later';
}
