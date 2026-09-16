import {
  countDeadlines,
  deadlineAdjustment,
} from './pressure';

import {
  PRESSURE_LABELS,
  PRESSURE_WEIGHTS,
} from './pressureConfig';

// Rank each factor by the amount it actually contributed to this
// student's score. Using the same weights as calculatePressure()
// ensures the explanation cannot drift away from the scoring model.
export function rankFactorContributions(
  factors
) {
  return Object.keys(
    PRESSURE_WEIGHTS
  )
    .map(key => ({
      key,

      label:
        PRESSURE_LABELS[key],

      value:
        factors[key],

      contribution:
        factors[key] *
        PRESSURE_WEIGHTS[key],
    }))

    .sort(
      (a, b) =>
        b.contribution -
        a.contribution
    );
}

// Newer check-ins may already contain deadline information.
//
// Older saved check-ins may not, so Nuvora can calculate it from the
// current task list instead. This avoids requiring a data migration.
function resolveDeadlineInfo(
  risk,
  tasks,
  now
) {
  if (risk.deadline) {
    return risk.deadline;
  }

  const counts =
    countDeadlines(
      tasks,
      now
    );

  return {
    ...counts,
    ...deadlineAdjustment(
      counts
    ),
  };
}

// Produce short, plain-language explanations based on the student's
// actual factors and current deadlines.
export function explainPressure(
  risk,
  tasks = [],
  now = new Date()
) {
  const bullets = [];

  const ranked =
    rankFactorContributions(
      risk.factors
    );

  if (
    ranked[0].contribution > 0
  ) {
    bullets.push(
      `${ranked[0].label} was the largest contributor today.`
    );
  }

  ranked
    .slice(1)
    .forEach(f => {
      if (f.value >= 60) {
        bullets.push(
          `${f.label} increased the result.`
        );
      } else if (
        f.value <= 20
      ) {
        bullets.push(
          `${f.label} had a smaller effect.`
        );
      }
    });

  const deadlineInfo =
    resolveDeadlineInfo(
      risk,
      tasks,
      now
    );

  if (
    deadlineInfo.overdueCount ===
    1
  ) {
    bullets.push(
      'One assignment is overdue.'
    );
  } else if (
    deadlineInfo.overdueCount >
    1
  ) {
    bullets.push(
      `${deadlineInfo.overdueCount} assignments are overdue.`
    );
  }

  if (
    deadlineInfo.dueSoonCount ===
    1
  ) {
    bullets.push(
      'One assignment is due within 48 hours.'
    );
  } else if (
    deadlineInfo.dueSoonCount >
    1
  ) {
    bullets.push(
      `${deadlineInfo.dueSoonCount} assignments are due within 48 hours.`
    );
  }

  if (
    deadlineInfo.points > 0
  ) {
    bullets.push(
      `Upcoming deadlines added ${deadlineInfo.points} points to today's result.`
    );
  }

  if (!bullets.length) {
    bullets.push(
      'No single factor stood out today.'
    );
  }

  return bullets;
}