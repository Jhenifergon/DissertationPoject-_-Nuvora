import { z } from 'zod';
import { PRESSURE_WEIGHTS } from './pressureConfig';

// Nuvora's workload-pressure score is a transparent, fixed-rule calculation
// from the student's own five check-in answers. It is not machine learning,
// it is not personalised, and it is not a clinical or diagnostic measure —
// it is a supportive estimate used only to decide how small today's
// suggested step should be.
//
// The schema checks each answer is a whole number in its expected range
// before any maths happens, so a malformed answer fails loudly instead of
// quietly producing a misleading score. "Not sure" answers never reach this
// function: the Check-in screen stops and saves an incomplete check-in
// instead of guessing a value (see components/screens/Checkin.jsx).
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

// How the score is built:
//   1. Each answer is rescaled to 0–100, where a higher number always means
//      "adds more pressure". The workload question already runs from calm
//      (1) to very overwhelming (4), so it is scaled directly. The other four
//      run from difficult (1) to easy (5), so they are inverted — feeling
//      well rested (5) contributes 0, very tired (1) contributes 100.
//   2. The five factors are combined with the weights in pressureConfig.js.
//      The weights add up to 1, so the result also stays within 0–100.
//   3. The total is banded into Low (0–33), Moderate (34–66) or Higher
//      (67–100) by bandFromScore() above.
// The individual factors are returned as well as the total, so the
// "Why this result?" explanation can show what actually drove the score.
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