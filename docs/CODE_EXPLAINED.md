# Nuvora — Code Walkthrough

This document explains, section by section, how every source file in the Nuvora
app works and why it is built the way it is. It is written as a dissertation
appendix: enough detail that someone who has never seen the code can follow the
logic of each function and understand how the pieces connect, without
reproducing every single character of the source.

Test files (`*.test.js`, `*.test.jsx`) and generated files (`coverage/`) are
not covered here — this document explains the application itself.

---

## 1. What Nuvora is

Nuvora is a Next.js single-page web app that acts as a calm academic workload
companion, aimed at neurodivergent students (the language throughout the code
talks about time-blindness, task initiation, sensory overload, executive
function, etc.). Its core loop is:

1. A student optionally does a short **check-in** (five questions) that
   produces a transparent, rule-based **workload-pressure score** (0–100) and
   a band: Low / Moderate / Higher.
2. Based on that score and the student's task list, Nuvora recommends **one
   small next step** — never the whole assignment.
3. If a student feels overwhelmed, **Overwhelmed Mode** offers a menu of very
   small, barrier-specific interventions (a 2-minute timer, breaking a task
   into three pieces, a breathing reset, or a support message they can copy
   and send themselves).
4. **Calm Mode** is a standing accessibility setting that collapses the whole
   dashboard down to a single card with one next step, hiding deadlines,
   numbers, and visual clutter.

Everything that looks personalised (suggested steps, explanations, support
messages) is actually a small, deterministic, rule-based template — never
AI-generated — and the code is deliberately commented to say so, because the
dissertation's ethical framing depends on that distinction.

### Tech stack

From `package.json`:

- **Next.js 16** (App Router) + **React 19** — the framework and UI library.
- **Firebase** (`firebase`, `firebase-admin`) — Authentication + Firestore,
  used when environment variables are configured; otherwise the app falls
  back to a **local demo mode** backed by `localStorage`.
- **zod** — runtime validation of the check-in payload.
- **lucide-react** — the icon set used throughout the UI.
- **@fontsource/nunito** — self-hosted Nunito font weights.
- **Vitest** + **@testing-library/react** + **axe-core** — the test suite
  (unit tests for every `lib/*.js` module, accessibility tests, Firestore
  security-rule emulator tests).

### Folder structure

```
app/
  layout.js            Root HTML shell, fonts, metadata
  page.js               The single route "/" — renders <NuvoraApp/>
  globals.css           All CSS for the whole app (no CSS-in-JS)
components/
  NuvoraApp.jsx          The entire UI: ~30 components in one file, all
                          the app's "screens" and shared widgets
lib/
  firebase.js            Firebase app/auth/firestore setup + account deletion
  store.js               All data persistence (Firestore or localStorage)
  risk.js                 The check-in scoring model
  pressureConfig.js       Shared weights/labels used by risk.js and explain.js
  pressure.js              Deadline-based adjustment layered on the score
  explain.js               Turns a score into plain-language bullet points
  dates.js                 Due-date maths and urgency categorisation
  recommendation.js        Picks which task + which step to show as "next"
  steps.js                  Deterministic step templates per task type
  patterns.js                Finds genuine multi-check-in patterns
  modules.js                  Module list + colour coding
  greeting.js                  Time-of-day greeting + display-name fallback
  timer.js                      formatSeconds() for the countdown timer
  authErrors.js                  Maps Firebase auth error codes to copy
```

Nuvora is a **client-heavy** app: almost the entire UI lives in one
`'use client'` component tree (`components/NuvoraApp.jsx`), and the `app/`
directory is a thin Next.js shell around it. There is no server-side piece —
`calculatePressure()` runs entirely client-side (see §5), which is what
lets the app ship as a static export for the Android/Capacitor build (see
`docs/ANDROID_BUILD.md`). An earlier `app/api/risk/route.js` Route Handler
duplicated the same scoring logic as a POST endpoint; it was never called by
the UI and was removed because Next.js static export cannot contain server
Route Handlers.

---

## 2. `app/layout.js` — the HTML shell

```js
import './globals.css';
import '@fontsource/nunito/400.css';
...
export const metadata = { title: 'Nuvora', description: 'A calm academic workload companion' };

export default function RootLayout({ children }) {
  return <html lang="en"><body suppressHydrationWarning>{children}</body></html>;
}
```

- Imports the global stylesheet and four self-hosted Nunito font weights
  (400/600/700/800) once, at the root, so every page gets them without a
  network request to Google Fonts.
- `metadata` is Next.js's App Router convention for `<title>` /
  `<meta name="description">`.
- `suppressHydrationWarning` on `<body>` is a narrow, deliberate fix: browser
  extensions (Grammarly, password managers) inject attributes like
  `data-gr-ext-installed` onto `<body>` *before* React hydrates, which would
  otherwise cause a spurious hydration-mismatch warning. It only silences
  mismatches on this one element's own attributes — it does not hide real
  hydration bugs anywhere else in the tree. This is the standard,
  narrowly-scoped fix documented in the Next.js docs (linked in the code
  comment).

## 3. `app/page.js` — the one route

```js
import NuvoraApp from '@/components/NuvoraApp';
export default function Page() { return <NuvoraApp />; }
```

The entire app is a single route. There's no routing between "pages" in the
Next.js sense — navigation between Today/Tasks/Learn/etc. is handled entirely
client-side inside `NuvoraApp` via a `screen` state variable (see §5). This
keeps the app feeling like a native mobile app (a single "phone" card that
swaps its content) rather than a traditional multi-page website.

## 4. Scoring runs entirely client-side

The check-in flow in `NuvoraApp.jsx` calls `calculatePressure()` directly,
client-side (see the comment in `Checkin`'s `next()` function) — it never
makes a network request to score a check-in. This is deliberate: it keeps
the core scoring path available offline (important for the Android/Capacitor
build, see `docs/ANDROID_BUILD.md`) and lets the whole app ship as a static
export with no server runtime.

---

## 5. The `lib/` modules — pure logic, no UI

These modules are what make Nuvora auditable: every one of them is a set of
small, pure(-ish) functions with no React and (mostly) no side effects, each
covered by its own `*.test.js` file. Reading them top-to-bottom is reading
the actual "rules" behind Nuvora's supportive behaviour.

### 5.1 `lib/pressureConfig.js` — shared weights

```js
export const PRESSURE_WEIGHTS = Object.freeze({
  workload: 0.30, taskInitiation: 0.25, focus: 0.20, rest: 0.15, confidence: 0.10,
});
export const PRESSURE_LABELS = Object.freeze({ ...plain-English names... });
```

A single source of truth for how much each of the five check-in factors
contributes to the overall pressure score, and the human-readable label for
each. `Object.freeze` makes the objects immutable at runtime, which is mostly
a documentation/defensive signal (nothing else in the app tries to mutate
them). Both `lib/risk.js` (which *calculates* the score) and `lib/explain.js`
(which *explains* the score) import from here, so the calculation and its
plain-language explanation can never silently drift apart — if you changed a
weight in one place and not the other, they'd disagree, which the shared
import structurally prevents.

### 5.2 `lib/risk.js` — the scoring model

```js
export const checkInSchema = z.object({
  mood: z.number().int().min(1).max(4),
  sleep: z.number().int().min(1).max(5),
  focus: z.number().int().min(1).max(5),
  initiation: z.number().int().min(1).max(5),
  confidence: z.number().int().min(1).max(5),
});
```

`zod` validates the raw check-in answers before anything touches them: mood
is 1–4 (it has 4 options, see §6.2), the other four are 1–5 scales. Anything
outside those ranges (or missing, or non-integer) throws, which is what the
API route's `try/catch` and the client's own error handling rely on.

```js
export function bandFromScore(score) {
  if (score > 66) return { band: 'Higher', message: "..." };
  if (score > 33) return { band: 'Moderate', message: "..." };
  return { band: 'Low', message: "..." };
}
```

Turns a 0–100 score into one of three bands with a fixed, calm, non-alarmist
message for each. This is exported separately from `calculatePressure` so
that other code (`lib/pressure.js`, and `lib/store.js`'s demo-data seed) can
re-band a *different* score (e.g. after the deadline adjustment) using
exactly the same thresholds and wording, instead of re-implementing the
if/else logic and risking it drifting out of sync.

```js
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

  const score = Math.round(
    factors.workload * PRESSURE_WEIGHTS.workload +
    factors.taskInitiation * PRESSURE_WEIGHTS.taskInitiation +
    factors.focus * PRESSURE_WEIGHTS.focus +
    factors.rest * PRESSURE_WEIGHTS.rest +
    factors.confidence * PRESSURE_WEIGHTS.confidence
  );

  return { score, factors, ...bandFromScore(score) };
}
```

Walking through the maths:

- `mood` is on a 1–4 scale where 1 = "Calm & in control" and 4 = "Very
  overwhelming", so it's normalised directly to 0–100 with `(value-1)/3*100`
  — no inversion needed, because a higher mood answer already means more
  pressure.
- The other four factors (`sleep`, `focus`, `initiation`, `confidence`) are
  1–5 scales where a **higher** answer means **less** pressure ("well
  rested" = 5, "low energy" = 1). `invert()` flips that: `(5-value)/4*100`
  maps 5→0 (no pressure contribution) and 1→100 (maximum contribution).
- Each of the five 0–100 factor scores is then weighted by
  `PRESSURE_WEIGHTS` and summed to a single 0–100 score.
- `factors` (the per-question 0–100 breakdown) is returned alongside `score`
  so `lib/explain.js` can later say *which* factor mattered most — the
  explanation is derived from the same numbers the score was built from,
  never a separate guess.

### 5.3 `lib/dates.js` — supportive date handling

The comment at the top explains the core design decision: dates are compared
at **day resolution**, not exact time, because a task only stores a due
*date*. So "due within 48 hours" is implemented as "due today or due
tomorrow" (0 or 1 whole calendar days away), not a literal 48-hour countdown.

- `startOfDay(d)` strips the time component so two `Date`s can be diffed in
  whole days.
- `parseDate(due)` turns a `"YYYY-MM-DD"` string into a `Date` at local
  midnight, or `null` if it's missing/invalid.
- `daysUntil(due, now)` returns the whole-day difference (negative =
  overdue).
- `relativeDueLabel(due, now)` turns that into calm, factual copy: "No due
  date", "Overdue by N days", "Due today", "Due tomorrow", or "N days left".
  Deliberately no shame-based language ("you're late") and no flashing/red
  styling is implied by the text itself.
- `isOverdue`, `isDueWithin48h`, `isDueWithinDays(due, days)` are small
  boolean helpers built on `daysUntil`.
- `URGENCY_ORDER` and `urgencyCategory`/`urgencyRank` classify a due date
  into one of `overdue / today / tomorrow / week / later / none` and give it
  a numeric rank in that order — this is the single ordering used both for
  grouping tasks into tabs and for ranking which task gets recommended (see
  §5.6), so the two never disagree about what counts as "urgent".
- `effectiveBucket(task, now)` decides which UI tab (Today/Week/Later) a task
  belongs in, computed **live from its due date** rather than trusting the
  tab it was originally created under. So a task created under "Later" that
  becomes due tomorrow automatically shows up under "Today" without needing
  an update anywhere. Tasks with no due date fall back to whichever bucket
  was chosen when they were created, since there's no date to derive a group
  from.

### 5.4 `lib/pressure.js` — deadline adjustment

This module takes the self-reported score from `lib/risk.js` and layers a
small, **capped, rule-based** adjustment on top of it based on the student's
*current* task deadlines — without ever touching the self-report weights or
thresholds themselves.

```js
const LEVELS = [
  { level: 'high',     points: 20, test: c => c.overdueCount >= 2 },
  { level: 'moderate', points: 12, test: c => c.overdueCount === 1 || c.dueSoonCount >= 2 },
  { level: 'mild',     points: 5,  test: c => c.dueSoonCount === 1 || c.dueWeekCount >= 3 },
  { level: 'none',     points: 0,  test: () => true },
];
```

The rule set (documented in the code as matching a dissertation proposal):

1. `countDeadlines(tasks, now)` counts every open (not-done) task into
   **exactly one** tier — overdue, due-soon (today/tomorrow), or due-this-week
   (2–7 days) — so no task is ever double-counted across tiers.
2. `deadlineAdjustment(counts)` finds the **first** matching level in
   `LEVELS` (checked in order, most severe first) and returns its points.
   Levels are not summed — only the single most severe matching level
   applies.
3. `combineWorkloadPressure(baseRisk, tasks, now)` adds those points to the
   self-report score (`Math.min(100, ...)` caps it at 100), then re-bands the
   *adjusted* score using `bandFromScore` from `lib/risk.js` — the exact same
   thresholds and wording as the self-report band, just applied to a
   different number. The returned object keeps `baseScore` (the original
   self-report figure) alongside the new `score`, so the self-report number
   is never lost, only supplemented, and a `deadline: {...}` object records
   which tier fired and why (useful for `explain.js`).

### 5.5 `lib/explain.js` — turning numbers into plain language

```js
export function rankFactorContributions(factors) {
  return Object.keys(PRESSURE_WEIGHTS).map(key => ({
    key, label: PRESSURE_LABELS[key], value: factors[key],
    contribution: factors[key] * PRESSURE_WEIGHTS[key],
  })).sort((a, b) => b.contribution - a.contribution);
}
```

Ranks the five factors by how much they actually contributed to *this*
student's score (value × weight), using the same `PRESSURE_WEIGHTS` the score
itself was built from — so the explanation structurally cannot drift from the
scoring model.

```js
function resolveDeadlineInfo(risk, tasks, now) {
  if (risk.deadline) return risk.deadline;
  const counts = countDeadlines(tasks, now);
  return { ...counts, ...deadlineAdjustment(counts) };
}
```

A small backward-compatibility shim: newer check-ins already carry a
`deadline` object (from `combineWorkloadPressure`), but older saved check-ins
might not. Rather than requiring a data migration, this recomputes the
deadline breakdown live from the current task list when it's missing.

```js
export function explainPressure(risk, tasks = [], now = new Date()) {
  const bullets = [];
  const ranked = rankFactorContributions(risk.factors);
  if (ranked[0].contribution > 0) bullets.push(`${ranked[0].label} was the largest contributor today.`);
  ranked.slice(1).forEach(f => {
    if (f.value >= 60) bullets.push(`${f.label} increased the result.`);
    else if (f.value <= 20) bullets.push(`${f.label} had a smaller effect.`);
  });
  // ...deadline-related bullets (overdueCount, dueSoonCount, points)...
  if (!bullets.length) bullets.push('No single factor stood out today.');
  return bullets;
}
```

Builds the list of bullet points shown under every "Why this result?"
`<details>` in the UI: names the single largest contributor, calls out any
other factor that's notably high or notably low, and appends how many tasks
are overdue/due-soon and how many points that added. If nothing stands out
(a genuinely flat profile), it falls back to a single honest sentence rather
than fabricating a reason.

### 5.6 `lib/recommendation.js` — "one small next step"

This is the deterministic engine behind Today's headline card. The whole
point, stated in the file's own comment, is: **the same input always produces
the same recommendation**, and pressure *never* removes an urgent deadline
from consideration — it only changes how small the suggested action is.

```js
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
```

A stable multi-key sort: urgency first (using `lib/dates.js`'s
`urgencyRank`), then the student's own priority setting (high/normal/low) as
a tiebreak, then the earlier due date, then — because `Array.prototype.sort`
is stable in modern JS — any remaining tie keeps the tasks' original array
order, so the result never changes unless the underlying data does.

```js
export function recommendAction(tasks, band, now = new Date()) {
  const task = pickPriorityTask(tasks, now);
  if (!task) return null;
  const stepText = task.currentStep?.text || 'Open this task and note one small first action.';
  const actionText = band === 'Higher' ? `Just open "${task.title}". Nothing else is needed right now.` : stepText;
  return { task, actionText };
}
```

Picks the priority task, then decides *what to say*: under a "Higher"
pressure band, it deliberately shrinks the instruction down to "just open
it" regardless of what the task's current step actually says — under high
pressure the ask itself gets smaller, but which task is being asked about
never changes.

### 5.7 `lib/steps.js` — deterministic step templates

The file's header comment is explicit: these are **plain templates, not
AI-generated or personalised text**. Task type only selects which fixed list
of steps is used; it never generates new text from the task's own title.

- `TASK_TYPES` — six categories (general, essay, presentation, exam, lab,
  group) shown in the "Task type" `<select>` on the add/edit form.
- `PROGRESSIONS` — for each task type, a fixed ordered array of 4–5 step
  strings (e.g. essay: "write only the title" → "one sentence on what the
  essay will argue" → "list three points" → ...).
- `initialStepText(taskType)` returns the first step in that type's
  progression — used when a brand-new task is created.
- `ALTERNATIVE_STEPS` — three generic alternatives ("read only the title",
  "write one sentence", "two-minute timer on the first part") offered by
  `suggestAlternativeSteps(task)` when a student wants to try a different
  step than the current one.
- `makeCustomStep(task, text)` wraps a student's own typed step text in the
  same `{ id, text, done, completedAt }` shape as every other step.
- `nextStepAfter(task)` looks up where the task's *current* step text sits in
  its type's progression array and returns the next one; once the
  progression is exhausted it falls back to a supportive closing line
  ("Take a short break — you have made real progress today.") instead of
  looping or erroring.
- `stepId(taskId)` is a tiny module-level counter used to generate
  reasonably-unique step ids without needing `crypto.randomUUID()` for every
  template (it's combined with the task id, so collisions across tasks are a
  non-issue).

### 5.8 `lib/patterns.js` — genuine multi-check-in patterns

The header comment explains the design principle directly: this module only
ever reports a pattern once there's *actually enough data* to say it —
mirroring an earlier decision the dissertation made against saying anything
comparative from a single check-in.

```js
export function mostFrequentContributor(checkins, sampleSize = 8) {
  const scored = checkins.filter(c => c.risk && c.risk.factors).slice(0, sampleSize);
  if (scored.length < 3) return null;
  // tally which factor was the #1 contributor in each of the last `sampleSize` check-ins
  ...
  if (count < Math.ceil(scored.length / 2)) return null; // must be a majority, not just "most common of five"
  return { factor: key, label, count, of: scored.length };
}
```

Only returns a result if there are at least 3 scored check-ins *and* one
factor was the top contributor in a genuine majority of them (not just the
most common among several close options).

```js
export function dayOfWeekPattern(checkins) {
  const scored = checkins.filter(c => c.risk);
  if (scored.length < 6) return null;
  // group scores by day-of-week, require >=2 different weekdays each with >=2 samples
  ...
  if (highest.avg - lowest.avg < 15) return null; // must be a real gap, not noise
  return { highestDay, highestAvg, lowestDay, lowestAvg };
}
```

Needs at least 6 scored check-ins, at least two distinct weekdays with two-plus
samples each, and a real average-score gap (≥15 points) between the
highest and lowest day before it will say "your pressure tends to be higher
on Mondays" — otherwise it would just be describing statistical noise as if
it meant something.

```js
export function buildPatternInsights(checkins) {
  const insights = [];
  const freq = mostFrequentContributor(checkins);
  if (freq) insights.push(`${freq.label} has been your largest contributor on ${freq.count} of your last ${freq.of} check-ins.`);
  const dow = dayOfWeekPattern(checkins);
  if (dow) insights.push(`Your workload pressure tends to be higher on ${dow.highestDay}s ... than ${dow.lowestDay}s ...`);
  return insights;
}
```

Combines both signals into the plain-language lines shown on the Progress
screen's "Patterns" panel. If there isn't enough data for either, it returns
an **empty array** (the section simply doesn't render) rather than showing a
"not enough data yet" message that could read as a demand to check in more
often.

```js
export function orderByUsage(items, usageCounts, idKey = 'id') {
  return [...items].sort((a, b) => (usageCounts[b[idKey]] || 0) - (usageCounts[a[idKey]] || 0));
}
```

A generic, stable-sort reordering used by Overwhelmed Mode to put the
barriers a student has actually found helpful before first — reducing
decision friction exactly when decision-making is hardest. Because JS sort
is stable, items tied at zero usage (a brand-new account) keep their
original order rather than jumping around.

### 5.9 `lib/modules.js` — module list & colour coding

```js
const STARTER_MODULES = ['Dissertation', 'Other'];
export function availableModules(tasks = []) {
  const used = tasks.map(t => t.module).filter(Boolean);
  const unique = [...new Set([...STARTER_MODULES, ...used])];
  return unique.filter(m => m !== 'Other').concat(unique.includes('Other') ? ['Other'] : []);
}
```

The module chip list on the add-task form isn't a fixed hardcoded set — it
grows from whatever module names the student has actually typed, on top of a
small starter set for a brand-new account. `"Other"` is always kept last so
it reads as a catch-all rather than a real module name.

```js
const NAMED_MODULE_COLORS = { Dissertation: 'amber', 'Database Systems': 'purple', ... };
const FALLBACK_PALETTE = ['purple', 'teal', 'amber', 'blue'];
export function moduleColor(name) {
  if (NAMED_MODULE_COLORS[name]) return NAMED_MODULE_COLORS[name];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}
```

A handful of "known" module names keep fixed colours for continuity with the
original design. Anything the student types themselves gets a **deterministic
hash** of the module name mapped into the same four-colour palette — this
means the colour is stable across renders and reloads without needing to be
stored anywhere (it's recomputed from the name every time, and the same name
always hashes to the same colour).

### 5.10 `lib/greeting.js` — small display helpers

```js
export function timeOfDayGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
export function displayNameOrFallback(displayName) {
  return (displayName || '').trim() || 'there';
}
export function avatarInitial(displayName) {
  const trimmed = (displayName || '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '·';
}
```

Three tiny, pure, easily-tested functions. `displayNameOrFallback` explicitly
never invents or guesses a name — an empty/whitespace-only display name just
falls back to the neutral "there" ("How are things feeling, there?").

### 5.11 `lib/timer.js` — countdown formatting

```js
export function formatSeconds(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
```

Formats a seconds count as `M:SS`, clamped to non-negative. Pulled out as its
own module specifically so the countdown display logic can be unit-tested
without having to drive React's timers inside a test.

### 5.12 `lib/authErrors.js` — human Firebase error messages

A lookup table (`MESSAGES`) mapping Firebase Auth error codes
(`auth/invalid-credential`, `auth/weak-password`, etc.) to calm, specific
sentences, plus `authErrorMessage(error, fallback)` that looks up
`error.code` and falls back to a generic message for anything unmapped.

The comment block explains a deliberate security decision: **login and
signup share the same vague message** for "wrong password" and "no such
user" (`auth/invalid-credential`, `auth/wrong-password`,
`auth/user-not-found`) rather than distinguishing them, because confirming
whether an email has an account at all is an account-enumeration risk the app
doesn't need to take on. Signup's "email already in use" is the one
deliberate exception — Firebase's own signup flow already reveals that fact
regardless of the app's wording, so hiding it would only make the message
less helpful without adding real privacy protection.

### 5.13 `lib/firebase.js` — Firebase setup, auth, and account deletion

```js
const config = { apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY, ... };
export const firebaseEnabled = Boolean(config.apiKey && config.projectId);
const app = firebaseEnabled ? (getApps().length ? getApp() : initializeApp(config)) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
```

Reads Firebase config from `NEXT_PUBLIC_*` environment variables.
`firebaseEnabled` is a single boolean gate used throughout the whole app
(`NuvoraApp.jsx`, `lib/store.js`) to decide between real Firebase calls and
local demo-mode fallbacks — so the same codebase runs with zero setup (for
demoing/marking) or against a real backend, without a build-time branch.
`getApps().length ? getApp() : initializeApp(config)` guards against
re-initialising the Firebase app on hot-reload in development.

A long code comment explains a specific privacy decision: Firestore Web
defaults to an **in-memory cache**, and this file deliberately does **not**
enable persistent IndexedDB caching, because check-ins and workload-support
data may be sensitive on a shared computer. The trade-off is spelled out
explicitly — active-session caching still works, but nothing about "offline
persistence" should be described as guaranteed, and a future "trusted
device" opt-in could enable persistent caching after informed consent.

```js
export async function reauthenticate(password) {
  const user = auth?.currentUser;
  if (!user) throw new Error('Not signed in.');
  if (!user.email) throw new Error('...no email address available...');
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}
```

Re-authenticates the current user with their password. The comment explains
*why* this exists as its own step, called **before** any destructive
deletion: Firebase requires a "recent" login for account deletion
(`auth/requires-recent-login`), and the previous implementation used to
discover that failure only *after* Firestore data had already been deleted.
Calling this first means a stale-session failure is caught before anything
destructive happens.

```js
export async function deleteAccount() {
  const user = auth?.currentUser;
  if (!user) throw new Error('Not signed in.');
  await firebaseDeleteUser(user);
}
```

Deletes the Firebase Authentication account itself. The Privacy screen (see
§6.9) is responsible for the surrounding sequence: `reauthenticate()` → delete
Firestore data → `deleteAccount()`. The comment is honest about a real
limitation: this sequence is **not transactional** across Firestore and
Firebase Auth (they're separate services), so a network failure partway
through could theoretically leave things inconsistent — the dissertation
describes this as risk *reduction*, not a guaranteed atomic operation.

### 5.14 `lib/store.js` — the data layer

This is the largest `lib/` module (465 lines) and the single place that
knows how to read and write every piece of student data, in **two parallel
modes**: real Firestore (when `firebaseEnabled`) or `localStorage` (demo
mode). Every exported function has the same shape: `if (!firebaseEnabled) {
...localStorage path... } ...Firestore path...`, so the rest of the app never
needs to know or care which backend is active.

**Default shapes**

```js
export const defaultSettings = { calmMode: false, reducedMotion: false, textScale: 1,
  displayName: '', hideProgress: false, supportPersonName: '', supportPersonNote: '', restartMemory: null };
export const defaultStats = { stepsCompleted: 0, strategyUses: { start: 0, big: 0, energy: 0, reset: 0, support: 0 } };
```

`defaultStats`'s comment explains a deliberate choice: it deliberately does
**not** track "tasks completed" or "average pressure" (those would read as a
productivity score). Instead it tracks small, gentle, non-comparative
counts — steps taken, and which support *strategies* have actually been used
— with no streaks, targets, or "missed day" tracking of any kind.

**Demo-mode seed data**

`buildSeed()` generates the sample tasks/check-ins/reflections a fresh,
no-Firebase session sees. Two details worth noting:

- Due dates (`dayOffset(offset)`) and check-in timestamps (`timeAgo(daysAgo)`)
  are computed **relative to "now"**, not hardcoded — the comment explains
  that an earlier version used fixed dates that had already drifted into the
  past by the time the app was revisited, making the "overdue"/"due soon"
  demo data stale.
- The seeded check-ins' scores are run through the *real* `bandFromScore()`
  from `lib/risk.js`, not hand-typed band labels — so the sample "Why this
  result?" breakdown is guaranteed to stay internally consistent with actual
  scoring behaviour instead of silently drifting from it.

**Migration**

```js
export function migrateTask(t) {
  const withDefaults = { priority: 'normal', taskType: 'general', ...t };
  if (withDefaults.currentStep) return withDefaults;
  const { step, ...rest } = withDefaults;
  return { ...rest, currentStep: { id: `${t.id}-step-1`, text: step || '...', done: false, completedAt: null } };
}
```

Older saved tasks used a single flat `step` string field; the current data
model separates the whole academic task from its `currentStep` sub-object so
completing a micro-step never implies completing the whole assignment.
`migrateTask` upgrades old-shaped records the first time they're read
(applied to every task coming out of `loadData`), without needing an explicit
one-off migration script, and backfills a default `priority`/`taskType` for
tasks created before those fields existed.

**Local read/write + sanitisation**

`localRead()`/`localWrite()` are the `localStorage` primitives. `localRead()`
is defensive: if `localStorage` is unavailable (SSR), empty, unparseable, or
parses to something that *isn't* a plain object (a stray `"null"` or `"[]"`
string), it falls back to `buildSeed()` rather than crashing — the comment
notes that corrupted or manually-edited storage must never leave the student
stuck on a blank screen.

`sanitizeSettings(raw)` and `sanitizeStats(raw)` coerce every field to its
expected type individually, falling back to the matching `defaultSettings`/
`defaultStats` value **per field** if the stored type is wrong — so one
corrupted field (e.g. `textScale` somehow saved as a string) never
invalidates the rest of the student's preferences. `sanitizeRestartMemory`
does the same for the "restart point" object (see §6.4's `stopForNow`), with
length caps (`taskTitle` ≤200 chars, `stepText` ≤500 chars) and a check that
`stoppedAt` is a parseable ISO date, returning `null` outright if any
required field is missing.

**CRUD functions** — each with a Firestore path and a local path:

- `loadData(uid)` — reads tasks/check-ins/reflections/settings/stats,
  running every task through `migrateTask` and every settings/stats object
  through its sanitizer.
- `addTask`, `toggleTask`, `removeTask`, `updateTask` — task CRUD.
  `updateTask` is deliberately scoped to the task's *own* fields (title,
  module, due, priority) and never touches `currentStep` or `done` — those
  have their own dedicated functions below, keeping "editing the assignment"
  and "progressing the micro-step" as clearly separate operations.
- `setCurrentStep(uid, id, step)` — replaces a task's current micro-step
  outright (used when editing the step text, picking an alternative, or
  generating the next rule-based step).
- `completeCurrentStep(uid, id, done)` — completes/reopens **only** the
  current micro-step, never the whole task; the comment is explicit that this
  must never be confused with `toggleTask`.
- `saveCheckin`, `saveReflection`, `saveSettings` — append/merge data;
  `saveSettings` always runs the incoming object through `sanitizeSettings`
  first, merged onto `defaultSettings`, so a bad payload can never corrupt
  what's stored.
- `recordStepCompleted(uid)` / `recordStrategyUse(uid, barrierId)` — increment
  the gentle Progress-screen counters (`increment(1)` in Firestore, manual
  `+1` locally).

**Data deletion (§ "Phase 4" in the comments)** — a set of deliberately
*narrow* functions, each deleting exactly the category its name promises and
nothing else, mirroring the plain-language promises made on the Privacy
screen:

- `deleteCheckinHistory(uid)` — wipes check-ins + reflections only.
- `deleteCompletedTasks(uid)` — wipes only tasks where `done === true`.
- `deleteAllData(uid)` — wipes everything (tasks, check-ins, reflections,
  settings, stats). In Firestore mode this also deletes the
  `users/{uid}` document itself. In local mode, it deliberately **writes an
  explicit empty state** rather than removing the `localStorage` key outright
  — removing the key would make the next `localRead()` fall back to the
  seeded demo tasks, silently undoing the deletion the student just asked
  for.
- `exportAllData(uid)` — for the "download my data" JSON export; deliberately
  reuses `loadData()` rather than re-reading storage directly, so the export
  always matches exactly what the app itself would show.

---

## 6. `components/NuvoraApp.jsx` — the UI

The entire interface lives in this one client component file, organised as a
tree of small components under one root `NuvoraApp()` component. It's a
`'use client'` file (line 1) because it uses hooks, event handlers, and
browser APIs (`localStorage`, `navigator.clipboard`, the Web Audio API) that
can't run on the server.

### 6.1 Imports and module-level constants (lines 1–48)

Imports: React hooks (`useEffect`, `useRef`, `useState`), the `lucide-react`
icon set, Firebase auth functions, and every `lib/` module described in §5.

Module-level constant data (defined once, outside any component, since none
of it depends on props or state):

- `questions` — the five check-in questions. The comment explains that
  `mood` is asked differently from the other four: it uses plain descriptive
  option labels ("Calm & in control" → "Very overwhelming") instead of bare
  numbers, because it's conceptually different from a 1–5 self-rating scale —
  but the underlying value saved (1–4) and how `lib/risk.js` weighs it is
  unchanged.
- `nav` / `calmNav` — the five-item bottom navigation, and the two-item
  version shown while Calm Mode is on (just "My step" and "Support").
- `CALM_SESSION_DEFAULTS` — the four temporary Calm-session toggles
  (`hideDeadlines`, `hideProgressNumbers`, `reduceVisualDetail`,
  `reduceMotion`), all defaulting to `true`.
- `priorities`, `BARRIERS` (the five Overwhelmed Mode options), `QUICK_RESET`
  (the 2-minute breathing reset copy), and `GENERIC_ERROR` (the one shared
  fallback error string shown whenever a save fails for an unknown reason).

### 6.2 Two accessibility helper functions

**`handleRadiogroupKeyDown(e, containerRef, values, current, onSelect)`**

Implements the WAI-ARIA `radiogroup` keyboard pattern by hand, for every
custom `role="radio"` button group in the app (the check-in scale, the
barrier picker, the "what would help right now?" list): Left/Up moves to the
previous option, Right/Down to the next, Home/End jump to the first/last,
wrapping around at the ends (`(idx + 1) % values.length`). After selecting,
it calls `onSelect` and then uses `requestAnimationFrame` to find the newly
selected element (via a `data-value` attribute) and move DOM focus onto it —
so a keyboard user's focus always follows the selection, matching how native
radio buttons behave.

**`StatusMessage({ text, tone })`**

A tiny reusable status/error line. When `tone === 'error'` it renders with
`role="alert"` and `aria-live="assertive"` (announced immediately by screen
readers); otherwise it uses the gentler `role="status"` /
`aria-live="polite"` so routine confirmations don't interrupt.

### 6.3 `Drawer` and `AccessibleSheet` — focus-managed overlays

Both components implement full keyboard focus management by hand (there's no
headless-UI library dependency), and both follow the same recipe:

1. On open, move focus into the overlay (`Drawer` focuses its close button;
   `AccessibleSheet` focuses the first focusable element, or anything marked
   `autofocus`).
2. Trap Tab/Shift+Tab inside the overlay — pressing Tab on the last focusable
   element wraps to the first, and Shift+Tab on the first wraps to the last,
   by querying all focusable elements (`button:not([disabled]), a[href],
   input:not([disabled]), ...`) and comparing against
   `document.activeElement`.
3. Close on Escape.
4. On close, return focus to whatever element originally opened it
   (`triggerRef.current.focus()`), but only if that element is still attached
   to the DOM (`triggerEl?.isConnected`).

`Drawer` is used for the hamburger menu (Settings / Privacy / Sign out).
`AccessibleSheet` is the more general version, used for the Add/Edit Task
overlay (see §6.6) — it renders as a bottom sheet rather than a side drawer
and accepts a `label` for its `aria-label`.

### 6.4 `NuvoraApp()` — the root component

This is the largest single function in the file. It owns essentially all
top-level state and decides which "screen" to render.

**State**

- `user` — `undefined` (still checking auth) / `null` (signed out) / a user
  object. In demo mode (`!firebaseEnabled`) it's initialised straight to a
  fake `{ uid: 'demo', email: 'demo@nuvora.local' }` so there's no auth step
  at all.
- `screen` — which of the ~10 named screens is showing (`'today'`, `'tasks'`,
  `'checkin'`, `'learn'`, `'progress'`, `'reflection'`, `'support'`,
  `'settings'`, `'privacy'`, `'overwhelmed'`). This is the entire "router".
- `data` — the loaded `{ tasks, checkins, reflections, settings, stats }`
  object from `lib/store.js`.
- `settings` — kept as its own piece of state (separate from `data.settings`)
  so it can be updated optimistically without re-fetching everything.
- `calmSession` — the four temporary Calm-session toggles, reset every time
  Calm Mode is turned on (kept deliberately **out of** Firebase — see the
  comment: it lets a student reduce demand in the moment without permanently
  changing their normal setup).
- `checkinDraft` — the in-progress check-in answers, hoisted up to this
  component (not local to the `Checkin` screen) specifically so navigating
  away and back within the same session doesn't lose partially-answered
  questions.
- `isOnline` — tracked via the browser's `online`/`offline` events, shown as
  a small banner; the comment explains this connects to the same
  privacy-driven decision in `lib/firebase.js` not to enable persistent
  offline caching, so an offline reload isn't guaranteed to recover
  in-session state.
- `loadStatus` (`idle | loading | success | error`) and `retryTick` — added
  specifically to give data-loading failures (permissions, network, a
  dropped connection) an explicit UI state with a retry button, instead of
  leaving `data` as `null` forever and stranding the student on the splash
  screen with no explanation.

**Effects**

- An `online`/`offline` listener effect (mount-only).
- A "Calm Mode was just turned on" effect: compares `settings.calmMode`
  against a ref of its previous value (`previousCalmModeRef`) so it only
  fires on a genuine user toggle, not on the initial settings load. When it
  fires, it resets the Calm-session toggles, clears the "paused"/"restart
  acknowledged" flags, and — if the student was on a choice-heavy screen
  (`tasks`/`learn`/`progress`) — bounces them back to `today` once. Later
  deliberate navigation (e.g. tapping "Open my plan") is *not* bounced back;
  this only fires at the moment of enabling Calm Mode.
- `onAuthStateChanged(auth, setUser)` — the standard Firebase listener,
  skipped entirely when `!firebaseEnabled`.
- The data-loading effect: calls `loadData(user.uid)`, tracks a `cancelled`
  flag (so a stale response after unmount/user-change doesn't call
  `setState`), syncs `previousCalmModeRef` to the *loaded* Calm state before
  calling `setSettings` (so the Calm-just-enabled effect above doesn't
  misfire on first load), and sets `loadStatus` to `'success'` or `'error'`.
- A small `onboardingDone` piece of state backed by `localStorage`
  (`'nuvora-onboarding-seen'`), used only to decide whether a first-time
  Firebase-mode visitor sees the three-screen `Onboarding` flow before
  `Auth`.

**Render branches (in order)**

1. `user === undefined` → `<Splash/>` (still checking auth).
2. `!user` → either `<Onboarding/>` (first-time Firebase visitor) or
   `<Auth/>`. Demo mode skips straight to whichever of these applies since
   `user` is never falsy.
3. `loadStatus === 'error'` → `<LoadError/>` with a retry button (bumps
   `retryTick`, which the loading effect depends on) and a sign-out button.
4. `!data` → `<Splash/>` (still loading).
5. Otherwise, the real app shell renders.

**The app shell**

```jsx
return <main className={`${calmMode?...} ${reduced?...}`} style={{ '--scale': settings.textScale }}>
  <section className="phone">
    <header>...menu button, <Logo/>, Calm toggle...</header>
    {settingsError && <StatusMessage .../>}
    {!isOnline && <p>...offline notice...</p>}
    <Drawer ...>...menu...</Drawer>
    <div className="content">
      {screen === 'today' && <Today .../>}
      {screen === 'tasks' && <Tasks .../>}
      ...one branch per screen...
    </div>
    {!['checkin','overwhelmed','settings','reflection','privacy'].includes(screen) &&
      <nav>...bottom nav, hidden on "focused" screens...</nav>}
  </section>
</main>;
```

- The `<main>` element's `className` is built from three independent
  concerns: `calm` (Calm Mode is on), `reduced` (either the "Reduced motion"
  setting *or* Calm Mode's own temporary "reduce motion" toggle is active),
  and `calm-low-detail` (Calm Mode's "reduce visual detail" toggle). The
  `--scale` CSS custom property is set from `settings.textScale` and read by
  `globals.css`'s `main { font-size: calc(16px * var(--scale, 1)); }`, so
  text-size scaling is a single CSS variable rather than per-element
  overrides.
- `updateSettings(next)` is the one function every settings mutation across
  the whole app goes through: it optimistically applies `next` to local
  state immediately, then calls `saveSettings(user.uid, next)`, and on
  failure shows `GENERIC_ERROR` via `settingsError`. A `settingsBusy` guard
  prevents concurrent calls from racing each other.
- The bottom `<nav>` is hidden entirely on "focused" screens
  (check-in, Overwhelmed Mode, Settings, Reflection, Privacy) where the
  interface wants full attention on one task rather than offering an escape
  hatch to wander elsewhere.

### 6.5 Small shared visual components

- **`Mascot({ size, mood })`** — an inline SVG cloud character built from
  ellipses/circles/a path for the mouth. `mood` (`calm` / `worried` /
  `neutral`) only changes the mouth/eyes path data — the comment is explicit
  that it never changes the body colour, so the mascot stays visually calm
  rather than doubling as an alarm indicator.
- **`Logo()`** — `Mascot` + "Nuvora" wordmark, used in the header, drawer,
  splash, and auth screens.
- **`PageTitle({ title, tone, icon, action })`** — the coloured hero header
  used at the top of most screens (Tasks, Learn, Progress, Support,
  Settings, Privacy), rendering a small mascot cloud plus an optional small
  icon badge and an optional action button (e.g. the "+" add-task button).
  `tone` picks one of four gradient backgrounds defined in CSS
  (`data-tone="lavender|teal|amber|blue"`).
- **`Splash()`** — the loading screen (mascot + logo + tagline), shown while
  `user` or `data` is still resolving.
- **`LoadError({ onRetry, onSignOut })`** — shown only when `loadStatus ===
  'error'`. Moves focus to its own heading on mount (`headingRef.current
  .focus()`) so a screen-reader user notices the whole screen changed, and is
  careful to say "Your data hasn't been changed" — accurate, since a failed
  *read* never touches anything already saved.

### 6.6 Onboarding and Auth

**`Onboarding({ onDone })`** — a three-screen carousel (`ONBOARDING_SCREENS`)
shown once, only in Firebase mode, before `Auth`. Deliberately short (three
screens, not a long tour): "move forward without pressure", "support not
diagnosis", "you stay in control". A `Skip` button is always available except
on the final screen (where "Continue" already becomes "Get started").

**`Auth()`** — handles login, signup, and password reset, all in one
component switching on a local `mode` state (`'login' | 'signup' |
'reset'`).

- `submit(e)` calls either `signInWithEmailAndPassword` or
  `createUserWithEmailAndPassword`. On signup, an optional display name is
  saved via `saveSettings` — the comment notes this is explicitly optional
  and skippable, and that no surname, student ID, or other identifying
  detail is ever requested.
- Errors are always passed through `authErrorMessage()` (§5.12) rather than
  shown raw.
- `submitReset(e)` is the password-reset flow. It shows the **same**
  reassuring message ("If an account exists for this email, instructions
  have been sent") whether or not the email actually has an account,
  including explicitly catching `auth/user-not-found` and mapping it to the
  same message — because Firebase's reset flow could otherwise be used to
  probe which emails are registered, and there's no reason to hand that
  information out. Only genuinely unexpected errors get a different,
  specific message.
- The JSX for the `'reset'` mode and the login/signup mode are two separate
  return statements with their own hero copy, rather than one form with
  conditionally-hidden sections.

### 6.7 The `Today` screen — the app's centre of gravity

`Today` receives a large prop list because it coordinates several
cross-cutting concerns at once: the recommendation engine, Calm Mode's
session state, and the "restart memory" feature.

**Restart memory.** `settings.restartMemory` (persisted, unlike
`calmSession`) records the exact task + step text a student was looking at
when they chose to stop. `hasValidRestart` additionally checks that the
referenced task still exists and isn't already done/completed — a stale
restart point pointing at a finished task is treated as invalid rather than
shown. `calmTaskTitle`/`calmInstruction` prefer the restart memory over the
freshly-computed recommendation whenever one is valid, and — specifically
while Calm Mode's "hide deadlines" toggle is on — avoid timed language in the
instruction text ("Make one small update. You can stop whenever you need.")
so the interface doesn't contradict the student's own stated preference.

- **`stopForNow()`** — saves a new restart point (current recommended task +
  step + timestamp) via `updateSettings`, and sets `pausedThisSession` so the
  "You can stop here" screen shows immediately.
- **`clearRestartMemory()`** — clears `restartMemory` back to `null`.
- **`leaveCalmMode(destination)`** — turns Calm Mode off, resets the
  session-only paused/acknowledged flags, and navigates to `destination`
  (`today` or `tasks`).

**Render branches, in priority order:**

1. `showCalmExit` → a confirmation screen ("How would you like to come
   back?") offering "Return to Today" / "Show my tasks" / "Stay in Calm
   Mode" — explicit reassurance that nothing gets marked complete and any
   saved restart point stays available.
2. `pausedThisSession` → "You can stop here", showing the just-saved restart
   point (if any) and a single "Continue from here" button.
3. `calmMode && hasValidRestart && !restartAcknowledged` → "You already have
   a safe place to restart" — shown once per Calm session before the main
   focus card, so returning students aren't silently dropped back onto a
   *new* recommendation that ignores where they actually left off.
4. `calmMode && recommendation` → the actual Calm Mode focus card: a hero
   ("Calm Mode is on. Nuvora is keeping things simple for now."), the single
   task/step card, "Open my plan" / "Stop for now" buttons, and a
   collapsible "Adjust calm settings" panel exposing the four
   `CALM_SESSION_DEFAULTS` toggles as `Setting` switches — explicitly
   labelled as temporary and reset the next time Calm Mode starts.
5. The normal (non-Calm) Today screen: an optional "pick up where you left
   off" card if a restart point exists even outside Calm Mode, the
   time-of-day greeting (`timeOfDayGreeting()` + `displayNameOrFallback()`),
   either the check-in CTA or a `RiskCard` (depending on whether a check-in
   result exists yet), the "I'm feeling overwhelmed" button, the recommended
   `FocusTask` (or an empty state if there are no tasks at all, vs. an empty
   state for "your plan is clear" if tasks exist but none are open), and a
   short preview list (`MiniTask`, up to 3) of what's due today.

**`RiskCard({ risk, tasks, onUpdate })`** — the pressure-score card: a big
score badge, the band + message, an "Update workload pressure" button, and a
`<details>` "Why this result?" section populated by `explainPressure()`
(§5.5).

**`FocusTask({ task, actionText, uid, setData })`** — the single-task focus
card with three local modes (`view | editing | choosing`):

- `view` (default): shows `actionText`, plus a "Mark this step done" button
  (which calls `completeCurrentStep` then `recordStepCompleted`, with copy
  explicit that *the step* is done, not the whole assignment), "Edit", and
  "Try a different step".
- `editing`: a `<textarea>` bound to `draftText`, saved via `setCurrentStep`
  + `makeCustomStep`.
- `choosing`: lists `suggestAlternativeSteps(task)` as buttons, each saved
  via `setCurrentStep`.
- Once the current step is marked done, `view` mode instead shows a
  "Step complete" badge and a "Generate next step" button that calls
  `setCurrentStep(uid, id, nextStepAfter(task))`.
- `run(action, successText)` is a small shared async wrapper used by every
  button here: guards against double-submission (`busy`), calls
  `applyLocally()` to merge the returned task into `data.tasks` (so the UI
  updates immediately without a full reload), shows `successText` via
  `StatusMessage`, and falls back to `GENERIC_ERROR` on failure.

### 6.8 The `Tasks` screen

**`TaskForm({ initial, tasks, onCancel, onSave, saving })`** — the shared
add/edit form (used inside an `AccessibleSheet` in both cases). Uses
*uncontrolled* inputs for title/due/priority/taskType (`defaultValue` +
reading `FormData` on submit) but keeps `module` as controlled state, because
the module field has extra interactive behaviour: a row of chips from
`availableModules(tasks)` (§5.9), plus an inline "+ New module" input that
lets the student type an arbitrary module name.

**`Tasks({ data, uid, setData, calmMode, calmSession })`** — the task-list
screen. Local state tracks which tab is active (`today/week/later`), whether
the Add sheet or an Edit sheet is open, a `busyIds` `Set` (so only the row
actually being mutated shows a busy state, not the whole list), and an
`undo` object for the "mark complete → Undo" affordance.

- `create(fields)` builds a new task object (including a fresh
  `currentStep` seeded from `initialStepText(fields.taskType)`) and calls
  `addTask`.
- `saveEdit(id, fields)` calls `updateTask` — note this only ever touches the
  fields `TaskForm` collects (title/module/due/priority/taskType), never
  `currentStep` or `done`.
- `runOnTask(id, action)` is the per-row equivalent of `FocusTask`'s `run()`:
  guards against double-clicking the same row via `busyIds`, runs the async
  action, and falls back to `GENERIC_ERROR`.
- `toggle(t)` flips `done`, and when marking a task complete (not
  reopening it) stores `{ id, title }` in `undo` so a one-tap "Undo" appears;
  `undoComplete()` reverses it via the same `toggle` path.
- `remove(t)` requires a native `window.confirm()` before calling
  `removeTask` — this is the one place in the app that still uses a native
  browser confirm dialog rather than an in-app confirmation UI.
- In Calm Mode, the week/later tabs are collapsed behind a single "Show week
  & later" link rather than showing all three tabs at once, and — when
  `calmSession.reduceVisualDetail` is on — each row hides its due-date/
  priority text, its current-step preview, and its edit/delete icons,
  leaving just the title and a checkbox.
- Add/Edit both render inside `AccessibleSheet` (§6.3), each tracking which
  button triggered it (`addTaskTriggerRef` / `editTaskTriggerRef`) so focus
  returns to the right place when the sheet closes.

### 6.9 The `Checkin` screen

Five-question flow driven by the hoisted `draft` (`{ step, answers }`) state
from the root component.

- A focus-management effect moves focus to the result heading
  (`resultHeadingRef`) whenever the flow resolves to either the "incomplete"
  screen or a scored result — without this, a screen-reader user tabbing
  through would get no cue that the entire view had just changed.
- `next()`: on the last question, if **any** answer was left as `'unsure'`,
  it deliberately does **not** substitute a neutral guessed value — it saves
  the check-in with `risk: null, incomplete: true` and shows the "That's
  okay" screen instead of silently calculating a band from partial data.
  Otherwise it runs `calculatePressure(answers)` client-side (see §4),
  combines it with current task
  deadlines via `combineWorkloadPressure`, saves via `saveCheckin` *before*
  updating local state (so a failed save never shows a "successful" result
  screen), and stores the result.
- The question UI itself branches on whether `q.options` is set: the `mood`
  question renders a vertical list of full-sentence options
  (`.scale-vertical`), the other four render a horizontal 1–N number scale
  plus low/high labels. Both use the `role="radio"` pattern wired to
  `handleRadiogroupKeyDown` (§6.2), and both always include a "Not sure /
  prefer not to answer" option.
- The result screen shows the band, message, an explicit "This result is not
  a diagnosis" line, and the same `explainPressure()`-driven "Why this
  result?" details block as `RiskCard`. Choosing "Choose my next step"
  navigates to `overwhelmed` if the band is `'Higher'`, otherwise back to
  `today`.

### 6.10 `FocusTimer` and the `Learn` screen

**`FocusTimer({ seconds, showTone })`** — a real, working countdown (not just
descriptive text, which the comment notes an earlier version was). Counts
down via `setInterval` at 1-second resolution, cleaned up on
unmount/`running` change. The optional "soft tone" is a plain generated sine
wave via the Web Audio API (`OscillatorNode` + `GainNode` at low volume,
frequency 220Hz) — started only by an explicit tap, matching a stated rule
in the comments: no bundled audio, no autoplay, nothing plays itself.
`stopTone()` is wrapped in try/catch since calling `.stop()` on an
already-stopped oscillator throws.

**`Learn({ calmMode, data, uid, setData, go })`** — the largest single screen
component, organised as a "what would help right now?" picker
(`supportChoices`, six options) whose selection renders one of six different
support panels via `renderSupportPanel()`:

- `start` — a launch-step / if-then cue card.
- `big` — three ordered buttons that each shrink the task's current step to
  a smaller piece via `persistSuggestedStep()`.
- `energy` — Tiny/Enough/Full effort-level buttons.
- `sensory` — a list of environment adjustments (quiet, screen brightness,
  notifications, headphones, phone away) with **no task-work requirement**
  attached — selecting one just shows a calm acknowledgement message.
- `company` — a "copy a message asking someone to join me" button
  (`copyBodyDoubleMessage`, using `navigator.clipboard`) plus an optional
  external "Study With Me" YouTube link (explicitly labelled optional, never
  auto-playing).
- `unsure` — a three-question helper (`helperAnswers`: brain / environment /
  task) whose `helperRecommendation()` maps combinations of answers to one of
  the other five panels (e.g. an "overwhelming" environment always routes to
  `sensory` first, regardless of the other two answers).

Below the picker, a fixed "Reset Space" panel links to three external
wellbeing resources (NHS Every Mind Matters, ADHD Foundation, National
Autistic Society), each explicitly labelled optional and not a replacement
for professional support. A "More study tools" section (collapsed behind
`showMoreTools`) exposes four additional tools built from a shared
`allActivities` array — Focus Sprint (a student-chosen-length `FocusTimer`),
Distraction Parking Lot (a session-only, non-persisted scratch list for
unrelated thoughts), If–Then Plan (a two-field cue/response builder), and
Visual Step Map (a fixed three-step breakdown). The first of the four is
shown expanded by default (`pick`); the rest render as collapsed
`<details>` activity rows with alternating colour accents
(`ACTIVITY_COLORS`).

`persistSuggestedStep(text, statusSetter)` is the shared save path used by
several of these tools: it wraps the text in `makeCustomStep`, saves via
`setCurrentStep`, and updates local `data.tasks` state directly rather than
trusting whatever `setCurrentStep` returns — the comment notes this is
because that function's return shape isn't guaranteed to be a full task
object in every storage mode.

### 6.11 `Progress` and `Reflection`

**`Progress`** — if `settings.hideProgress` is set, shows a plain "Progress
is hidden" empty state with a button to turn it back on (a standing,
persisted opt-out, distinct from Calm Mode's temporary
`hideProgressNumbers`). Otherwise: three stat tiles (check-ins so far, small
steps taken, strategies used — or, if Calm's `hideProgressNumbers` is active,
a "Progress numbers are hidden for this Calm session" notice instead of the
numbers), a "Patterns" panel from `buildPatternInsights()` (§5.8, only shown
if non-empty), a "Helpful strategies" panel listing which strategies from
`STRATEGY_LABELS` have actually been used, and a **progressive-disclosure**
list of the last 7 check-ins — each row is collapsed by default with just the
date and score/band visible, expanding via `<details>` to show its own
`explainPressure()` breakdown, so seven full explanations aren't dumped on
screen at once. In Calm Mode, the whole trends/strategies block is itself
collapsed behind a "Show trends & strategies" link.

**`Reflection`** — two free-text prompts (`REFLECTION_PROMPTS`:
"what felt manageable" / "what would help next week"), saved via
`saveReflection`. `save()` requires at least one non-empty answer. The
comment stresses this text is entirely the student's own words — never
generated, summarised, or scored by Nuvora — and past entries (up to 5) are
listed below the form, but with no "streak" framing for how regularly it's
done.

### 6.12 `Privacy` — data export and deletion

Four independent, narrowly-scoped destructive actions, each gated behind its
own confirmation:

- **Export** (`handleExport`) — calls `exportAllData(uid)` and triggers a
  browser download via `downloadJson()` (builds a `Blob`, an object URL, and
  a synthetic `<a download>` click, then revokes the URL).
- **Delete check-in history** / **Delete completed tasks** — each behind a
  native `window.confirm()`, calling the correspondingly narrow `lib/store.js`
  function and then trimming local `data` state to match.
- **Delete all data** — requires typing the literal word `DELETE` into a
  text field (`confirmAll`) *and* confirming a native dialog, before calling
  `deleteAllData` and resetting settings back to `defaultSettings`.
- **Delete account** (Firebase mode only) — the most sensitive path: requires
  typing `DELETE`, entering the account password, and a native confirm.
  `handleDeleteAccount()` then runs, in order: `reauthenticate(password)` →
  `deleteAllData(uid)` → `deleteAccount()`. The comment explains this
  ordering is the fix for a previous bug where Firestore data could be
  deleted *before* discovering the account deletion itself would fail
  (`auth/requires-recent-login`) — with this order, if reauthentication
  fails, nothing has been touched yet. A successful deletion signs the
  student out automatically via `onAuthStateChanged` in the root component;
  no manual navigation is needed here.

The screen also has several `<details>` panels explaining, in plain
language: that offline storage isn't persisted by default, exactly what
Nuvora stores, how it's used, who can see it (explicitly different copy for
Firebase vs. demo mode), and that the pressure band is not a diagnosis.

### 6.13 `Support` and `SettingsPage`

**`Support`** — builds a plain-text summary (`summary`) from the latest
check-in's band and `explainPressure()` output, formatted as a small
structured message a student could send to a tutor or support contact. The
UI is explicit that **nothing is sent automatically** — `copy()` only ever
writes to `navigator.clipboard`. Below that, quick links to Calm accessibility
settings, the configured support person (or "Not set"), and Privacy & data.
Ends with a fixed notice pointing to real external help (university support
services, NHS 111, emergency services) and stating plainly that Nuvora is not
an emergency or healthcare service.

**`SettingsPage`** — the standing accessibility settings: display name
(optional, blurs to save), Calm Mode and Reduced Motion switches (via the
shared `Setting` component), a three-option text-size tab group (Standard /
Medium / Large, mapped to `textScale` values 1 / 1.15 / 1.3), and an optional
support-person name + note (explicitly described as "just a personal note for
yourself" — Nuvora never contacts anyone automatically).

**`Setting({ label, text, checked, disabled, onChange })`** — the shared
label + description + toggle-switch row used by both `SettingsPage` and the
Calm-session panel on `Today`. Uses a real `<input type="checkbox"
role="switch">` styled as a switch (see `.switch` in `globals.css`) rather
than a from-scratch custom control, so it keeps native checkbox keyboard/
screen-reader semantics for free.

### 6.14 `Overwhelmed` — barrier-based intervention mode

Reached either from Today's "I'm feeling overwhelmed" button or automatically
after a `'Higher'`-band check-in result. Shows `orderByUsage(BARRIERS,
data.stats.strategyUses)` (§5.8) so whichever barrier this student has
actually found helpful before appears first, then branches on which of five
barriers is selected:

- **`start`** ("I do not know where to start") — a single "just open it"
  card; confirming calls `completeCurrentStep`.
- **`big`** ("The task feels too big") — offers `suggestAlternativeSteps(task)`
  as choices; picking one shows just that text, and confirming saves it as
  the task's current step *already marked done* (`{ ...chosenAlt, done: true,
  completedAt: ... }`) via `setCurrentStep` — i.e. choosing and completing a
  tiny piece happens in one action here, unlike the two-step flow elsewhere.
- **`energy`** ("I have very low energy") — a real `FocusTimer` (2 minutes)
  plus a single "I tried for two minutes" button that marks the current step
  done regardless of whether the timer was actually run to completion —
  attempting counts, not finishing.
- **`reset`** ("I need a short reset") — shows the fixed `QUICK_RESET` text
  and, on "I'm ready to continue", records the strategy use and returns to
  Today (no task is touched at all).
- **`support`** ("I need to ask someone for help") — a pre-filled, fully
  editable message (auto-greeting the configured support-person name if one
  is set), copied to the clipboard via the same `navigator.clipboard`
  pattern used elsewhere — never sent automatically.

Every branch that completes something calls `markDone(action)`, which runs
the action, records the strategy use (`recordStrategyUse(uid, barrier)`) if a
barrier was involved, and — via a `done` state flip — shows a shared, calm
"One step down. That is genuinely enough for right now." closing screen
(focus is moved to its heading on mount, same pattern as `LoadError`).

### 6.15 `MiniTask` and `Empty`

Two trivial presentational components: `MiniTask` renders a small
checkbox-style row (title + relative due label + current step) used in
Today's "Today's plan" preview list, and `Empty({ title, text })` is the
shared empty-state layout (a leaf icon, heading, and supporting text) reused
across Tasks, Progress, and Today.

---

## 7. `app/globals.css` — the design system

There is no CSS-in-JS and no utility-class framework (no Tailwind) — every
class referenced throughout `NuvoraApp.jsx` (`.panel`, `.primary`,
`.task.focus`, `.risk`, etc.) is defined here, in one 1,556-line stylesheet.
The file is organised in layered passes, visible from its own section
comments — later blocks override earlier ones as the visual design was
iterated on, all still targeting the same class names:

### 7.1 Design tokens (`:root`, top of file)

A full palette of CSS custom properties (`--nuvora-*`) with an explicit
accessibility rationale documented in the header comment:

- `--nuvora-purple` (#6E62E5) is used as a **background** with white text
  (~4.6:1 contrast, passes WCAG AA) and for large/decorative elements that
  don't need text-contrast ratios.
- Anywhere purple is used as **small or bold text** on a light surface
  (links, active-tab labels, nav labels), the file uses the darker
  `--nuvora-purple-dark` (#5B4FD1, ~6:1) instead.
- `--nuvora-text-muted` (~3.4:1) is reserved for non-text/decorative use
  only; all genuinely readable secondary/metadata text routes through the
  darker `--nuvora-text-secondary` (~5.3:1), including legacy `--muted2`
  aliases.
- Four semantic accent colours, each carrying a **distinct meaning** rather
  than being interchangeable: lavender (next-step / explanatory surfaces),
  teal (calm / workload / completed / supportive), amber (gentle information
  / moderate attention — deliberately never alarm-red), and blue (one extra
  module accent).
- A block of **legacy aliases** (`--purple`, `--mint`, `--amber`, `--bg`,
  etc.) at the bottom of the token block means every rule elsewhere in the
  file can keep referring to the old names, while the entire colour system
  can be re-themed by editing only this one block.

### 7.2 Base layout and shell

- `.phone` is the literal app shell — a fixed-max-width (430px), tall,
  rounded, shadowed card that the whole UI lives inside, simulating a phone
  screen on desktop; a `@media (max-width: 500px)` block removes the
  rounding/shadow/max-height so it becomes a true full-screen layout on
  small devices.
- `.content` is the scrollable body between the fixed `header` and the fixed
  bottom `nav`, with generous bottom padding (110px) so content never sits
  under the nav bar.
- `main { font-size: calc(16px * var(--scale, 1)); }` is the single hook the
  text-size accessibility setting (§6.4) relies on.

### 7.3 Component-specific rules

Grouped by the UI area they style — header/logo/Calm toggle, the check-in
`.risk` card (with `.low`/`.higher` colour variants), bottom `nav`, the
`.drawer` menu, `.tabs`, `.row-task` (with `data-color` variants driven by
`moduleColor()`, §5.9), forms (`.panel input/select/textarea`), the
`.scale`/`.scale-vertical` check-in option buttons, `.overwhelmed-page`,
`.empty`, `.splash`/`.auth`, and the `.calm`/`.reduced` state classes that
the root `<main>` toggles (§6.4).

Accessibility-specific rules worth calling out directly:

- `.sr-only` — the standard visually-hidden-but-screen-reader-visible
  pattern (used sparingly; most labelling in this app is done via visible
  text or `aria-label` instead).
- `:focus-visible { outline: 3px solid var(--nuvora-purple); outline-offset:
  2px; }` — a strong, consistent focus ring applied globally, redefined once
  more later in the file (§7.6) with a slightly softer colour.
- `@media (prefers-reduced-motion: reduce)` — collapses all animations/
  transitions to near-zero duration based on the **operating system's**
  motion preference, independent of and in addition to the in-app `.reduced`
  class toggle (§6.4) — so a student's OS-level accessibility setting is
  respected even before they ever open Nuvora's own settings.
- `.switch` — a real toggle-switch control built on a native
  `<input type="checkbox" role="switch">` (`-webkit-appearance: none` +
  custom `::before` thumb), not a purely decorative div, so it keeps native
  keyboard and screen-reader semantics.

### 7.4 "STEP 8.9b" — stronger whole-app visual refinement

A large second pass (clearly marked with its own banner comment) that
redefines most of the same `--nuvora-*` tokens with a slightly different
palette and re-styles nearly every surface — `.phone`, `.risk`, `.task.focus`,
`.panel`, `.tabs`, `.row-task`, `.stats`, `.primary`, `.option`, form inputs,
`.auth`, bottom `nav`, `.setting`, and the `.sheet`/`.sheet-backdrop` overlay
— with softer gradients, more generous shadows, and slightly larger radii.
This is a design-iteration layer sitting on top of §7.1–7.3 rather than a
functional change: no new classes are introduced here that aren't already
used in the JSX; existing selectors are simply given richer values later in
the cascade (CSS's normal "last rule wins" behaviour, since nothing here uses
`!important`).

### 7.5 Visual polish — page headers, welcome card, coloured panels

Adds the `.page-title-card` treatment (the gradient hero header with a
mascot-in-a-rounded-square and a small icon badge, driven by `data-tone`)
used by `PageTitle` (§6.5), the `.welcome-card` hero on Today, and a set of
`.panel-lavender` / `.panel-teal` / `.panel-amber` / `.panel-blue` gradient
variants layered onto the base `.panel` class so specific cards (Learn's
tool panels, Progress's insight panels, Support's quick-links panel) can
carry colour meaning without needing new component logic — just an extra
class name in the JSX.

### 7.6 Auth / entry experience

A dedicated pass styling the `Auth`/`Onboarding` screens specifically:
`.auth-shell` (soft radial-gradient background), `.auth-hero`/
`.auth-cloud-wrap` (the mascot-in-a-card intro block), `.auth-card` (the
frosted-glass form container), and `.auth-tabs`/`.auth-note`. Also
re-declares `body { background: #faf7f0; }` and softens `:focus-visible` to
a translucent purple outline — the second (and final, cascade-wise)
definition of that rule in the file.

### 7.7 Calm Mode — refined visual hierarchy

The final themed pass, specific to the `.calm-focus`/`.calm-layout` screens
rendered by `Today` while Calm Mode is on: `.calm-hero` (the "Calm Mode is
on" gradient banner), `.calm-task-card` (the single-step focus card),
`.calm-actions` (the "Open my plan" / "Stop for now" button row),
`.calm-settings-card`/`.calm-settings-toggle`/`.calm-settings-panel` (the
collapsible "Adjust calm settings" block), and `.calm-footer-note`. A small
`@media (max-width: 380px)` block at the very end re-tunes several of these
(smaller mascot, single-column button row) for narrow phones.

---

## 8. How the pieces fit together — one end-to-end trace

To tie the whole document together, here is what actually happens, file by
file, when a student completes a check-in and gets a recommendation:

1. **`Checkin`** (`NuvoraApp.jsx`) collects five answers via the
   `role="radio"` scale UI, using `handleRadiogroupKeyDown` for keyboard
   support.
2. On the last question, `calculatePressure(answers)` (**`lib/risk.js`**)
   validates the payload with `zod`, computes five 0–100 `factors`, weights
   them with **`lib/pressureConfig.js`**'s `PRESSURE_WEIGHTS`, and bands the
   result with `bandFromScore`.
3. `combineWorkloadPressure(...)` (**`lib/pressure.js`**) layers a capped
   deadline adjustment on top, using `countDeadlines`/`urgencyCategory` from
   **`lib/dates.js`**, and re-bands the adjusted score with the same
   `bandFromScore`.
4. `saveCheckin(uid, {...})` (**`lib/store.js`**) persists the result to
   Firestore or `localStorage` depending on `firebaseEnabled`
   (**`lib/firebase.js`**).
5. Back on `Today`, `recommendAction(data.tasks, risk.band)`
   (**`lib/recommendation.js`**) picks the single highest-priority open task
   via `pickPriorityTask` (itself built on `urgencyRank` from
   **`lib/dates.js`**) and decides how small the suggested action should be
   based on the band.
6. `RiskCard` and `FocusTask` render the result, with `explainPressure(risk,
   tasks)` (**`lib/explain.js`**) turning the raw `factors`/`deadline` numbers
   back into the plain-language bullet list shown under "Why this result?" —
   using the *same* `PRESSURE_WEIGHTS`/`PRESSURE_LABELS` from step 2, so the
   explanation can never contradict the score that produced it.
7. If the student marks the step done, `completeCurrentStep` +
   `recordStepCompleted` (**`lib/store.js`**) update the task and the gentle
   Progress-screen counters — never the whole-task `done` flag, and never
   framed as a streak or target.

Every one of these functions is unit-tested in its own `*.test.js` file next
to the module it tests, and the Firestore security rules that gate step 4 in
production are exercised separately in `firestore.rules.test.js` and
`firestore-rules.emulator-test.js` at the project root.
