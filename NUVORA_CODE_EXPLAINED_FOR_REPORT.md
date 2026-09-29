# Nuvora — Code Explained for the Dissertation Report

This guide explains the final Nuvora code: file by file, screen by screen, and line by line where the logic matters. It is meant to help me write the Implementation chapter and answer assessors' questions. Everything here was checked against the code as it stands, including the recent fixes.

## How to use this document

- **Line references** are written as `path:start–end`. Most were taken from the code on 24 September 2026; the `firestore.rules` line references in §5 and §26 were re-checked and updated on 29 September 2026, after `firestore.rules`, `firestore-rules.emulator-test.js`, `jsconfig.json`, `package.json`, and `vitest.setup.js` were fixed/adjusted and `vitest.rules.config.js` was added (see those sections for what changed). If the code is edited later, some numbers will move; the **function names** will still find the right place.
- **Tested** means an automated test in the project checks the behaviour; the test file and line are given. **Intended / not verified** means the code is written to do it, but no automated test or device check confirms it.
- **Firebase mode** and **demo mode** are named explicitly wherever their behaviour differs.
- **No AI anywhere.** Every calculation, suggestion and piece of text in Nuvora comes from fixed, deterministic rules and templates written in the code. There is no AI, machine learning, personalisation model or external service making decisions.
- **Not diagnostic.** Nuvora does not diagnose, detect or measure any condition. The "workload-pressure" result is a supportive estimate from the student's own answers.
- **Test status at the time of writing:** `npx vitest run` → **25 test files, 320 tests, all passing.** The production build (`npm run build`) succeeds. No user evaluation has been carried out, and the app has not been tested on physical phones.
- **Nothing sensitive is included.** No secrets, credentials, `.env.local` values, generated build output or `node_modules`.

---

## Contents

1. Project overview and file map
2. App shell and navigation — `components/NuvoraApp.jsx`
3. Firebase configuration — `lib/firebase.js`
4. Persistence — `lib/store.js` (detailed)
5. Firestore security rules — `firestore.rules`
6. Local demo mode
7. The rule-based pressure calculation (detailed)
8. The next-step recommendation and date rules
9. Tasks and micro-steps: the data model and step rules (detailed)
10. Screen: Onboarding and authentication
11. Screen: Today
12. Screen: Tasks
13. Screen: Daily check-in and results
14. Calm Mode (cross-cutting)
15. Screen: Overwhelmed Mode
16. Screen: Learn
17. Screen: Weekly reflections (detailed)
18. Screen: Progress
19. Screen: Support
20. Screen: Settings
21. Screen: Privacy & data
22. Accessibility features
23. Tests
24. Web, Android and iOS setup (Capacitor)
25. Architecture and data flow for the Implementation chapter
26. Claims → code → test table
27. Genuine limitations and claims to avoid
28. Glossary

---

## 1. Project overview and file map

Nuvora is a single-page React application built with Next.js 16. It is exported as static files, which are served on the web and bundled into Android and iOS apps with Capacitor 8.

The code is organised in three layers:

| Layer | Folder | What lives there |
|---|---|---|
| **Logic** (no UI) | `lib/` | Scoring (`risk.js`, `pressureConfig.js`, `pressure.js`, `explain.js`), recommendation (`recommendation.js`), dates (`dates.js`), micro-step templates (`steps.js`), progress patterns (`patterns.js`), persistence (`store.js`), Firebase setup (`firebase.js`), sign-in error wording (`authErrors.js`), Calm Mode sound (`calmSound.js`), and small helpers (`greeting.js`, `modules.js`, `timer.js`) |
| **Screens** | `components/screens/` | One React component per screen |
| **Shell and shared UI** | `components/NuvoraApp.jsx`, `components/ui/` | Sign-in state, data loading, navigation, Calm Mode state; reusable accessible building blocks (drawer, modal sheet, status messages, timer, radio-group keyboard helper) |

**Other important files:**
- **Security rules:** `firestore.rules`
- **Build settings:** `next.config.mjs` (static export) and `capacitor.config.ts` (native wrapper)
- **Page shell and viewport:** `app/layout.js`
- **Styling:** `app/globals.css`, which imports the files in `app/styles/` in a fixed order
- **Tests:** `test/fakeFirestore.js` is a test helper; the tests themselves sit next to the code (`*.test.js` / `*.test.jsx`)

---

## 2. App shell and navigation — `components/NuvoraApp.jsx`

**What the student sees.** The header, the menu drawer, the bottom navigation, and whichever screen is current. The shell also decides whether to show the splash, onboarding, sign-in, a load-error screen, or the app itself.

### Key line ranges

| Lines | What it does |
|---|---|
| 29–44 | A comment explaining the navigation design, plus the two nav lists: `nav` (five items) and `calmNav` (two items: "My step", Support) |
| 45–49 | `MENU_SCREENS` (Settings, Privacy) and `SCREEN_NAMES`, used to label the "back" button |
| 51–82 | Main component state (next table) |
| 90–102 | `isOnline` plus listeners for the browser's `online`/`offline` events, which drive the offline banner |
| 110–116 | Native-only setup: dark status-bar icons, and iOS keyboard resize mode. Does nothing on the web (`Capacitor.isNativePlatform()`) |
| 122–137 | Calm Mode transition effect (explained below) |
| 139 | Firebase mode only: `onAuthStateChanged(auth, setUser)` keeps `user` in step with Firebase sign-in |
| 141–154 | Calm Mode background sound state, and the rule that stops the sound (§14) |
| 163–195 | Data-loading effect (explained below) |
| 197–200 | The onboarding "seen" flag, stored in `localStorage` |
| 205–218 | What to render, in order: splash → onboarding/sign-in → load error → splash → app |
| 220–226 | `go()`, `back` and `visibleNav` |
| 231–252 | `updateSettings()` (explained below) |
| 262–320 | Render: the outer `<main>` (accessibility classes), header (menu, logo, Calm toggle, sound button), settings error, offline banner, drawer, the screen switch (306–317) and the bottom nav (318) |

**Main state (lines 51–82):**

| State | Holds |
|---|---|
| `user` | Starts as `undefined` in Firebase mode ("still checking"). Demo mode starts with a fixed demo user |
| `screen` | The current screen's name |
| `returnTo` | Where Settings/Privacy go back to |
| `data` | All loaded tasks, check-ins, reflections, settings and stats |
| `settings` / `settingsBusy` / `settingsError` | The student's settings, whether a save is running, and any save error |
| `calmSession` | Temporary Calm preferences |
| `pausedThisSession`, `restartAcknowledged`, `showCalmExit` | Calm Mode flow flags |
| `checkinDraft` | The half-finished check-in, so answers survive leaving the check-in screen |

### How navigation works, in easy English

- **One state value, not URLs.** There are no URL routes. `screen` holds a name such as `'today'`, and `go(name)` changes it (220–224). The screen switch at 306–317 renders exactly one screen component. The bottom nav (318) is hidden on screens that have their own back button.
- **Back from the menu screens.** When Settings or Privacy is opened, `go()` remembers the screen you came from in `returnTo`. The `back` object at 225 gives those two screens a button labelled with that screen's name, such as "‹ Support".
- **Why this design.** It suits a static export for Capacitor, and it keeps in-progress state (such as `checkinDraft`) alive between screens. The trade-off: screens aren't bookmarkable, and the browser or Android Back button doesn't move between screens.

### Data loading (163–195)

- When `user` changes, the effect calls `loadData(user.uid)` from `lib/store.js`.
  - **Success:** it stores the result in `data` and `settings`, and sets `loadStatus` to `'success'`.
  - **Failure:** it sets `loadStatus` to `'error'`, which shows the `LoadError` screen with "Try again" and "Sign out". "Try again" increments `retryTick`, which re-runs the effect.
- **Stale results are ignored.** A `cancelled` flag throws away the result of a load that finished after the user had already changed.
- **Sign-out clears data (171–174).** When `user` becomes `null`, `data` is set back to `null`, so the next student on a shared device never briefly sees the previous account's data. **Tested:** `components/NuvoraApp.reflection.test.jsx:172`.
- **The Calm Mode reference is synced (186).** `previousCalmModeRef` is updated before settings are applied, so a Calm Mode setting that was *loaded* isn't mistaken for the student switching Calm Mode *on*.

### `updateSettings(next)` (231–252)

Every settings change in the app goes through this function:
1. **Ignore repeated taps.** If a save is already running, it returns `false`.
2. **Start the Calm sound if needed.** If this change switches Calm Mode on and the sound setting is on, it starts the sound (line 236). This must happen inside the tap, because phones block sound started any other way.
3. **Apply immediately.** It remembers the previous settings, then updates the screen straight away (an optimistic update).
4. **Save.** It calls `saveSettings`. On success it returns `true`.
5. **Roll back on failure.** It restores the previous settings, shows the calm generic error, and returns `false`.

Callers such as Calm Mode's "Stop for now" check this return value, so they never say "saved" when the save failed. **Tested:** `components/NuvoraApp.firestore-journeys.test.jsx:145`.

### Calm Mode transition effect (122–137)

When Calm Mode changes from off to on:
- The four temporary Calm preferences reset to their defaults, and the pause/restart flags are cleared.
- If the student is on Tasks, Learn or Progress (the choice-heavy screens), they are returned to Today once. **Tested:** `NuvoraApp.ui.test.jsx:462`, `:476`, `:490`.

### Success, error, empty and reopen

| Situation | What happens |
|---|---|
| **Load success** | The app renders |
| **Load error** | `LoadError` screen, with retry and sign-out |
| **Settings save error** | The setting is rolled back and a calm error message is shown under the header |
| **Offline** | A banner warns that saves may wait (298) |
| **Reopening** | Everything is read again through `loadData`. In Firebase mode, Firebase keeps the student signed in |

> **How I would explain this to my assessors:** "The whole app is one React component that owns the student's data and decides which screen to show. I didn't use URL routing, because the app is shipped as static files inside the phone apps, and keeping everything in one component meant half-finished work, like a check-in, isn't lost when you move around. Every screen gets the same copy of the data plus a function to update it, so saving on one screen shows up everywhere straight away. Loading can fail, so there's an explicit error screen with a retry, rather than a spinner that never ends."

**Evidence for the report:**
- a screenshot of Today with the header and bottom nav, and the same view with Calm Mode on (two-item nav)
- a short extract of `updateSettings` (231–252)
- the load/retry tests in `components/NuvoraApp.firebase.test.jsx:139–176`

---

## 3. Firebase configuration — `lib/firebase.js`

| Lines | What it does |
|---|---|
| 22–37 (approx.) | Reads the six `NEXT_PUBLIC_FIREBASE_*` values from environment variables (values are not reproduced here) |
| 38–47 | Comment and definition of `firebaseEnabled`: true only when both the API key and project ID are present |
| 49–56 | Initialises the Firebase app, but only if enabled |
| 57 | `auth = getAuth(app)`, or `null` in demo mode |
| 58–79 | A comment explaining that Firestore's default **in-memory** cache is used on purpose, followed by `db = getFirestore(app)` |
| 94 onwards | `reauthenticate(password)`: re-checks the password with `EmailAuthProvider.credential` before account deletion |
| 145–156 | `deleteAccount()`: deletes the Firebase Authentication user |

**In easy English:**
- **The mode is fixed when the app is built.** `NEXT_PUBLIC_` values are compiled into the JavaScript at build time, so a build with `.env.local` filled in always runs in Firebase mode (including the copy inside the phone apps), and a build without it always runs the demo.
- **The web config is not a secret.** Data is protected by Firebase Authentication and the security rules.
- **Privacy choice:** no persistent offline cache is enabled, so less data is left behind on a shared computer.

> **How I would explain this:** "Firebase is optional. If the project has its Firebase settings when it's built, the app uses real accounts and cloud storage; if not, it runs a self-contained demo in the browser. I deliberately left Firestore's offline cache in memory only, because check-in answers are personal and could be left behind on a shared computer."

**Evidence:** the comment block at 58–78 as a quote about the privacy decision. There is no automated test of this file; it is mocked in the component tests.

---

## 4. Persistence — `lib/store.js` (detailed)

This is the only file that reads or writes the student's data. Every screen calls these functions, so the rest of the app doesn't need to know which storage mode is active.

### Overview comment and constants (5–63)

| Lines | Content |
|---|---|
| 5–28 | Explains both storage modes and the two differences screens must handle (next list) |
| 30 | The demo-mode storage key `nuvora-demo-data-v1` |
| 32–45 | `defaultSettings`: `calmMode`, `calmTone` (automatic background sound, default on), `reducedMotion`, `textScale`, `displayName`, `hideProgress`, `supportPersonName`, `supportPersonNote`, `restartMemory` |
| 52 | `defaultStats`: `stepsCompleted` plus a count per Overwhelmed strategy. No streaks and no dates, by design |
| 56–63 | `withStepCounted` and `withStrategyCounted`: pure functions that apply the same +1 the store saves to the copy held in React state, so Progress updates without a reload |

**The two differences screens must handle (5–28):**
- **Update functions return different things.** In demo mode the task-update functions return the updated task; in Firebase mode they return nothing.
- **Firebase writes can wait.** Firestore writes resolve only once the server accepts them, so they can wait while the student is offline.

### Demo seed and migration (85–164)

- **`buildSeed()` (85–143)** creates the sample data a first-time demo visitor sees: six tasks, seven check-ins and two reflections.
  - Dates are calculated relative to today (`dayOffset`, `timeAgo`), so the sample data never goes out of date.
  - Sample pressure bands are produced by the real `bandFromScore`, so they stay consistent with the scoring rules.
- **`migrateTask(t)` (151–164)** upgrades older tasks that stored a single `step` string into the current shape, which has a `currentStep` object: `{ id, text, done, completedAt }`. It also fills in a default `priority` (`'normal'`) and `taskType` (`'general'`). It runs on every task that is loaded. **Tested:** `lib/store.test.js:46–79`.

### Reading and writing in demo mode (166–198)

- **`localRead()` (from 166)** returns the stored object, or the sample data when:
  - nothing is stored yet
  - the stored JSON is corrupted
  - the stored value isn't an object

  It also makes sure `tasks`, `checkins` and `reflections` are always arrays. Without that, older or partly written data would make every later save throw an error. **Tested:** `lib/store.test.js:219–275`, especially `:242`.
- **`localWrite(data)` (from 190)** writes the object back to `localStorage`.

### Sanitising settings and stats (200–294)

`sanitizeRestartMemory`, `sanitizeSettings` and `sanitizeStats` check each stored field's type individually. A missing or wrong-type value falls back to its default on its own, so one bad value can never break a whole screen. **Tested:** `lib/store.test.js:115–217`, `:261`.

### Reflections helpers (300–320)

- **`reflectionTime(r)` (300–307)** converts any stored date format into milliseconds: an ISO string (demo mode, or a just-saved entry), a Firestore Timestamp (`toMillis`), or a `{seconds}` object. A missing or invalid date returns 0, so that entry sorts last.
- **`normalizeReflections(list)` (315–320)** drops anything that isn't an object and sorts newest first. It only changes what is shown; nothing is written back. **Tested:** `lib/store.test.js:390`, `:403`.

### `loadData(uid)` (329–352)

- **Demo mode (330–339):** reads the one stored object and returns:
  - tasks, after migration
  - check-ins
  - reflections, normalised
  - settings and stats, sanitised
- **Firebase mode (340–351):** runs three queries, each ordered by `createdAt` newest first — `users/{uid}/tasks`, `/checkins` and `/reflections` — and reads the `users/{uid}` document for settings and stats. Each document's ID is added to its data.
- **Limitation:** Firestore's `orderBy` leaves out any document that has no `createdAt` field.

### Writes, function by function

| Function (lines) | Demo mode | Firebase mode | Returns |
|---|---|---|---|
| `addTask` (354–365) | Adds `id` (a random UUID) and ISO `createdAt`/`updatedAt`, adds it to the front of the list, saves | `addDoc` with `serverTimestamp()` for `createdAt`/`updatedAt` | The saved task, including its new ID, in both modes |
| `toggleTask` (367–375) | Sets `done` | `updateDoc({ done })` | The task (demo) / nothing (Firebase) |
| `removeTask` (377–385) | Removes it from the list | `deleteDoc` | nothing |
| `updateTask` (389–398) | Merges the edited fields and sets `updatedAt` | `updateDoc` with `serverTimestamp()` | The task (demo) / nothing (Firebase) |
| `setCurrentStep` (403–411) | Replaces `currentStep` | `updateDoc({ currentStep })` | The task (demo) / nothing (Firebase) |
| `completeCurrentStep` (415–427) | Sets `currentStep.done` and an ISO `completedAt` | Updates the nested fields `'currentStep.done'` and `'currentStep.completedAt'` (server timestamp) | The task (demo) / nothing (Firebase) |
| `saveCheckin` (429–437) | Adds `id` and ISO `createdAt` | `addDoc` with server timestamp | nothing |
| `saveReflection` (448–460) | Adds `id` and ISO `createdAt` | `addDoc` with server timestamp | The entry with its real ID, in both modes |
| `saveSettings` (462–471) | Sanitises, then saves | `setDoc(users/{uid}, { settings }, { merge: true })` | nothing |
| `recordStepCompleted` (475–484) | `stepsCompleted` + 1 | `increment(1)`, merged into the user document | stats (demo) / nothing |
| `recordStrategyUse` (489–500) | That strategy's count + 1 | `increment(1)` on that one field | stats (demo) / nothing |

**Key design point.** The task-update functions return different things in the two modes. Screens therefore **never** put the returned value into state. Instead they apply the same change to their own copy using `withStep` / `withStepDone` (`lib/steps.js:120–126`) or by merging the edited fields.

This was a real bug that I found and fixed. Previously, in Firebase mode, editing a task replaced it with `undefined` and the app crashed. **Tested:** `components/NuvoraApp.firestore-journeys.test.jsx:56–122`, which runs the real `store.js` Firestore code against an in-memory stand-in (`test/fakeFirestore.js`).

### Deletion and export (502–559)

- **`deleteAllDocsIn` (510–513)** deletes every document in one sub-collection (Firebase mode only).
- **`deleteCheckinHistory` (515–524)** removes check-ins **and** reflections, and leaves tasks alone.
- **`deleteCompletedTasks` (526–535)** removes only tasks marked done.
- **`deleteAllData` (540–551):**
  - **Demo:** writes an explicitly *empty* store. It doesn't delete the key, because that would bring the sample data back.
  - **Firebase:** deletes all three sub-collections, then the `users/{uid}` document.
- **`exportAllData` (556–559)** reuses `loadData`, so the export is exactly what the app would show, plus an `exportedAt` timestamp.

**Tested (demo mode):** `lib/store.test.js:420–488`.

> **How I would explain this:** "All data goes through one module with the same functions for both storage modes. In Firebase mode each student's data lives under their own user ID; in demo mode it's one object in the browser. The subtle part was that Firebase update calls don't give the updated record back, so screens apply the change to their own copy instead of trusting a return value. I found that difference as a crash when editing a task in Firebase mode, fixed it, and added tests that run the real Firebase code path against a fake database."

**Evidence:** a diagram of the Firestore document layout (`users/{uid}` with its three sub-collections); the table above; results from `lib/store.test.js` and `components/NuvoraApp.firestore-journeys.test.jsx`.

---

## 5. Firestore security rules — `firestore.rules`

| Lines | Rule |
|---|---|
| 10–13 | `isOwner(userId)`: the request must be signed in, and the signed-in user ID must equal the path's `userId` |
| 22–64 | `validTask`: checks the task's shape (details below) |
| 73–92 | `validRisk`: `risk` must be absent, **or explicitly `null`**, **or** a map with a numeric `score` between 0 and 120, `band` ∈ {Low, Moderate, Higher}, and a `factors` map |
| 100–111 | `validCheckin`: `answers` must be a map; `createdAt` must be absent, a timestamp or a string; and `validRisk` must pass |
| 121–129 | `users/{userId}` document: owner-only read, write and delete |
| 137–150 | `tasks`: owner-only; creates and updates must pass `validTask` |
| 158–171 | `checkins`: owner-only; creates and updates must pass `validCheckin` |
| 184–188 | `reflections`: owner-only, with no shape checks |
| 199–215 | `settings` and `stats` sub-collections: owner-only (the app itself stores these on the user document) |
| 229–231 | Default deny: every other path is refused |

**What `validTask` checks (22–64):**
- `title`: text, 1–200 characters
- `module`: text, up to 100 characters
- `due`: text, up to 10 characters
- `priority` ∈ {low, normal, high} **if present** — the field is optional (`firestore.rules:34–45`), specifically so tasks created before the `priority` field existed (and not yet migrated by `lib/store.js`'s `migrateTask`, which only backfills a default on read) aren't rejected by the rules
- `bucket` ∈ {today, week, later}
- `done`: true/false
- `currentStep`: a map with a text `id`, a text `text` of up to 500 characters, and a true/false `done`

**Testing status:**
- **Tested (static):** `firestore.rules.test.js` reads the rules file as text and checks that the key protections are present: ownership (`:25`), task validation (`:38`), priority values (`:55`), check-in validation, owner-only rules for reflections/settings/stats, and default deny.
- **Not verified:** `firestore-rules.emulator-test.js` would test the rules against the Firebase emulator, but it has not been run successfully in this environment — running it needs the Firebase CLI, Java, and a network path to download the emulator binary, none of which were available where this was written. It previously couldn't even be invoked correctly (`npm run test:rules` reported "No test files found", because Vitest's default file-discovery pattern doesn't match `*.emulator-test.js`); that's now fixed by a dedicated `vitest.rules.config.js` that explicitly includes the file, so `npm run test:rules` will actually run it once the emulator itself is reachable.

**Fixed: incomplete check-ins are now explicitly valid.** `Checkin.jsx:73` saves an incomplete check-in with `risk: null`. Earlier, `validRisk` only treated the *absence* of the `risk` field as valid — since `'risk' in data` is true when the field is present but `null`, and `null` is not a map, that check-in would have been rejected in Firebase mode. `validRisk` now has an explicit `|| data.risk == null` case (`firestore.rules:75`) covering exactly this. This has been reasoned through and covered by the emulator test's "accepts an incomplete check-in" case, but — per the point above — not yet confirmed by actually running that test against a live emulator.

> **How I would explain this:** "Security is enforced on the server, not trusted to the app: each student can only touch documents under their own user ID, anything not listed is denied by default, and task and check-in documents are checked for the right shape. I tested the rules file statically; I haven't yet run it against the Firebase emulator, and that's in my limitations."

**Evidence:** a quote of `isOwner` and the default-deny block; the names of the `firestore.rules.test.js` tests.

---

## 6. Local demo mode

- **When:** `firebaseEnabled` is false (no Firebase config at build time).
- **Where:** one JSON object under `localStorage['nuvora-demo-data-v1']`.
- **Start-up:** there is no sign-in. `NuvoraApp.jsx:56` starts with a fixed demo user (`uid: 'demo'`), and onboarding is skipped (`NuvoraApp.jsx:206–210` only shows onboarding when `firebaseEnabled`).
- **Sample data:** `buildSeed()` (`store.js:85–143`) is shown until the first save. After that the stored object is used.
- **Shared store:** the `uid` argument is ignored, so every demo "user" shares one store. **Tested:** `lib/store.test.js:277–289`. Demo mode is for demonstration only, not multi-user isolation.
- **Resetting:** clearing the browser's site data brings the sample data back. "Delete all my data" instead leaves an explicitly empty store.
- **"Sign out"** in demo mode reloads the page (`NuvoraApp.jsx:303`).
- **Why it matters for the dissertation:** assessors can run the whole app with no account and no network, and no participant data is ever created, which fits the ethics boundary.

> **How I would explain this:** "Demo mode exists so the app can be assessed without accounts or real data. It uses exactly the same screens and the same storage functions; only the bottom layer switches from Firestore to the browser's local storage."

---

## 7. The rule-based pressure calculation (detailed)

**Files:**
- `lib/risk.js`: the self-report score and bands
- `lib/pressureConfig.js`: the weights
- `lib/pressure.js`: the deadline adjustment
- `lib/explain.js`: the "Why this result?" text

All of it is deterministic arithmetic and fixed rules. There is no AI, no learning from data, and no personalisation.

### 7.1 Inputs

The five check-in answers, validated by `checkInSchema` (`risk.js:15–21`, built with the Zod library):

| Answer key | Question (from `Checkin.jsx:13–23`) | Allowed values |
|---|---|---|
| `mood` | How is your workload feeling today? | whole number 1–4 (1 = calm & in control … 4 = very overwhelming) |
| `sleep` | How rested do you feel? | 1–5 (1 = low energy … 5 = well rested) |
| `focus` | How easy is it to focus right now? | 1–5 (1 = hard … 5 = easy) |
| `initiation` | How easy is it to start tasks today? | 1–5 |
| `confidence` | How confident do you feel about this week? | 1–5 |

- **Invalid input is rejected.** Values out of range, decimals, text or missing answers throw an error rather than producing a misleading score. **Tested:** `lib/risk.test.js:7`, `:66–81`.
- **"Not sure" never reaches this function.** `Checkin.jsx:69–82` stops first and saves an incomplete check-in.

### 7.2 Step 1 — convert each answer to a 0–100 factor (`risk.js:62–89`)

Higher always means *more* pressure:
- **Workload:** `((mood − 1) / 3) × 100` (line 68–69). Mood 1 → 0; mood 4 → 100. It isn't inverted, because a higher answer already means heavier.
- **The other four:** `invert(v) = ((5 − v) / 4) × 100` (lines 65–66), applied to initiation, focus, sleep (stored as the `rest` factor) and confidence. An answer of 5 (easy or rested) → 0; an answer of 1 → 100.
- **Rounding:** each factor is rounded to a whole number (lines 71–89).

### 7.3 Step 2 — weighted sum (`risk.js:91–106`, weights in `pressureConfig.js:13–19`)

```
score = round( workload×0.30 + taskInitiation×0.25 + focus×0.20 + rest×0.15 + confidence×0.10 )
```

- **The weights add up to 1.0,** so the score stays between 0 and 100. **Tested:** `lib/pressureConfig.test.js` ("weights sum to exactly 100%").
- **`Object.freeze`** stops other code changing the weights at runtime. **Tested:** the same file, "exports immutable configuration objects".
- **Why these weights:** workload and task initiation weigh most because overload and difficulty starting are the problems the app targets. This is my design decision and is **not clinically validated** (see the comment at `pressureConfig.js:7–12`).

### 7.4 Step 3 — band (`risk.js:26–48`, `bandFromScore`)

- **Higher:** score > 66
- **Moderate:** score > 33
- **Low:** otherwise

Each band comes with a fixed supportive message. Boundaries are tested exactly: 33 is Low and 34 is Moderate; 66 is Moderate and 67 is Higher (`lib/risk.test.js:19–31`). The extremes 0 and 100 are tested at `:10–17`.

### 7.5 Step 4 — deadline adjustment (`lib/pressure.js`)

- **`countDeadlines` (39–45)** looks only at open tasks and puts each one into **exactly one** tier:
  - **overdue:** due before today
  - **due soon:** due today or tomorrow (`isDueWithin48h`)
  - **due this week:** due in 2–7 days

  **Tested:** `lib/pressure.test.js:12–24`.
- **`deadlineAdjustment` (47–50)** picks the **first matching** level in `LEVELS` (30–35), so only the most severe level counts and levels are never added together:

  | Level | Condition | Points |
  |---|---|---|
  | high | overdue ≥ 2 | +20 |
  | moderate | overdue = 1, **or** due soon ≥ 2 | +12 |
  | mild | due soon = 1, **or** due this week ≥ 3 | +5 |
  | none | otherwise | 0 |

  **Tested, including every boundary:** `lib/pressure.test.js:26–53`.
- **`combineWorkloadPressure` (56–69)** works out `adjusted = min(100, base + points)`, **re-bands** it with the same `bandFromScore`, and returns:
  - the adjusted `score`
  - `baseScore` (the original self-report score, kept for transparency)
  - `band` and `message`
  - `deadline: { overdueCount, dueSoonCount, dueWeekCount, level, points }`

  **Tested:** `lib/pressure.test.js:55–106` (scenario table, the 100 cap, and the recorded level).
- **When it runs:** only once, when a check-in is completed (`Checkin.jsx:97`). The combined result is saved with that check-in (`Checkin.jsx:102`), so later task changes don't rewrite old results.

### 7.6 Worked example (matches the test at `lib/risk.test.js:6`)

Answers: mood 2, sleep 3, focus 3, initiation 3, confidence 3.

1. **Factors:** workload = round(1/3 × 100) = 33. Each of the other four: invert(3) = 50.
2. **Weighted sum:** 33×0.30 + 50×0.25 + 50×0.20 + 50×0.15 + 50×0.10 = 9.9 + 12.5 + 10 + 7.5 + 5 = **44.9 → 45**.
3. **Band:** 45 is between 34 and 66, so **Moderate**. The test expects 45.
4. **With deadlines:** if the student also had exactly one overdue task, the moderate level adds +12. The adjusted score is 57, still Moderate. With two overdue tasks, +20 gives 65, which is still Moderate (just under 67).

### 7.7 Explanation — "Why this result?" (`lib/explain.js`)

- **`rankFactorContributions` (14–39)** multiplies each factor by its weight and sorts the results, using the same weights as the score, so the explanation can't drift away from the calculation. **Tested:** `lib/explain.test.js:12`.
- **`explainPressure` (80–173)** builds the sentences with fixed rules:
  1. **Largest contributor:** "X was the largest contributor today", if its contribution is above 0 (93–99).
  2. **Other factors:** each one with a value ≥ 60 gives "X increased the result"; one with a value ≤ 20 gives "X had a smaller effect" (101–116).
  3. **Deadline counts:** overdue and due-soon counts, with correct singular/plural wording (125–155).
  4. **Deadline points:** "Upcoming deadlines added N points…" (157–164).
  5. **Fallback:** "No single factor stood out today." if nothing else applies (166–170).
- **`resolveDeadlineInfo` (47–68)** uses the deadline data saved with the check-in when it exists. For older check-ins that don't have it, it recalculates from the *current* tasks — a documented limitation.
- **`{ forSharing: true }`**, used only by the Support summary, leaves out the "smaller effect" and "points" lines, because they only make sense next to the score. **Tested:** `lib/explain.test.js:92–107`.

### 7.8 Limitations of the model

- **Not validated:** the weights and the thirds-based thresholds are design choices, not clinically or empirically validated.
- **Self-report only:** the score reflects the student's own answers at one moment. It isn't a measurement of any condition.
- **Deadlines are counted, not sized:** the adjustment ignores how big a task is, and tasks with no due date don't count at all.
- **Rounding:** the score is rounded twice, once per factor and once in total. The effect is small.

> **How I would explain this to my assessors:** "The pressure result is plain arithmetic that anyone can check. Each answer is turned into a number from 0 to 100 where higher means more pressure, the five numbers are combined with fixed weights that add up to one, and the total falls into one of three bands. Then I add a small, capped amount for real deadlines — only the most serious deadline situation counts, so a long to-do list can't dominate. The result screen explains which factor contributed most, using the same weights, so it's always traceable. It isn't AI and it isn't a diagnosis; the weights are my design choice and I say so in the limitations."

**Evidence:**
- **Worked example:** the table in §7.6 as a figure
- **Scoring extract:** `risk.js:62–112`
- **Test results:** the boundary tests in `lib/risk.test.js` and `lib/pressure.test.js`
- **Screenshot:** the check-in result with "Why this result?" opened

---

## 8. The next-step recommendation and date rules

### 8.1 Date rules — `lib/dates.js`

- **Whole days only.** Dates are compared by calendar day, not by time of day (`startOfDay` at 8–10, `daysUntil` at 19–24).
- **`relativeDueLabel` (29–36)** gives neutral wording: "Overdue by N days", "Due today", "Due tomorrow", "N days left", "No due date". It never uses shaming language. **Tested:** `lib/dates.test.js:18–25`.
- **`urgencyCategory` / `urgencyRank` (56–70)** give the order overdue → today → tomorrow → this week (≤ 7 days) → later → no date.
- **`effectiveBucket(task)` (76–82)** works out the Today/Week/Later tab from the due date: overdue, today and tomorrow → Today; up to 7 days → Week; otherwise Later. Tasks with no date keep the tab they were created on. **Tested:** `lib/dates.test.js:64–80`.

### 8.2 Recommendation — `lib/recommendation.js`

- **`pickPriorityTask(tasks)` (37–47)** only considers open tasks, then sorts by:
  1. urgency rank
  2. the student's priority (high, normal, low; a missing priority counts as normal)
  3. the earlier due date

  JavaScript's sort is stable, so an exact tie keeps the original order. **Tested:** `lib/recommendation.test.js:12–57`, including "is deterministic".
- **`recommendAction(tasks, band)` (52–58)** returns the chosen task and its action text:
  - **Normally:** the task's current micro-step text.
  - **When the band is Higher:** "Just open "<title>". Nothing else is needed right now."
  - **The band never changes *which* task is chosen,** and never hides an overdue task. **Tested:** `:59–82`.
- **Two screens share it:** Today uses `recommendAction`, and Overwhelmed Mode and Learn use `pickPriorityTask`, so the student never gets two different "next steps". **Tested:** `NuvoraApp.ui.test.jsx:973–1046`.

> **How I would explain this:** "When you're overwhelmed, choosing what to do first is itself the hard part, so the app chooses one task using transparent rules — most urgent first, then your own priority, then the earliest date. If your check-in says pressure is high, it doesn't swap the task; it just shrinks what it asks of you to 'just open it'."

**Evidence:** a diagram of the ranking order; `lib/recommendation.test.js` results; a screenshot of Today's "One small next step" card.

---

## 9. Tasks and micro-steps: the data model and step rules (detailed)

### 9.1 The data model

A task looks like this:

```
{ id, title, module, due ('YYYY-MM-DD' or ''), priority ('low'|'normal'|'high'),
  taskType, bucket ('today'|'week'|'later'), done (true/false),
  currentStep: { id, text, done, completedAt },
  createdAt, updatedAt }
```

The key design idea is that the **academic task** and its **current micro-step** are separate:
- **Completing a step** (`completeCurrentStep`) never marks the task done.
- **Completing a task** (`toggleTask`) never marks the step done.

**Tested:** `lib/store.test.js:81–113`.

### 9.2 Step templates — `lib/steps.js`

- **The header comment (1–13)** makes clear the templates are fixed text, not AI-generated or personalised.
- **`TASK_TYPES` (14–21):** general, essay, presentation, exam revision, lab/practical, group project.
- **`PROGRESSIONS` (32–74):** a fixed list of four or five small steps per task type. For example, the essay list starts "Open a blank document and write only the title."
- **`initialStepText(taskType)` (81–83):** the first template for that type. It is used when a task is created (`Tasks.jsx:81`). **Tested:** `lib/steps.test.js:60`, `NuvoraApp.ui.test.jsx:894`.
- **`suggestAlternativeSteps(task)` (94–96):** three fixed, very small alternatives, such as "Set a two-minute timer and do only the first small part."
- **`makeCustomStep(task, text)` (98–100):** turns the student's own wording into a new, undone step.
- **`nextStepAfter(task)` (108–114):** finds the current step's text in the task type's list and returns the next template. After the last template it returns "Take a short break — you have made real progress today." If the current step was the student's own text, the search fails and the list starts again from the first template. **Tested:** `lib/steps.test.js:30–52`.
- **`stepId` (88–92):** makes a step ID from a counter. The counter restarts when the app reloads, so IDs are not guaranteed unique across sessions. They are only used to tell apart steps shown on screen at the same time.
- **`withStep` / `withStepDone` (120–126):** the local-state versions of `setCurrentStep` and `completeCurrentStep` (see §4).

### 9.3 Where steps change

| Where | Action | Store call | Local state update |
|---|---|---|---|
| Today `FocusTask` (`Today.jsx:420–434`) | Mark this step done | `completeCurrentStep`, then `recordStepCompleted` | `withStepDone`, stats +1 |
| Today `FocusTask` (405–418) | Edit step / pick a different step | `setCurrentStep` | `withStep` |
| Today `FocusTask` (431–434) | Generate next step | `setCurrentStep(nextStepAfter(task))` | `withStep` |
| Overwhelmed (124–142) | I opened it / I did this / I tried for two minutes | `completeCurrentStep` or `setCurrentStep` | `withStepDone` / `withStep` |
| Learn (39–81) | Use a suggested step / I did the current step | `setCurrentStep` / `completeCurrentStep` | same patterns |

### 9.4 Limitations

- **Fixed templates:** steps don't read the task's content; they are general templates per task type.
- **Restart after a custom step:** "Generate next step" after a step the student wrote starts the list again from the first template.
- **Overwhelmed Mode marks steps done loosely:** its "I opened it" and "I tried for two minutes" mark the current step done even if its wording was different. They add to the strategy count but not to "small steps taken".

> **How I would explain this:** "Every assignment has exactly one small current step, like 'write only the title'. Finishing the step never ticks off the whole assignment, because the point is to make starting feel achievable, not to pretend the work is finished. The steps come from fixed lists per type of task — essay, exam revision, and so on — so they're predictable and nothing is generated."

**Evidence:** a data-model diagram of a task and its `currentStep`; tests `lib/store.test.js:81–113` and `lib/steps.test.js`; a screenshot of Today showing "Step complete" and "Generate next step".

---

## 10. Screen: Onboarding and authentication

**What the student sees and can do.**
- **Onboarding (Firebase mode only, first visit):** three short intro screens, with Continue and Skip.
- **Sign-in screen:** Log in / Sign up tabs; email and password; an optional "What should Nuvora call you?" on sign-up; and "Forgot password?", which opens a reset form.

**Files and lines:**
- `components/screens/Onboarding.jsx`:
  - screen text (6–10)
  - component (15–30), with a screen-reader "Step N of 3" (23) and Continue/Skip (27–28)
- `components/screens/Auth.jsx`:
  - state (14–19)
  - `submit` (21–42)
  - `submitReset` (48–66)
  - reset view (68–94)
  - main view (96–134): tabs 113–116, form 118–126
- `lib/authErrors.js`: the `MESSAGES` map (14–26) and `authErrorMessage` (30–32)
- `components/screens/Splash.jsx` and `LoadError.jsx`

**Props, state, handlers, rendering:**
- **Onboarding:** takes `onDone` from the shell. The shell stores `nuvora-onboarding-seen = '1'` in `localStorage` (`NuvoraApp.jsx:208`).
- **Auth has no props.** Its state: `mode` (`login` | `signup` | `reset`), the form fields, `error`, `busy`, and the reset status.
- **`submit`:**
  - **Log in:** `signInWithEmailAndPassword`.
  - **Sign up:** `createUserWithEmailAndPassword`. If a display name was given, it also calls `saveSettings(uid, { displayName })`.
  - **Result:** there is no manual navigation afterwards. Firebase's `onAuthStateChanged` in the shell notices the new sign-in and loads the data.
- **`submitReset`:** shows the same reassuring message whether or not the account exists (lines 53–60). This avoids revealing which emails are registered.
- **Error messages:** `authErrorMessage` uses the same wording for wrong password and unknown user.
- **Accessibility and phone autofill:** `autoComplete` hints (email, current-password / new-password, nickname), `minLength` 6 with a visible "At least 6 characters" hint on sign-up, and `aria-pressed` on the tabs. Switching tabs clears the old error.

**`lib/` functions called:**
- `authErrorMessage` (`lib/authErrors.js`) and `saveSettings` (`lib/store.js`)
- Firebase Authentication functions, called directly from the Firebase SDK

**Success / error / empty / reopen:**
- **Success:** the shell loads the student's data.
- **Error:** a calm message with role `alert`.
- **Reopen:** Firebase keeps the session, so the student lands in the app. Onboarding doesn't repeat, because of the flag.

**Tested** (`components/NuvoraApp.firebase.test.jsx`):
- error mapping: `:69–99`
- forgot password: `:101–137`
- onboarding: `:245–291`
- optional display name: `:293–327`

Also `lib/authErrors.test.js`.

> **How I would explain this:** "Sign-in is standard Firebase email and password, but I paid attention to the wording: errors never reveal whether an email is registered, and they're written for a student, not a developer. Collecting a name is optional and nothing else identifying is asked for."

**Evidence:** screenshots of onboarding and sign-up (Firebase build); the test names above.

---

## 11. Screen: Today

**What the student sees and can do.**
- **Greeting:** a time-of-day greeting with their name, or "there" if none is set.
- **Pressure card:** either an invitation to check in, or the latest result with "Update workload pressure" and "Why this result?".
- **"I'm feeling overwhelmed"** button.
- **"One small next step" card:** one recommended task and its step. The student can mark it done, edit it, try a different step, or generate the next step.
- **"Also on today's plan":** up to three other tasks due today.
- **Calm Mode:** a completely different, simpler view (§14).

**File and lines:** `components/screens/Today.jsx`
- header comment (18–35); component (36)
- derived values (37–59)
- Calm handlers: `stopForNow` 61–75, `clearRestartMemory` 77–81, `leaveCalmMode` 83–90
- the rest of the day's tasks, without the focused one (94–95)
- Calm views: 97–296
- normal dashboard: 298–339
- `RiskCard`: 344–367
- `FocusTask`: 374–437
- `MiniTask`: 439–444

**Props, state, handlers, rendering:**
- **Props:** the shared data and settings, plus the Calm state and its setters from the shell.
- **`risk` (40)** is the **latest** check-in's result. If that check-in was incomplete, Today shows the check-in invitation instead.
- **`recommendation` (41)** is `recommendAction(data.tasks, risk?.band)`.
- **The dashboard (298–339)** shows:
  - a "Restart point saved" card, if one exists
  - the welcome card
  - the check-in invitation or `RiskCard`
  - the Overwhelmed button
  - the `FocusTask`, or an empty state: "Your space is ready" with "+ Add one task" when there are no tasks, or "Your plan is clear" when every task is done
  - `MiniTask`s for the rest of today, not repeating the focused task
- **`RiskCard`** hides the score number when Calm Mode's "Hide progress numbers" is on. The band and the explanation stay.
- **`FocusTask.run(persist, patch, successText)` (383–397):**
  - ignores repeated taps while busy
  - awaits the store call
  - applies `patch` to the shared data
  - shows a success message, or the calm generic error

  "Mark this step done" also records a step and updates stats. That count is secondary: if it fails, the step is still reported as saved.

**`lib/` functions called:** `recommendAction`, `explainPressure`, `relativeDueLabel`, `effectiveBucket`, `makeCustomStep`, `suggestAlternativeSteps`, `nextStepAfter`, `withStep`, `withStepDone`, `timeOfDayGreeting`, `displayNameOrFallback`, `moduleColor`, and from the store `completeCurrentStep`, `setCurrentStep`, `recordStepCompleted`, `withStepCounted`.

**Success / error / empty / reopen:**
- **Success:** the card updates immediately. **Tested in Firebase mode:** `NuvoraApp.firestore-journeys.test.jsx:70`, `:85`.
- **Error:** "That did not save. Please try again in a moment." (`components/constants.js`).
- **Empty:** the empty states described above.
- **Reopen:** everything is reloaded, so the step state persists. **Tested (demo):** `NuvoraApp.journeys.test.jsx:148`.

> **How I would explain this:** "Today is deliberately not a dashboard of everything. It shows how things are, one way out if it's too much, and exactly one next step. If you finish the step, it says so without pretending the assignment is done, and offers the next small step."

**Evidence:** screenshots of Today normal and empty; the tests `NuvoraApp.ui.test.jsx:1158` (focus task not repeated) and `NuvoraApp.firestore-journeys.test.jsx:70`.

---

## 12. Screen: Tasks

**What the student sees and can do.** A "My plan" header with an add (+) button, Today/Week/Later tabs, and task cards showing:
- module, due label, "High priority" if set, title and current step
- a completion toggle, which offers **Undo** after completing
- edit and delete buttons; delete asks for confirmation

Adding and editing open an accessible modal sheet with a form for title, module chips (including "+ New module"), due date, priority and task type.

**File and lines:** `components/screens/Tasks.jsx`
- `TaskForm`: 17–48
- component: 58
- state: 59–68
- `filtered` by `effectiveBucket`: 69
- `create`: 71–94
- `saveEdit`: 96–111
- `runOnTask`: 113–124
- `toggle`: 126–132
- `undoComplete`: 134–142
- `remove`: 144–150
- render: 154–199

**Props, state, handlers, rendering:**
- **Props:** `data`, `uid`, `setData`, `calmMode`, `calmSession`.
- **`create`** builds the new task, including a first `currentStep` from `initialStepText(taskType)` (81), saves it with `addTask`, and puts the **returned** task (which has its real ID) at the top of the list.
- **`saveEdit`** calls `updateTask`, then merges the edited fields into the local copy (103–104). It does **not** use the return value (see §4).
- **`runOnTask`** keeps a set of busy task IDs, so repeated taps on the same task are ignored while it saves.
- **In Calm Mode:**
  - only the Today tab shows, behind "Show week & later" (161–163)
  - deadlines and priority are hidden when "Hide time pressure" is on (176)
  - step text and edit/delete are hidden when "Reduce visual detail" is on (179–184)

**`lib/` functions called:** `addTask`, `updateTask`, `toggleTask`, `removeTask`, `effectiveBucket`, `relativeDueLabel`, `initialStepText`, `TASK_TYPES`, `availableModules`, `moduleColor`.

**Success / error / empty / reopen:**
- **Success:** the list updates immediately; completing shows an Undo message with role `status`.
- **Error:** the generic error message.
- **Empty:** "Nothing here yet — Add one task when you are ready."
- **Reopen:** tasks are reloaded and regrouped from their due dates.

**Tested:**
- add → reload persistence: `NuvoraApp.journeys.test.jsx:100`, `:148`
- edit in Firebase mode: `NuvoraApp.firestore-journeys.test.jsx:57`
- modal keyboard focus: `NuvoraApp.ui.test.jsx:282–384`
- Calm hiding: `:428–460`
- task-type steps: `:894`

> **How I would explain this:** "Tasks sort themselves into Today, Week and Later from their due dates, so students with time-blindness don't have to keep re-filing things. Every new task gets a small first step straight away. Completing a task can be undone, and deleting asks first, so a mis-tap isn't punishing."

**Evidence:** screenshots of the task list and the add-task sheet; the tests above.

---

## 13. Screen: Daily check-in and results

**What the student sees and can do.**
- **Questions:** five, one per screen, with a progress bar and "Question N of 5". The first question uses descriptive options; the others use a 1–5 scale with end labels. Every question has "Not sure / prefer not to answer".
- **Controls:** "Back" and "Exit for now".
- **Results:** a band ("Moderate pressure", for example) with its message, a statement that it is not a diagnosis, "Why this result?", and "Choose my next step". If any answer was "Not sure", a calm "That's okay." screen appears instead.

**File and lines:** `components/screens/Checkin.jsx`
- questions: 13–23
- header comment: 25–36
- component: 37 (props: `uid`, `data`, `setData`, `go`, `draft`, `setDraft`, `hideNumbers`)
- local state `risk`, `incomplete`, `error`, `submitting`: 38–41
- focus effect: 51–53
- `setAnswer`: 55–58
- `next`: 61–111
- incomplete view: 113–117
- result view: 119–131
- question view: 133–162

**`next()` step by step (61–111):**
1. **Ignore repeated taps** while submitting (62).
2. **Nothing chosen:** show "Choose the option that feels closest, or 'Not sure'." (63).
3. **Not the last question:** move to the next question (64).
4. **Any "Not sure" answer (69–82):**
   - save `{ answers, risk: null, incomplete: true }` with `saveCheckin` (73)
   - add it to the shared data
   - show the "That's okay." screen

   No score is guessed.
5. **Otherwise (84–110):**
   - `calculatePressure(answers)` (92)
   - `combineWorkloadPressure(r, data.tasks)` (97)
   - **save first** with `saveCheckin` (102)
   - then update the shared data and show the result (103–104)

   If saving fails, the answers stay on screen with an error. The result is never shown for an unsaved check-in.

**Rendering decisions:**
- **The draft lives in the shell** (`NuvoraApp.jsx:81`), so leaving and coming back keeps the answers.
- **Keyboard support:** the answers are a WAI-ARIA radio group with arrow-key support (`components/ui/radiogroup.js:6–22`).
- **Focus:** moves to the result heading when the result appears (51–53), so screen-reader users hear that the screen changed.
- **Next screen:** after a Higher result, "Choose my next step" goes to Overwhelmed Mode; otherwise it goes to Today (129).
- **Calm Mode:** `hideNumbers` hides the "Pressure estimate: N/100" line (126).

**`lib/` functions called:** `calculatePressure`, `combineWorkloadPressure`, `explainPressure`, `saveCheckin`.

**Success / error / empty / reopen:**
- **Success:** the result screen.
- **Error:** a message with role `alert`, and the answers are kept. **Tested:** `NuvoraApp.ui.test.jsx:67–134`.
- **"Not sure":** the incomplete screen.
- **Reopen:** the saved check-in appears on Today and Progress. **Tested:** `NuvoraApp.journeys.test.jsx:100`.

**Firebase caveat:** see §5. `validRisk` now explicitly accepts `risk: null`, so incomplete check-ins are expected to save correctly in Firebase mode — this fix has not yet been confirmed against a live emulator.

> **How I would explain this:** "The check-in asks one thing at a time and always lets you say 'not sure'. If you do, I don't guess — I save what you gave and say plainly that there's not enough to calculate a band. The result is only shown after it's actually saved, so the app never claims to have recorded something it hasn't."

**Evidence:** screenshots of a question, a result with "Why this result?" open, and the incomplete screen; the tests `NuvoraApp.journeys.test.jsx:76` (descriptive options score exactly as before) and `NuvoraApp.a11y.test.jsx:120–146` (keyboard).

---

## 14. Calm Mode (cross-cutting)

**What the student sees and can do.** Calm Mode is switched on with the header "Calm" button, the Settings switch, or "Continue gently" on a saved restart point. When it is on:
- **Today** shows one task, one step, "Open my plan" and "Stop for now", plus "Adjust calm settings" (four temporary preferences) and "Leave Calm Mode".
- **The bottom nav** shrinks to "My step" and Support.
- **Every screen** gets a softer background, flatter cards and no decorative illustrations.
- **The Support summary** is folded behind "Show the summary".
- **Score numbers** are hidden.
- **A soft, continuous background sound** fades in. A speaker button in the header stops or restarts it.

**Where it lives:**
- **Shell (`NuvoraApp.jsx`):**
  - `calmSession` state (74), with defaults in `components/constants.js` (all four preferences on)
  - the switching-on effect (122–137)
  - sound state and stop rule (141–154); sound start in `updateSettings` (236)
  - header toggle and sound button (270–295)
  - classes on `<main>` (263): `calm`, `reduced`, `calm-low-detail`
  - `calmNav` (44)
- **Today (`Today.jsx`):** the five views in order, from 97 to 339 (comment at 23–35):
  1. leaving Calm Mode (97–130)
  2. "You can stop here" (132–163)
  3. welcome back to a restart point (165–198)
  4. the Calm view itself (200–296)
  5. the normal dashboard (298–339)
- **Other screens:**
  - Tasks: 161–184
  - Progress: numbers (24), trends collapsed (70–72)
  - Support: folded summary (45–49)
  - Check-in: `hideNumbers` (126)
- **CSS:** `app/styles/final-polish.css:154–214` (the Calm look on every screen, the header sound button and the Calm hero alignment) and `app/styles/calm-mode.css`.
- **Sound:** `lib/calmSound.js` — a comment explaining it's not a treatment (1–19), constants (21–31), `startCalmSound` (41–91), `stopCalmSound` (93–107).

**Handlers, step by step:**
- **`stopForNow` (`Today.jsx:61–75`)** saves a restart point `{ taskId, taskTitle, stepText, stoppedAt }` into settings. It shows "You can stop here" **only if the save succeeded**.
- **The restart point is saved with the settings,** so it survives reopening the app (`sanitizeRestartMemory` checks it on load). It is offered again the next time Calm Mode is used.
- **`leaveCalmMode`** only proceeds if switching Calm Mode off was saved.
- **Sound:**
  - It starts only within a tap: `updateSettings`, or the speaker button.
  - It stops when Calm Mode turns off, when the sound setting is switched off, on sign-out, or when the app closes (the effect at 148–154).
  - `startCalmSound` builds three quiet sine tones, each with a slightly detuned twin, through a low-pass filter. A very slow oscillator (1/12 Hz) gently moves the volume up and down. The master volume is about 0.035 of full, with a 2.5-second fade in and a 1.2-second fade out.

**Success / error / empty / reopen:**
- **If a Calm-related save fails,** the setting rolls back and "Your place is saved" is not shown. **Tested:** `NuvoraApp.firestore-journeys.test.jsx:145`.
- **With no tasks,** the calm styling applies to the normal dashboard.
- **Reopening:** Calm Mode stays on (it is a saved setting), but the sound does **not** start by itself. **Tested:** `NuvoraApp.calmSound.test.jsx:70`.

**Tested:**
- two-item nav: `NuvoraApp.ui.test.jsx:385–505`
- temporary preferences: `:507–666`
- stop and restart: `:668–785`
- gentle exit: `:787–892`
- Calm on other screens: `:1176–1224`
- sound behaviour: `NuvoraApp.calmSound.test.jsx:33–107`
- sound engine: `lib/calmSound.test.js`

> **How I would explain this:** "Calm Mode is for the moment the full app is too much. It isn't just a colour change: Today shrinks to one step, the navigation drops to two items, numbers and deadlines can be hidden, and the student can stop and have their exact place saved for later. The optional background sound is something some people find settling; I don't claim it treats anything, it only starts when you tap, and it can always be stopped from the header."

**Evidence:** side-by-side screenshots of Today with Calm Mode off and on; the "Stop for now" → "Welcome back" sequence; the test list above.

---

## 15. Screen: Overwhelmed Mode

**What the student sees and can do.** "Let's make everything smaller." The student picks what is making things difficult (a keyboard-accessible radio group) and gets one matching action:

| Choice | What the student gets | What is saved |
|---|---|---|
| **Where to start** | "Just open the task" | "I opened it" marks the current step done |
| **Too big** | Pick one of three smaller steps | "I did this" saves it as the current step, already done |
| **Low energy** | An optional two-minute timer | "I tried for two minutes" marks the current step done |
| **Reset** | A breathing prompt | Only the strategy count |
| **Ask for help** | An editable message to copy | Nothing is sent; only the strategy count |

"Not now" returns to Today.

**File and lines:** `components/screens/Overwhelmed.jsx`
- header comment: 23–38
- `BARRIERS`: 14–20
- component: 39
- state: 40–46
- `task = pickPriorityTask(...)`: 47
- `orderedBarriers = orderByUsage(...)`: 54
- effects: 56–64
- `countStrategy`: 68–70
- `markDone(persist, patch)`: 74–89
- `continueAfterReset`: 91–94
- `copySupportMessage`: 96–105
- done view: 107–112
- main view: 114–160

**Handlers:**
- **`markDone`:**
  - ignores repeated taps (75)
  - with no open task, finishes calmly without saving (76)
  - otherwise saves, applies `patch` to the shared data, counts the strategy, and shows "One step down."
- **`countStrategy`** records the use and updates stats in state. A failure here is deliberately not shown.
- **The support message** is filled in with the support person's name (60–64), and it is only ever copied to the clipboard.

**`lib/` functions called:** `pickPriorityTask`, `suggestAlternativeSteps`, `withStep`, `withStepDone`, `orderByUsage`, and from the store `completeCurrentStep`, `setCurrentStep`, `recordStrategyUse`, `withStrategyCounted`.

**Success / error / empty / reopen:**
- **Success:** the "One step down." screen, with focus moved to its heading.
- **Error:** the generic error, and the choice stays on screen.
- **Empty:** with no task, text-only guidance.
- **Reopen:** the barrier order reflects saved usage.

**Tested:**
- ordering by usage: `NuvoraApp.ui.test.jsx:942–971`
- same priority task as Today: `:973`
- reset panel: `:1048`
- "I opened it" updates Today in Firebase mode: `NuvoraApp.firestore-journeys.test.jsx:110`
- accessibility: `NuvoraApp.a11y.test.jsx:79`

> **How I would explain this:** "When someone says they're overwhelmed, the app asks one question — what's in the way — and answers with one small action matched to that barrier, on the same task Today would suggest. The options they've actually used before move to the top, so the most useful choice is the easiest to reach."

**Evidence:** screenshots of the barrier list and the low-energy panel with its timer; the ordering test.

---

## 16. Screen: Learn

**What the student sees and can do.** "What would help right now?" offers six choices: I can't start / This feels too big / I have very low energy / I'm overstimulated / I need company / I don't know what I need. Each opens one matching panel:

| Choice | Panel |
|---|---|
| I can't start | A "launch step" and an if–then cue |
| This feels too big | A three-step map; picking a step saves it as the task's current step |
| I have very low energy | Tiny / Enough / Full effort options, plus "I did the current step" |
| I'm overstimulated | Five sensory changes; no task work is required |
| I need company | Copy a message asking someone to work alongside you; an optional external video link |
| I don't know what I need | Three drop-downs that route to one of the panels above |

Below that:
- **Reset Space:** optional external wellbeing links, which open outside the app.
- **"More study tools"** (collapsed): a Focus Sprint timer with a length chosen by the student, a Distraction Parking Lot, an If–Then Plan, and a Visual Step Map.

**File and lines:** `components/screens/Learn.jsx`
- header comment: 14–22
- component: 23
- state: 24–36
- `task = pickPriorityTask(...)`: 37
- `persistSuggestedStep`: 39–60
- `useShrunkStep`: 62–65
- `markLowEnergyDone`: 67–81
- `copyBodyDoubleMessage`: 83–95
- `helperRecommendation`: 97–104
- `renderSupportPanel`: 117 onwards, with panels at 120, 138, 155, 174, 203 and 213
- the visual step map and tools lists: 255–348
- render: 353–426 ("What would help right now?" 358; Reset Space 375; More study tools 388)

**Handlers:**
- **`persistSuggestedStep`** saves a new current step for the priority task (`setCurrentStep`), then patches the local copy (43–53). The comment there explains why the return value isn't used.
- **`markLowEnergyDone`** saves the step as done, applies `withStepDone`, then records a step and updates stats.
- **`copyBodyDoubleMessage`** copies the message to the clipboard and counts the "support" strategy.
- **`helperRecommendation`** is a fixed rule:
  - environment "overwhelming" → the sensory panel
  - otherwise, brain "tired" → the energy panel
  - otherwise, task "too big" or "unclear" → the "too big" panel
  - otherwise → the "can't start" panel
- **Session-only data:** the parking lot, if–then plan and sensory choice live only in this screen's state. They are never saved.
- **External links** go through `components/ui/ExternalLink.jsx` (13–25). In the phone apps they open in the system browser (`@capacitor/browser`).
- **Calm Mode:** Learn receives `calmMode` but doesn't currently use it. Learn isn't reachable from the Calm Mode nav anyway.

**`lib/` functions called:** `pickPriorityTask`, `makeCustomStep`, `withStepDone`, and from the store `setCurrentStep`, `completeCurrentStep`, `recordStepCompleted`, `recordStrategyUse`, `withStepCounted`, `withStrategyCounted`.

**Success / error / empty / reopen:**
- **Success:** "Saved as your next step for this task." / "Saved. That step is done — the assignment stays open."
- **Error:** the generic error, or a copy-failure message.
- **Empty (no tasks):** the panels show general text-only guidance.
- **Reopen:** saved steps persist; session-only notes are gone, as intended.

**Tested:**
- Learn behaviour: `components/NuvoraApp.learn-difficult.test.jsx:62–171`
- tools: `NuvoraApp.ui.test.jsx:1061–1131`
- Firebase-mode save: `NuvoraApp.firestore-journeys.test.jsx:97`

> **How I would explain this:** "Learn isn't a library of articles. You pick the problem that feels closest and get one practical tool for it — for example, if you're overstimulated, it suggests changing one thing about your environment and explicitly says no work is required. Anything that changes your plan only ever changes the current small step, never the assignment."

**Evidence:** screenshots of the choice list and one open panel; the test file named above.

---

## 17. Screen: Weekly reflections (detailed)

**What the student sees and can do.**
- **Reached from Progress.** There is a back button to Progress.
- **Two optional prompts:** "What felt manageable this week?" and "What would help make next week a little easier?".
- **Save reflection.**
- **Past reflections:** newest first. The five most recent show by default, with "Your 5 most recent reflections, newest first." and "Show older reflections (N)".

**File and lines:** `components/screens/Reflection.jsx`
- prompts: 9–12
- `RECENT_COUNT = 5`: 16
- comment: 18–24
- component: 25
- state `answers`, `saving`, `status`, `showAll`: 26–29
- `visible`: 30–31
- `save`: 33–52
- render: 54–82

**`save()` step by step (33–52):**
1. **Ignore repeated taps** while saving.
2. **Both answers blank:** show a gentle validation message.
3. **Save:** `saveReflection(uid, answers)` (42) returns the entry **with its real ID and a date**.
4. **Update the list:** that entry goes at the front of `data.reflections` (43).
5. **Finish:** clear the text boxes and show "Saved. Thank you for taking a moment for this."
6. **On error:** log to the console and show the generic error.

**Rendering decisions (66–81):**
- Each card shows the date from `reflectionTime(r)`, or no date if it's unknown.
- The "Manageable" and "Would help" answers are shown.
- So is a single `text` field, which is used by reflections written by the synthetic-data seed script.

**Data flow and persistence:**
- **Demo mode:** the entry is saved in `localStorage` with an ISO date.
- **Firebase mode:** the entry is saved to `users/{uid}/reflections` with a server timestamp. The returned copy carries the local save time until the next load.
- **On load, in both modes,** `normalizeReflections` sorts newest first using `reflectionTime`, which reads every date format consistently.

**The bug I fixed.** Students saw past reflections as empty cards with only a date, and entries beyond the fifth were unreachable.
- **How I confirmed it:** a read-only check of the live Firestore data (field names and counts only) showed that every account held ten seeded reflections stored as `{ text, barrier }`. The screen only displayed `manageable`/`hard`, and the list was silently cut at five.
- **The fix:** show `text` entries; keep the five-item limit but label it and allow expanding; sort consistently; return the saved entry from the store.
- **Existing data was not changed or migrated.**

**Success / error / empty / reopen:**
- **Success:** the new entry appears at the top immediately.
- **Error:** the generic error, and the typed text is kept.
- **Empty:** no "Past reflections" heading.
- **Reopen, navigation and sign-in:** the entry persists after navigating away and back, reloading, and signing out and back in.

**Tested:**
- Firebase mode, save → navigate → reload → sign out/in, plus seeded `text` entries: `components/NuvoraApp.reflection.test.jsx:113–186`
- demo mode, the same journey: `NuvoraApp.journeys.test.jsx:165`
- store behaviour: `lib/store.test.js:367–418`

> **How I would explain this:** "Reflections are entirely in the student's own words — Nuvora never summarises or scores them. When I found older entries showing as blank cards, I traced it to a mismatch between how some data was stored and what the screen displayed, fixed the display rather than rewriting anyone's data, and added regression tests covering save, navigate, reload and signing back in, for both storage modes."

**Evidence:** screenshots of the reflection list, before and after "Show older reflections"; the reflection test file's results.

---

## 18. Screen: Progress

**What the student sees and can do.**
- **Three neutral totals:** check-ins so far, small steps taken, strategies used.
- **Patterns:** only when there is enough data.
- **Helpful strategies:** which support strategies have been used, and how often.
- **Recent pressure patterns:** the last seven check-ins, each expandable to its explanation. Incomplete ones are labelled "Incomplete".
- **Buttons:** a Weekly reflection button, and "Hide these details".

**File and lines:** `components/screens/Progress.jsx`
- strategy labels: 11
- design comment: 13–19
- component: 20
- totals: 21–22
- `showProgressNumbers`: 24
- hidden view: 26–32
- patterns: 34
- trends and strategies: 36–58
- main render: 60–75

**Logic:**
- **Hidden view:** if `settings.hideProgress` is on, only "Progress is hidden" and "Show progress again" appear.
- **Patterns:** `buildPatternInsights(data.checkins)` (`lib/patterns.js:75–82`) combines two rules.
  - **Most frequent contributor (`mostFrequentContributor`, 23–38):** looks at up to the eight most recent scored check-ins and needs at least three. It only reports a factor that was the largest contributor in at least half of them.
  - **Day-of-week gap (`dayOfWeekPattern`, 44–69):** needs at least six scored check-ins, at least two weekdays with two or more samples each, and a gap of at least 15 points between the highest and lowest daily averages.
  - **Otherwise nothing is shown.** No placeholder appears, so the app never overclaims from noise. **Tested:** `lib/patterns.test.js`, `NuvoraApp.ui.test.jsx:911–940`.
- **Trend rows** use `explainPressure` for each check-in's details.
- **Calm Mode:** numbers are replaced by "Used" or the band name, and trends are collapsed until asked for.

**Data flow:**
- **Read-only screen:** Progress only reads `data`. Changing "Hide these details" goes through `updateSettings`.
- **Counts update without reloading:** the numbers change as the student works, because Today, Learn and Overwhelmed Mode update `data.stats` with `withStepCounted` / `withStrategyCounted`. **Tested:** `NuvoraApp.firestore-journeys.test.jsx:70` (the count goes from 4 to 5).

**Success / error / empty / reopen:**
- **Empty:** "Your trends will appear here — Complete a check-in whenever it feels helpful."
- **Reopen:** counts come from the saved stats.

**Limitation:** a check-in with no `createdAt` shows today's date (line 47 falls back to `Date.now()`).

> **How I would explain this:** "Progress is designed to be reflective rather than motivational pressure: there are no streaks, targets or 'missed days'. Pattern sentences only appear when there's genuinely enough data, with minimum sample sizes and a minimum gap, and the student can hide the whole section."

**Evidence:** a screenshot of Progress; the `lib/patterns.test.js` results.

---

## 19. Screen: Support

**What the student sees and can do.**
- **"A summary you control":** a short summary made from the latest check-in, with "Copy summary". In Calm Mode the summary is folded behind "Show the summary".
- **Links:** to Settings, the support person, and Privacy.
- **"Need urgent help?"** notice: Nuvora is not an emergency or healthcare service; contact the university support service, NHS 111 or emergency services.

**File and lines:** `components/screens/Support.jsx`
- comment: 9–13
- component: 14
- latest check-in result: 15
- shareable explanation (`forSharing`): 17
- summary text built from fixed lines: 18–28
- `copy`: 30–38
- render: 40–76 (Calm fold: 45–49)

**Data flow:**
- **No writes:** Support only reads the latest check-in and the tasks.
- **Clipboard only:** `copy` writes to the student's own clipboard. Nothing is ever sent.
- **Disabled until there's a result:** "Copy summary" can't be used until a completed check-in exists.

**Success / error / empty / reopen:**
- **Success:** "Copied to your clipboard." (role `status`).
- **Error:** "We couldn't copy that automatically…" (role `alert`).
- **Empty:** "Complete a check-in to prepare a short support summary."

**Tested:**
- copy and ARIA roles: `NuvoraApp.ui.test.jsx:29–65`, `:136–160`
- Calm fold: `:1187`
- sharing filter: `lib/explain.test.js:92`

> **How I would explain this:** "Asking for help is hard when you're overwhelmed, so Nuvora drafts the words for you — but it's always your choice. It only copies text to your clipboard; the app never contacts anyone."

**Evidence:** a screenshot of the Support card; the copy tests.

---

## 20. Screen: Settings

**What the student sees and can do.**
- **Name:** an optional name for the greeting.
- **Switches:** Calm Mode, "Play calming sound when Calm Mode starts", and Reduced motion.
- **Text size:** Standard / Medium / Large.
- **Support person:** a name and a note. Nuvora never contacts this person.
- **Back button:** returns to the screen the student came from.

**File and lines:** `components/screens/SettingsPage.jsx`
- component: 11
- `saveText`: 16–20
- render: 22–46
- the `Setting` switch component: `components/ui/Setting.jsx:3–5` (a checkbox with `role="switch"`)

**Logic:**
- **Instant saves:** each switch calls `onChange`, which is the shell's `updateSettings`, so it saves straight away.
- **Text fields save when you leave them,** and only if the text changed. A quiet "Saved." appears if the save succeeded (16–20).
- **Text size:** the chosen scale becomes the `--scale` CSS variable on `<main>` (`NuvoraApp.jsx:264`).

**Data flow:** `saveSettings` stores sanitised settings: in demo mode in the local store; in Firebase mode on `users/{uid}`, merged with what's already there.

**Success / error / empty / reopen:**
- **Error:** the setting rolls back and an error appears.
- **Reopen:** settings are reloaded and sanitised.

**Limitation:** if a text field loses focus while another settings save is running, that change is ignored without a message, because `updateSettings` returns `false` while busy.

**Tested:**
- settings persistence and sanitising: `lib/store.test.js:115–217`
- the sound switch: `NuvoraApp.calmSound.test.jsx:84`
- back navigation: `NuvoraApp.ui.test.jsx:253–280`

> **How I would explain this:** "Settings covers the accessibility preferences — Calm Mode, motion, text size — and an optional support-person note that's purely for the student. Every change saves straight away, and if a save fails the switch goes back rather than pretending."

---

## 21. Screen: Privacy & data

**What the student sees and can do.**
- **Plain-language explanations**, in collapsible sections: what is stored, how it is used, who can see it, offline and shared devices, and the pressure result not being a diagnosis.
- **Export:** "Download my data" (a JSON file).
- **Delete** check-ins and reflections, or delete completed tasks. Each asks for confirmation.
- **Delete everything:** type DELETE, then confirm.
- **Firebase mode only:** delete the account, which needs DELETE plus the password.

**File and lines:** `components/screens/Privacy.jsx`
- `downloadJson`: 12–22
- behaviour comment: 24–38
- component: 39
- `run` helper: 46–54
- `handleExport`: 56–69
- `handleDeleteCheckins`: 71–77
- `handleDeleteCompleted`: 79–85
- `handleDeleteAll`: 87–99
- `handleDeleteAccount`: 101–134
- render: 136–196

**Logic, step by step:**
- **`handleDeleteAll`:**
  1. requires the typed word DELETE and a confirmation dialog
  2. `deleteAllData(uid)`
  3. clears tasks, check-ins, reflections and stats in state
  4. saves the default settings

  In Firebase mode, step 4 recreates the `users/{uid}` document holding only the defaults.
- **`handleDeleteAccount`:**
  1. requires DELETE and the password
  2. **re-checks the password first** (`reauthenticate`), so nothing is deleted if the password is wrong or the session is too old
  3. deletes the data, then deletes the sign-in account

  Firebase Authentication and Firestore are separate services, so this is **not atomic**.
- **Export:** calls `exportAllData`, then downloads the result as a file through a temporary link.

**Success / error / empty / reopen:**
- **Success:** a status message, e.g. "All your Nuvora data has been deleted." The on-screen data is cleared immediately, including the Progress counts (**tested:** `NuvoraApp.firestore-journeys.test.jsx:125`).
- **Account deletion error:** mapped wording from `authErrorMessage`.

**Tested:**
- deletion order: `NuvoraApp.firebase.test.jsx:178–243`
- demo deletion journey: `NuvoraApp.journeys.test.jsx:197`
- store deletion scope: `lib/store.test.js:420–488`
- offline explanation: `NuvoraApp.ui.test.jsx:199`

**Limitation:** the browser-style download may not work inside the Android and iOS apps. This is not verified.

> **How I would explain this:** "Students can see in plain English what's stored and why, download all of it, and delete exactly the category they choose. Account deletion checks the password before touching anything, which fixed an earlier order where data could be deleted and then the account deletion fail."

**Evidence:** a screenshot of the Privacy screen with "Delete your data" open; the deletion-order tests.

---

## 22. Accessibility features

| Feature | Where | Tested? |
|---|---|---|
| Keyboard radio groups (arrow keys, Home/End, focus follows the selection) | `components/ui/radiogroup.js:6–22`; used by Check-in and Overwhelmed Mode | Yes: `NuvoraApp.a11y.test.jsx:120–146` |
| Menu drawer: focus moves in, Tab stays inside, Escape closes, focus returns to the menu button | `components/ui/Drawer.jsx:9–41` | Yes: `NuvoraApp.a11y.test.jsx:90–118` |
| Modal sheet (add/edit task) with the same focus management | `components/ui/AccessibleSheet.jsx:9–58` | Yes: `NuvoraApp.ui.test.jsx:282–384` |
| Status messages: role `status` (polite) for confirmations, role `alert` (assertive) for errors | `components/ui/StatusMessage.jsx:6–9` | Yes: `NuvoraApp.ui.test.jsx:136–160` |
| Focus moves to new headings (check-in result, "One step down.", load error) | `Checkin.jsx:51–53`, `Overwhelmed.jsx:56–58`, `LoadError.jsx:11` | Partly (the result flows are tested) |
| Toggle buttons expose their state (`aria-pressed`: Calm, sound, tabs, text size) | `NuvoraApp.jsx:274`, `:286`; `SettingsPage.jsx:34` | Yes: `NuvoraApp.ui.test.jsx:1133`, `NuvoraApp.calmSound.test.jsx:34` |
| Automated axe-core checks of the main screens | `components/NuvoraApp.a11y.test.jsx:40–88` | Yes |
| Colour contrast of text tokens | `app/globals.contrast.test.js` | Partly: the test computes ratios from the token hex values in the CSS; rendered contrast (overlays, gradients, Calm Mode, text over images) has not been measured |
| Reduced motion: an app setting, and the operating-system preference | `.reduced` in `app/styles/base.css:204`; the `prefers-reduced-motion` block from 265 | Yes: `app/accessibility.final.test.js:17` |
| Visible keyboard focus outline | `app/styles/base.css:216` | Yes: `app/accessibility.final.test.js:24` |
| Text size scale (1, 1.15, 1.3) | `--scale` on `<main>` | Checked visually at 320 px wide in Chrome; not automated |
| 44 px touch targets on most controls; the layout reserves room for the notch and home indicator | `app/styles/final-polish.css`, safe-area block from 81; `app/layout.js:12` (`viewportFit: 'cover'`) | Checked in desktop Chrome at phone sizes; **not** on devices |
| A way to stop the continuous sound (WCAG 1.4.2) | the header sound button, `NuvoraApp.jsx:283–294` | Yes: `NuvoraApp.calmSound.test.jsx:34` |

> **How I would explain this:** "Accessibility was built in, not added at the end: keyboard patterns follow the WAI-ARIA guidance, errors and confirmations are announced to screen readers, and the main screens pass automated axe checks. This is partially verified: rendered contrast and full WCAG conformance were not established. The contrast test checks the colour tokens, not what appears on screen, and I haven't tested with assistive-technology users."

---

## 23. Tests

- **Runner:** Vitest 2 with jsdom and React Testing Library (`vitest.config.js`, `vitest.setup.js`). A second, `node`-environment config (`vitest.rules.config.js`) exists solely to run `firestore-rules.emulator-test.js` via `npm run test:rules`, since that file's name deliberately doesn't match the main config's default discovery pattern (see §5).
- **Result at the time of writing:** `npx vitest run` → **25 files, 320 tests, all passing** (re-confirmed on 29 September 2026, after fixes to `firestore.rules` and the test-runner config).

| Test file | What it covers |
|---|---|
| `lib/risk.test.js`, `lib/pressureConfig.test.js`, `lib/pressure.test.js`, `lib/explain.test.js` | Scoring maths, boundaries, invalid input, weights, deadline tiers, explanations |
| `lib/recommendation.test.js`, `lib/dates.test.js` | The five recommendation rules; date boundaries and grouping |
| `lib/steps.test.js` | Templates, progressions, fallbacks |
| `lib/store.test.js` | Demo-mode persistence, migration, sanitising, corrupted-data recovery, reflections, stats, deletion scope, export |
| `lib/patterns.test.js` | Minimum-data rules for pattern insights; usage ordering |
| `lib/calmSound.test.js` | Sound starts, doesn't duplicate, fades and stops, fails safely (fake Web Audio) |
| `lib/authErrors.test.js`, `lib/greeting.test.js`, `lib/modules.test.js`, `lib/timer.test.js` | Wording and helpers |
| `components/NuvoraApp.journeys.test.jsx` | End-to-end demo journeys: add task → check-in → explanation → Overwhelmed → micro-step → reload → delete |
| `components/NuvoraApp.firestore-journeys.test.jsx` | Firebase-mode journeys through the real `store.js` Firestore code, using `test/fakeFirestore.js` |
| `components/NuvoraApp.reflection.test.jsx` | Reflection save/reload/sign-in in Firebase mode, using data shaped like the real accounts |
| `components/NuvoraApp.firebase.test.jsx` | Sign-in wording, password reset, load failure and retry, account-deletion order, onboarding (Firebase mocked) |
| `components/NuvoraApp.ui.test.jsx` | Support copying, error handling, offline banner, navigation, modal keyboard focus, all Calm Mode phases, patterns, Overwhelmed ordering, Learn tools |
| `components/NuvoraApp.learn-difficult.test.jsx` | The Learn support panels |
| `components/NuvoraApp.calmSound.test.jsx` | When the Calm sound starts and stops |
| `components/NuvoraApp.a11y.test.jsx` | axe-core scans, drawer focus, radio-group keys |
| `app/globals.contrast.test.js`, `app/accessibility.final.test.js` | Contrast and CSS accessibility safeguards |
| `firestore.rules.test.js` | Static text checks of the security rules |

**What the tests do *not* cover:**
- the real Firebase backend
- the Firestore rules under the emulator
- real phones, or real audio output
- visual layout (jsdom has no layout engine)
- usability with students

**A note on `test/fakeFirestore.js`:** it is an in-memory stand-in for the Firestore SDK. It resolves server timestamps, supports updates to nested fields, and can simulate failed writes. It lets the tests exercise the real Firebase-mode code in `store.js` without a network, but it is **not** the real Firestore service.

---

## 24. Web, Android and iOS setup (Capacitor)

- **`next.config.mjs:9`, `output: 'export'`:** the build is plain static files in `out/`, with no server. `images: { unoptimized: true }` (14) is required for static export.
- **`app/layout.js:12`:** `viewport` with `viewportFit: 'cover'`, so the CSS can use `env(safe-area-inset-*)` to keep the header and nav clear of the notch and home indicator (`final-polish.css`, from 81).
- **`capacitor.config.ts:11–13`:** `appId: 'com.nuvora.dissertation'`, `appName: 'Nuvora'`, `webDir: 'out'`. Comment at 1–7.
- **Native plugins, used from the React code:**
  - `@capacitor/status-bar` and `@capacitor/keyboard` (`NuvoraApp.jsx:110–116`)
  - `@capacitor/browser` for external links (`components/ui/ExternalLink.jsx`)

  All of them do nothing on the web.
- **Scripts (`package.json`):**
  - `android:sync` / `ios:sync`: `next build` followed by `npx cap sync`
  - `android:open` / `ios:open`: open the native project
  - Building the iOS app itself needs macOS and Xcode.
- **Firebase runs through the web SDK** inside the app's WebView. There is no native Firebase SDK.
- **Docs:** `docs/ANDROID_BUILD.md`, `docs/IOS_BUILD.md`.
- **Verified:** the static build copies into both native projects (`npx cap copy`).
- **Not verified:** running on a physical Android phone or iPhone.

> **How I would explain this:** "I built the app once as a static web app and used Capacitor to wrap the same files as Android and iOS apps, so all three platforms run identical logic. Native-only details — status bar colour, keyboard behaviour on iOS, opening external links properly — are handled by small Capacitor plugins that do nothing on the web."

---

## 25. Architecture and data flow for the Implementation chapter

Nuvora is a client-side React application with three layers:

1. **Presentation:** the screen components in `components/screens/` and the accessible building blocks in `components/ui/`.
2. **Application state:** a single shell component, `components/NuvoraApp.jsx`, that owns sign-in state, the loaded data, settings and navigation.
3. **Domain and persistence:** plain JavaScript modules in `lib/`. They contain all the rules — scoring, deadline adjustment, recommendation, step templates, patterns — and one persistence module, `lib/store.js`.

**One persistence module, two back ends.** `lib/store.js` has an identical interface for two back ends: Cloud Firestore behind Firebase Authentication, and a local browser store. Which one is used is fixed when the app is built.

**The data flow is one-directional:**

```
            loadData(uid)                       setData(...) patch
Storage ───────────────▶ NuvoraApp state ─────────────▶ Screens (props)
   ▲                                                      │
   └──────────── store.js write (saveCheckin, setCurrentStep, …) ◀── user action
```

1. **Load:** on sign-in, the shell calls `loadData` once and holds the result.
2. **Save:** a user action calls a `store.js` write function first.
3. **Update state:** only if the write succeeds does the screen apply the same change to the shared state, using pure helpers (`withStep`, `withStepDone`, `withStepCounted`, `withStrategyCounted`) instead of relying on what the store returns.

This keeps every screen consistent without re-reading storage, and it means the interface never shows unsaved data as saved. The one exception is settings: they are applied optimistically and rolled back if the save fails.

**Calculations run on the device.** The workload-pressure result is computed on the device at check-in time: a validated self-report score (weighted sum, banded into thirds), plus a capped deadline adjustment, re-banded. The complete result is stored with the check-in, so past results aren't rewritten. The "Why this result?" text is generated by fixed rules from the same weights, so it always matches the calculation.

**Security is enforced server-side.** In Firebase mode, Firestore rules restrict every document to its owner, validate the shape of tasks and check-ins, and deny everything else by default.

**Deployment:** Next.js static export, wrapped by Capacitor for Android and iOS.

---

## 26. Claims → code → test table

| Report claim | Code location | Supporting evidence |
|---|---|---|
| The pressure score is a transparent weighted sum of five self-report factors | `lib/risk.js:62–113`; `lib/pressureConfig.js:13–19` | `lib/risk.test.js:6`, `:34–64`; `lib/pressureConfig.test.js` |
| Bands: 0–33 Low, 34–66 Moderate, 67–100 Higher | `lib/risk.js:26–48` | `lib/risk.test.js:19–31` |
| Invalid or unanswered input never produces a score | `lib/risk.js:15–21`; `Checkin.jsx:69–82` | `lib/risk.test.js:7`, `:66–81` |
| Deadlines add a capped adjustment; only the most severe level counts | `lib/pressure.js:30–69` | `lib/pressure.test.js:26–106` |
| The explanation uses the same weights as the score | `lib/explain.js:14–39`, `:80–173` | `lib/explain.test.js:12–90` |
| One deterministic next step: urgency → priority → date | `lib/recommendation.js:37–58` | `lib/recommendation.test.js` |
| High pressure shrinks the step but never hides a deadline | `lib/recommendation.js:52–58` | `lib/recommendation.test.js:67`, `:75` |
| Completing a micro-step never completes the assignment | `lib/store.js:415–427`, `:367–375` | `lib/store.test.js:81–113` |
| Micro-steps come from fixed templates per task type (not AI) | `lib/steps.js:1–114` | `lib/steps.test.js`; `NuvoraApp.ui.test.jsx:894` |
| Tasks group into Today/Week/Later automatically by date | `lib/dates.js:76–82` | `lib/dates.test.js:64–80` |
| The same storage interface for Firebase and demo mode | `lib/store.js:5–28`, `:329–559` | `lib/store.test.js` (demo); `NuvoraApp.firestore-journeys.test.jsx` (Firebase, fake SDK) |
| Firebase-mode updates show immediately, with no crash | `Tasks.jsx:96–111`; `Today.jsx:383–397`; `Overwhelmed.jsx:74–89` | `NuvoraApp.firestore-journeys.test.jsx:56–122` |
| Reflections persist, newest first, across reload and sign-in | `Reflection.jsx:33–82`; `lib/store.js:300–320`, `:448–460` | `NuvoraApp.reflection.test.jsx:113–186`; `NuvoraApp.journeys.test.jsx:165` |
| Corrupted local data doesn't crash the app | `lib/store.js:166–188`, `:200–294` | `lib/store.test.js:219–275` |
| Each user can only access their own data (Firebase) | `firestore.rules:10–13`, `:114–232` | `firestore.rules.test.js` (**static only**; emulator tests not run) |
| Sign-in errors don't reveal whether an account exists | `lib/authErrors.js:14–32`; `Auth.jsx:48–66` | `lib/authErrors.test.js:5–13`; `NuvoraApp.firebase.test.jsx:101–137` |
| Account deletion re-checks the password before deleting data | `Privacy.jsx:101–134` | `NuvoraApp.firebase.test.jsx:203`, `:217` |
| Deletion removes exactly the chosen category | `lib/store.js:515–551` | `lib/store.test.js:420–467` |
| Calm Mode reduces choices and hides pressure cues across screens | `NuvoraApp.jsx:44`, `:122–137`, `:263`; `Today.jsx:97–296`; `final-polish.css:154–214` | `NuvoraApp.ui.test.jsx:385–892`, `:1176–1224` |
| A failed save never shows "Your place is saved" | `NuvoraApp.jsx:231–252`; `Today.jsx:61–75` | `NuvoraApp.firestore-journeys.test.jsx:145` |
| The Calm sound starts only on a tap and can always be stopped | `NuvoraApp.jsx:141–154`, `:236`, `:283–294`; `lib/calmSound.js` | `NuvoraApp.calmSound.test.jsx`; `lib/calmSound.test.js` |
| Pattern insights appear only with enough data | `lib/patterns.js:23–82` | `lib/patterns.test.js`; `NuvoraApp.ui.test.jsx:911–940` |
| No streaks or targets; progress can be hidden | `Progress.jsx:13–76`; `defaultStats` in `lib/store.js:52` has no streak or date fields | **Code review only.** "Hide these details" (`Progress.jsx:26–32`, `:74`) has no dedicated automated test |
| Keyboard and screen-reader support on key interactions | `components/ui/*`; `radiogroup.js` | `NuvoraApp.a11y.test.jsx`; `NuvoraApp.ui.test.jsx:282–384` |
| The main screens pass automated axe checks | — | `NuvoraApp.a11y.test.jsx:40–88` |
| One static build serves web, Android and iOS | `next.config.mjs:9`; `capacitor.config.ts:11–13` | Build output and `npx cap copy` (not a device test) |

---

## 27. Genuine limitations and claims to avoid

### Implementation limitations

1. **Firestore rules have only been checked statically, not against a live emulator.** `firestore-rules.emulator-test.js` runs against a real local Firestore emulator, but it has never run successfully in any environment this was developed in — the Firebase CLI can download the emulator binary, but that download was blocked by network policy here. A prior blocker (`npm run test:rules` reporting "No test files found") is now fixed via a dedicated `vitest.rules.config.js` that explicitly includes the emulator test file, so the command will actually run it once the emulator can be reached.
2. **"Not sure" check-ins in Firebase mode — previously a genuine risk, now addressed but unverified.** They are saved with `risk: null` (`Checkin.jsx:73`). `validRisk` (`firestore.rules:73–92`) now has an explicit `data.risk == null` case covering this, fixing what was originally a real gap (only the field's *absence* was accepted). Demo mode was never affected. Because of limitation 1 above, this fix is reasoned-through but not confirmed by an actual emulator run.
3. **No testing on physical devices.** Mobile layouts were checked in desktop Chrome at phone sizes only. The safe-area spacing, keyboard behaviour, sound output (including the iPhone silent switch) and native link opening are unverified on real phones.
4. **Android hardware Back button.** It isn't handled, and screens don't create browser history, so Back may close the app instead of going to the previous screen.
5. **"Download my data" in the phone apps** uses a browser-style download, which may not work there.
6. **Offline behaviour.** Firebase-mode saves wait until the connection returns, and there is no persistent offline cache (a deliberate privacy choice). The "Saving…" state can last a long time.
7. **Model validity.** The weights, band thresholds and deadline points are design decisions, not validated against any measure.
8. **Explanations for older check-ins** that lack saved deadline data use the *current* tasks.
9. **Step progression.** "Generate next step" after a custom step restarts at the first template (`steps.js:108–114`). Step IDs restart when the app reloads.
10. **Loose Overwhelmed actions.** "I opened it" and "I tried for two minutes" mark the current step done whatever its wording, and they don't increase "small steps taken".
11. **Calm Mode's default "Hide time pressure"** replaces the concrete step text on the Calm Today view with a general instruction (`Today.jsx:55–59`).
12. **Settings text fields** silently ignore an edit made while another settings save is running.
13. **Demo mode** is one shared store per browser, not per user.
14. **Account deletion** is not atomic across Firebase Authentication and Firestore. "Delete all my data" recreates a settings-only user document.
15. **Missing dates on Progress.** A check-in without `createdAt` shows today's date there.
16. **Housekeeping:**
    - `components/NuvoraApp.journeys.test.jsx` still mocks and mentions `/api/risk`, which no longer exists
    - `package.json` says Node ≥ 18.18, but Next.js 16 needs ≥ 20.9
    - Learn receives `calmMode` but doesn't use it
    - `scripts/seedPlanningTasks.mjs` isn't used by anything
17. **The seed scripts** (`scripts/seedHistoricalData.mjs`, `scripts/seedProgressStats.mjs`) write synthetic data to **every** user in the configured Firebase project.
18. **No user evaluation** has been carried out. This is required by the ethics boundary until approval is confirmed.

### Claims to avoid

- **"AI-powered", "intelligent", "learns from you", "personalised recommendations".** Everything is fixed rules and templates.
- **"Diagnoses", "detects ADHD/autism", "measures stress", "clinically validated".** The score is a supportive self-report estimate.
- **"The calming sound calms ADHD" or "reduces anxiety".** Say only that some people find steady sound helps them settle.
- **"Users found…", "students reported…", "improves productivity".** There has been no user study.
- **"Fully WCAG compliant" or "fully accessible".** Automated axe checks and targeted tests are not a full conformance audit.
- **"Tested on Android and iOS devices".** Only built and copied into the native projects.
- **"Security rules verified" without qualification.** They were checked statically only.
- **"Works fully offline" or "real-time sync".** Neither is true.
- **"GDPR compliant" or "end-to-end encrypted".** Not assessed or not implemented; privacy-by-design choices can be described instead.
- **"Deletion is atomic" or "guaranteed".**

---

## 28. Glossary

| Term | Plain-English meaning |
|---|---|
| **Component** | A reusable piece of the user interface written as a JavaScript function (React). |
| **Props** | Values passed into a component by its parent, like arguments to a function. |
| **State** | Data a component remembers between renders, such as "which screen is open". |
| **Handler** | A function that runs when the user does something, such as tapping a button. |
| **Effect (`useEffect`)** | Code that runs after the screen updates, used for things like loading data or listening for events. |
| **Optimistic update** | Changing the screen before a save finishes, and undoing the change if the save fails. |
| **Deterministic** | The same input always gives the same output. There is no randomness or learning. |
| **Rule-based** | Behaviour decided by explicit, written rules rather than a trained model. |
| **Weighted sum** | Adding numbers after multiplying each by how much it should count. |
| **Band** | One of three ranges the score falls into: Low, Moderate, Higher. |
| **Micro-step** | The single small action attached to a task, such as "write only the title". |
| **Static export** | Building the app into plain HTML, CSS and JavaScript files that need no server. |
| **Firebase Authentication** | Google's sign-in service, used for email/password accounts. |
| **Cloud Firestore** | Google's cloud database, which stores documents inside collections. |
| **Security rules** | Server-side checks that decide who can read or write each Firestore document. |
| **Server timestamp** | A time set by Google's servers rather than the device's clock. |
| **`localStorage`** | Simple storage inside the browser, used for demo mode. It stays on that device only. |
| **Sanitise** | Check stored data and replace anything of the wrong type with a safe default. |
| **Migration** | Upgrading older saved data to a newer shape when it is read. |
| **Capacitor** | A tool that wraps a web app inside native Android and iOS apps. |
| **WebView** | The built-in browser inside a native app that displays the web code. |
| **Safe area** | The part of a phone screen not covered by the notch or home indicator. |
| **Web Audio API** | The browser's built-in way to generate sound in code. |
| **ARIA** | HTML attributes that tell screen readers what an element is and what state it's in (e.g. `role="alert"`, `aria-pressed`). |
| **WCAG** | The Web Content Accessibility Guidelines, the standard for accessible web content. |
| **axe-core** | An automated tool that scans a page for common accessibility problems. |
| **jsdom** | A simulated browser used by the tests. It has no real layout engine or audio. |
| **Vitest** | The test runner used to run the automated tests. |
| **Mock / stand-in** | A fake version of a service (such as Firestore) used in tests, so they run without the real thing. |
| **Regression test** | A test written for a bug that was fixed, so it can't quietly come back. |
| **Emulator** | A local copy of a Firebase service, for testing without the real cloud project. |
