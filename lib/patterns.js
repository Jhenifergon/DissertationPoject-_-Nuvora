import { rankFactorContributions } from './explain';

// Looks across several past check-ins to find genuine, statistically
// meaningful patterns — never a single-day observation dressed up as a
// trend. Both functions below deliberately require a minimum sample size
// and a minimum gap before saying anything, precisely to avoid the kind
// of unsupported "your workload looks heavier than usual" comparison
// Phase 2 already ruled out for single check-ins. This does the same
// thing more carefully, only once there's actually enough data to say it.

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LABELS = { workload: 'Workload feeling', taskInitiation: 'Task initiation', focus: 'Focus', rest: 'Rest', confidence: 'Confidence' };

function checkinDate(c) {
  return new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt);
}

// Finds which factor was the single largest contributor most often across
// the most recent `sampleSize` scored check-ins. Only returned if that
// factor was the top contributor in a genuine majority of them — a factor
// that "wins" 2 out of 5 isn't a pattern, it's just the most common of five
// roughly-even options.
export function mostFrequentContributor(checkins, sampleSize = 8) {
  const scored = checkins.filter(c => c.risk && c.risk.factors).slice(0, sampleSize);
  if (scored.length < 3) return null;

  const counts = {};
  for (const c of scored) {
    const top = rankFactorContributions(c.risk.factors)[0];
    if (top.contribution > 0) counts[top.key] = (counts[top.key] || 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!ranked.length) return null;

  const [key, count] = ranked[0];
  if (count < Math.ceil(scored.length / 2)) return null;
  return { factor: key, label: LABELS[key], count, of: scored.length };
}

// Compares average pressure score across days of the week. Needs at least
// two different weekdays with two or more samples each, and a real gap
// between the highest and lowest averages — otherwise this would just be
// describing noise as if it meant something.
export function dayOfWeekPattern(checkins) {
  const scored = checkins.filter(c => c.risk);
  if (scored.length < 6) return null;

  const byDay = {};
  for (const c of scored) {
    const d = checkinDate(c);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getDay();
    (byDay[day] ||= []).push(c.risk.score);
  }
  const daysWithEnough = Object.entries(byDay).filter(([, scores]) => scores.length >= 2);
  if (daysWithEnough.length < 2) return null;

  const averages = daysWithEnough
    .map(([day, scores]) => ({ day: Number(day), avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => b.avg - a.avg);
  const highest = averages[0];
  const lowest = averages[averages.length - 1];
  if (highest.avg - lowest.avg < 15) return null;

  return {
    highestDay: DAY_NAMES[highest.day], highestAvg: Math.round(highest.avg),
    lowestDay: DAY_NAMES[lowest.day], lowestAvg: Math.round(lowest.avg),
  };
}

// Builds the plain-language insight lines for the Progress screen. Returns
// an empty array (not a placeholder message) when there isn't yet enough
// data — the section simply doesn't show, rather than saying "not enough
// data yet" in a way that could feel like a demand to check in more.
export function buildPatternInsights(checkins) {
  const insights = [];
  const freq = mostFrequentContributor(checkins);
  if (freq) insights.push(`${freq.label} has been your largest contributor on ${freq.count} of your last ${freq.of} check-ins.`);
  const dow = dayOfWeekPattern(checkins);
  if (dow) insights.push(`Your workload pressure tends to be higher on ${dow.highestDay}s (average ${dow.highestAvg}) than ${dow.lowestDay}s (average ${dow.lowestAvg}).`);
  return insights;
}

// Reorders a list of items (Overwhelmed Mode's barrier options) so the
// ones the student has actually found helpful before appear first —
// reducing decision friction at exactly the moment decision-making is
// hardest. A stable sort means items with equal (including zero) usage
// keep their original relative order, so a student with no history yet
// sees the same order as always, not something arbitrary.
export function orderByUsage(items, usageCounts, idKey = 'id') {
  return [...items].sort((a, b) => (usageCounts[b[idKey]] || 0) - (usageCounts[a[idKey]] || 0));
}
