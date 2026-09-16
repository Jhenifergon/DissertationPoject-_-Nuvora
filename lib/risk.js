import { z } from 'zod';
import { PRESSURE_WEIGHTS } from './pressureConfig';

export const checkInSchema = z.object({
  mood: z.number().int().min(1).max(4),
  sleep: z.number().int().min(1).max(5),
  focus: z.number().int().min(1).max(5),
  initiation: z.number().int().min(1).max(5),
  confidence: z.number().int().min(1).max(5),
});

// Bands the existing self-report weights into Low, Moderate or Higher.
// Keeping this as a reusable function means other parts of Nuvora can
// re-band an adjusted score using exactly the same thresholds and wording.
export function bandFromScore(score) {
  if (score > 66) {
    return {
      band: 'Higher',
      message:
        "It looks like you're carrying a lot. Let's shrink today to one small step.",
    };
  }

  if (score > 33) {
    return {
      band: 'Moderate',
      message:
        "Today's answers suggest that your workload may feel difficult to manage. Let's choose one manageable next step.",
    };
  }

  return {
    band: 'Low',
    message:
      'Your workload feels manageable. Keep going at your own pace.',
  };
}

export function calculatePressure(input) {
  const c = checkInSchema.parse(input);

  const invert = value =>
    ((5 - value) / 4) * 100;

  const mood =
    ((c.mood - 1) / 3) * 100;

  const factors = {
    workload: Math.round(mood),

    taskInitiation: Math.round(
      invert(c.initiation)
    ),

    focus: Math.round(
      invert(c.focus)
    ),

    rest: Math.round(
      invert(c.sleep)
    ),

    confidence: Math.round(
      invert(c.confidence)
    ),
  };

  const score = Math.round(
    factors.workload *
      PRESSURE_WEIGHTS.workload +

    factors.taskInitiation *
      PRESSURE_WEIGHTS.taskInitiation +

    factors.focus *
      PRESSURE_WEIGHTS.focus +

    factors.rest *
      PRESSURE_WEIGHTS.rest +

    factors.confidence *
      PRESSURE_WEIGHTS.confidence
  );

  return {
    score,
    factors,
    ...bandFromScore(score),
  };
}