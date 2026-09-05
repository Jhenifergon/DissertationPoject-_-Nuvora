import { z } from 'zod';

export const checkInSchema = z.object({
  mood: z.number().int().min(1).max(4),
  sleep: z.number().int().min(1).max(5),
  focus: z.number().int().min(1).max(5),
  initiation: z.number().int().min(1).max(5),
  confidence: z.number().int().min(1).max(5),
});

// Bands the existing self-report weights (unchanged) into Low/Moderate/
// Higher. Extracted as its own function so other modules (e.g. the
// deadline-combination layer in lib/pressure.js) can re-band an adjusted
// score using exactly the same thresholds and wording, rather than
// duplicating them and risking drift.
export function bandFromScore(score) {
  if (score > 66) return { band: 'Higher', message: "It looks like you're carrying a lot. Let's shrink today to one small step." };
  if (score > 33) return { band: 'Moderate', message: "Today's answers suggest that your workload may feel difficult to manage. Let's choose one manageable next step." };
  return { band: 'Low', message: 'Your workload feels manageable. Keep going at your own pace.' };
}

export function calculatePressure(input) {
  const c = checkInSchema.parse(input);
  const invert = value => ((5 - value) / 4) * 100;
  const mood = ((c.mood - 1) / 3) * 100;
  const factors = {
    workload: Math.round(mood),
    taskInitiation: Math.round(invert(c.initiation)),
    focus: Math.round(invert(c.focus)),
    rest: Math.round(invert(c.sleep)),
    confidence: Math.round(invert(c.confidence)),
  };
  const score = Math.round(mood * .30 + factors.taskInitiation * .25 + factors.focus * .20 + factors.rest * .15 + factors.confidence * .10);
  return { score, factors, ...bandFromScore(score) };
}
