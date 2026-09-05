import { isDueWithin48h, isOverdue } from './dates';

// The same weights used by lib/risk.js's calculatePressure. Duplicated as a
// constant here (rather than imported) so this module never silently
// changes if the scoring weights are revised — any weight change must be
// applied deliberately in both places.
const WEIGHTS = { workload: 0.30, taskInitiation: 0.25, focus: 0.20, rest: 0.15, confidence: 0.10 };
const LABELS = { workload: 'Workload feeling', taskInitiation: 'Task initiation', focus: 'Focus', rest: 'Rest', confidence: 'Confidence' };

// Ranks each factor by how much it actually contributed to *this* result
// (its normalised value multiplied by its weight), not just its raw value —
// a factor with a high value but a small weight should not be described as
// "the largest contributor" over one with a lower value but a bigger weight.
export function rankFactorContributions(factors) {
  return Object.keys(WEIGHTS)
    .map(key => ({ key, label: LABELS[key], value: factors[key], contribution: factors[key] * WEIGHTS[key] }))
    .sort((a, b) => b.contribution - a.contribution);
}

// Builds a short list of plain-language, individual explanation bullets
// from this student's actual answers and actual tasks — never a generic
// description of the formula, and never an unsupported comparison to a
// baseline Nuvora does not have.
export function explainPressure(risk, tasks = [], now = new Date()) {
  const bullets = [];
  const ranked = rankFactorContributions(risk.factors);

  if (ranked[0].contribution > 0) {
    bullets.push(`${ranked[0].label} was the largest contributor today.`);
  }
  ranked.slice(1).forEach(f => {
    if (f.value >= 60) bullets.push(`${f.label} increased the result.`);
    else if (f.value <= 20) bullets.push(`${f.label} had a smaller effect.`);
  });

  const open = tasks.filter(t => !t.done);
  const overdueCount = open.filter(t => isOverdue(t.due, now)).length;
  const dueSoonCount = open.filter(t => !isOverdue(t.due, now) && isDueWithin48h(t.due, now)).length;
  if (overdueCount === 1) bullets.push('One assignment is overdue.');
  else if (overdueCount > 1) bullets.push(`${overdueCount} assignments are overdue.`);
  if (dueSoonCount === 1) bullets.push('One assignment is due within 48 hours.');
  else if (dueSoonCount > 1) bullets.push(`${dueSoonCount} assignments are due within 48 hours.`);

  if (!bullets.length) bullets.push('No single factor stood out today.');
  return bullets;
}
