// Small, deterministic, rule-based step templates. These are plain
// templates, not AI-generated or personalised text — the UI must not
// describe them as personalised. Task type only changes which fixed
// template list is used; it never generates new text from the task's
// own title or content.
//
// The data model separates the academic task (e.g. "Write methods section")
// from its current micro-step (e.g. "Write one heading"). Only one step is
// active per task at a time: completing a step never marks the whole task
// done, and a new step comes from the fixed progression below. Breaking
// work down this way is the core support Nuvora offers for tasks that feel
// too big to start.

export const TASK_TYPES = [
  { id: 'general', label: 'General / other' },
  { id: 'essay', label: 'Essay or written report' },
  { id: 'presentation', label: 'Presentation' },
  { id: 'exam', label: 'Exam revision' },
  { id: 'lab', label: 'Lab report or practical' },
  { id: 'group', label: 'Group project' },
];

const ALTERNATIVE_STEPS = [
  'Open the file or page and read only the title.',
  'Write down one sentence about what this task needs.',
  'Set a two-minute timer and do only the first small part.',
];

// A fixed, deterministic progression each task type moves through once its
// current step is marked done. Not personalised — the same task type
// always offers the same sequence of steps in the same order.
const PROGRESSIONS = {
  general: [
    'Open the file or page and read only the title.',
    'Write or type just the first sentence.',
    'Complete one small section or question.',
    'Look back over what you have done so far.',
  ],
  essay: [
    'Open a blank document and write only the title.',
    'Write one sentence saying what the essay will argue.',
    'List three points you might make, in any order.',
    'Write the topic sentence for just one paragraph.',
    'Read back what you have and note one thing to improve.',
  ],
  presentation: [
    'Open a blank slide and write only the title.',
    'List the three things you most want the audience to remember.',
    'Turn one of those into a single slide heading.',
    'Add one supporting point to that slide.',
    'Practise saying just that one slide out loud, once.',
  ],
  exam: [
    'Open your notes and choose one topic to revise.',
    'Write down everything you remember about it, without checking.',
    'Check your notes and add anything you missed.',
    'Try one practice question on that topic.',
    'Note one thing to revisit next time.',
  ],
  lab: [
    'Open the brief and read only the aim or objective.',
    'List the equipment or data you already have.',
    'Write the first line of your method or results section.',
    'Fill in one table or figure, even partially.',
    'Note which section still needs the most work.',
  ],
  group: [
    'Open the shared document or chat and read the latest update.',
    'Write one sentence about what you plan to contribute.',
    'Message the group with one specific question or update.',
    'Complete the smallest piece of your own part.',
    'Note what you are waiting on from someone else.',
  ],
};

function progressionFor(taskType) {
  return PROGRESSIONS[taskType] || PROGRESSIONS.general;
}

// The first step offered when a task of this type is created.
export function initialStepText(taskType) {
  return progressionFor(taskType)[0];
}

// Step ids are used to tell apart steps shown on screen at the same time
// (e.g. the alternative-step choices). The counter restarts whenever the
// app reloads, so ids are not guaranteed to be unique across sessions.
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

// The next rule-based step after the current one is completed, following
// the progression for this task's type. Falls back to a supportive
// closing message once that type's progression is exhausted.
// The position is found by matching the current step's text, so if the
// student wrote their own step (not in the list), indexOf returns -1 and
// the progression starts again from its first template.
export function nextStepAfter(task) {
  const seq = progressionFor(task.taskType);
  const currentIndex = seq.indexOf(task.currentStep?.text);
  const next = seq[currentIndex + 1];
  const text = next || 'Take a short break — you have made real progress today.';
  return { id: stepId(task.id), text, done: false, completedAt: null };
}

// Local-state versions of the store's step updates. In Firestore mode the
// store functions resolve to nothing (unlike demo mode, which returns the
// updated task), so screens must never put a store return value into
// state — they apply the same change to their own copy with these instead.
export function withStep(task, step) {
  return { ...task, currentStep: step };
}

export function withStepDone(task, done = true) {
  return { ...task, currentStep: { ...task.currentStep, done, completedAt: done ? new Date().toISOString() : null } };
}
