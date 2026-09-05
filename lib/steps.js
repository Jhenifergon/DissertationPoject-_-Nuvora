// Small, deterministic, rule-based step templates. These are plain
// templates, not AI-generated or personalised text — the UI must not
// describe them as personalised.

const ALTERNATIVE_STEPS = [
  'Open the file or page and read only the title.',
  'Write down one sentence about what this task needs.',
  'Set a two-minute timer and do only the first small part.',
];

// A fixed, deterministic progression a task's step can move through once
// the current one is marked done. Not personalised — the same task always
// offers the same next step for the same position in the sequence.
const PROGRESSION = [
  'Open the file or page and read only the title.',
  'Write or type just the first sentence.',
  'Complete one small section or question.',
  'Look back over what you have done so far.',
];

let counter = 0;
function stepId(taskId) {
  counter += 1;
  return `${taskId}-step-${counter}`;
}

export function suggestAlternativeSteps(task) {
  return ALTERNATIVE_STEPS.map(text => ({ id: stepId(task.id), text, done: false, completedAt: null }));
}

export function makeCustomStep(task, text) {
  return { id: stepId(task.id), text: text.trim(), done: false, completedAt: null };
}

// The next rule-based step after the current one is completed. Falls back
// to a supportive closing message once the fixed progression is exhausted.
export function nextStepAfter(task) {
  const currentIndex = PROGRESSION.indexOf(task.currentStep?.text);
  const next = PROGRESSION[currentIndex + 1];
  const text = next || 'Take a short break — you have made real progress today.';
  return { id: stepId(task.id), text, done: false, completedAt: null };
}
