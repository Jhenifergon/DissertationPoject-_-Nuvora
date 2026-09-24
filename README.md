# Nuvora

Nuvora is a privacy-first academic workload support app for neurodivergent university students. It helps a student who feels overloaded find **one small, manageable next step**, using a short daily check-in, a transparent rule-based workload-pressure estimate, and deadline-aware task planning. It avoids shame, streaks and punitive progress tracking.

Nuvora is **not a medical or diagnostic tool**. The workload-pressure band is a supportive estimate calculated by fixed, published rules from the student's own answers. It is not a clinical measure, and it does not detect or diagnose any condition. No part of the app uses AI or machine learning: all suggestions come from fixed rules and templates.

The same code runs as a web app and, through Capacitor, as Android and iOS apps.

---

## Quick start for markers (demo mode, no account needed)

Requires **Node.js 20.9 or newer** (Next.js 16's minimum) and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

If there is **no `.env.local` file**, Nuvora starts in **demo mode**:
- There is no sign-in.
- It comes pre-filled with synthetic sample tasks, check-ins and reflections, so every screen has something to show.
- Everything is stored only in this browser's `localStorage`. Nothing is sent anywhere.

To start the demo again from the sample data, clear this site's data in the browser. "Delete all my data" on the Privacy screen instead leaves an empty account.

The submitted project may include a `.env.local` holding the author's Firebase configuration. If it does, the app starts in **Firebase mode** and shows onboarding and sign-in instead. To use demo mode, rename or remove `.env.local`.

---

## Features

| Area | What it does |
|---|---|
| **Onboarding and sign-in** | Three short intro screens (Firebase mode only), then email/password sign-in, sign-up and password reset. Error messages don't reveal whether an account exists. |
| **Today** | The home screen: the latest pressure result, a way into Overwhelmed Mode, and **one** recommended next step with its current micro-step. You can mark the step done, edit it, pick an alternative, or generate the next step. |
| **Tasks** | Add, edit, complete (with Undo) and delete tasks, with module, due date, priority and task type. Tasks are grouped into Today / Week / Later automatically from their due dates. Each task has one current micro-step taken from fixed templates for its task type. |
| **Daily check-in** | Five questions, one per screen, each with a "Not sure / prefer not to answer" option. The result shows a Low / Moderate / Higher band and a "Why this result?" explanation. If any answer is "Not sure", no band is calculated; the check-in is saved as incomplete. |
| **Overwhelmed Mode** | The student names what is getting in the way (don't know where to start, task too big, low energy, need a reset, need help) and gets one matching smaller action. The options they've used most appear first. |
| **Learn** | Practical strategies for common study barriers, a focus timer, a "parking lot" for distracting thoughts, if–then planning, and optional external wellbeing links. |
| **Progress** | Neutral totals with no streaks or targets: check-ins so far, small steps taken, and strategies used. It also shows recent pressure results, pattern lines that appear only when there is enough data, and the weekly reflection. Can be hidden entirely. |
| **Weekly reflection** | Two optional free-text prompts. Past reflections are listed newest first; the five most recent show by default, with an option to see older ones. |
| **Support** | A support summary the student can copy and send to a tutor themselves. Nothing is sent automatically. Also links to settings and privacy, and gives urgent-help guidance. |
| **Calm Mode** | A temporary demand-reduction mode, switched on with the header button or in Settings. Details are in the Calm Mode section below. |
| **Settings** | Name for the greeting, Calm Mode, the Calm Mode background sound, reduced motion, three text sizes, and an optional support-person note. |
| **Privacy & data** | Plain-language explanations, JSON export, targeted deletion (check-ins and reflections, completed tasks, everything), and account deletion in Firebase mode. |

### Calm Mode

Calm Mode is for moments when the full app feels like too much. When it is on:
- **Today** collapses to one task, one step and two main buttons: "Open my plan" and "Stop for now". "Stop for now" saves a restart point so the student can pick up in the same place later.
- **The bottom navigation** shrinks to "My step" and "Support", so there are fewer choices on screen. Learn and Progress return when Calm Mode is switched off.
- **Every screen** gets a softer background and flatter cards.
- **Four temporary preferences** apply across the app until Calm Mode is next switched on, when they reset: hide deadlines, hide score numbers, reduce visual detail, and reduce motion.
- **A soft, continuous background sound** fades in when Calm Mode is switched on by a tap. It is a quiet, low, sustained chord with a slow "breathing" volume, generated in the browser with the Web Audio API.
  - It keeps playing across screens and fades out when Calm Mode is switched off.
  - A speaker button in the header stops or restarts it at any time without leaving Calm Mode (WCAG 1.4.2, Audio Control).
  - It never starts by itself when the app opens, and automatic start can be turned off in Settings.
  - It is offered because some people find a steady sound helps them settle. Nuvora makes no claim that it treats or calms ADHD.

### Accessibility

Accessibility work in the app includes:
- Keyboard-operable radio groups, dialogs and the menu, with focus managed when they open and close.
- Status and error messages announced to screen readers.
- Touch targets of at least 44 px on most controls.
- Adjustable text size and reduced motion.
- Layouts checked at 320 px wide with large text.
- An automated axe accessibility test suite (`components/NuvoraApp.a11y.test.jsx`).

---

## How it works

### Architecture

- **Next.js 16 / React 19**, exported as a **static site** (`output: 'export'` in `next.config.mjs`). There is no server code, so one `out/` folder serves the web version and is bundled into the Android and iOS apps.
- **One page with screen state:** `components/NuvoraApp.jsx` holds the current screen and the student's loaded data. Screens receive that data and update it as they save, so moving between screens never re-reads storage.
- **One data layer:** `lib/store.js` is the only code that reads or writes data, with two interchangeable back ends:
  - **Firebase mode** (Firebase config present at build time): Firebase Authentication plus Cloud Firestore. Data lives under `users/{uid}/tasks`, `/checkins` and `/reflections`; settings and stats are kept on the `users/{uid}` document. `firestore.rules` lets each signed-in user read and write only their own branch, and checks the shape of tasks and check-ins.
  - **Demo mode** (no Firebase config): one JSON object in `localStorage` under `nuvora-demo-data-v1`.
- **Mode is fixed at build time:** the choice depends on the `NEXT_PUBLIC_FIREBASE_*` variables, which are built into the JavaScript. The Android and iOS apps therefore use whichever mode they were built with.

### Workload-pressure model (`lib/risk.js`, `lib/pressureConfig.js`, `lib/pressure.js`)

**1. Self-report score.** Each answer is rescaled to 0–100, where higher always means more pressure. The workload question runs from calm to very overwhelming, so it is scaled directly. The other four questions run from difficult to easy, so they are inverted. The five factors are then weighted:

```
score = workload feeling × 30% + task-initiation difficulty × 25% + focus difficulty × 20%
      + low rest × 15% + low confidence × 10%
```

The weights are a design decision chosen to reflect the app's focus on overload and difficulty starting tasks. They are not clinically validated.

**2. Deadline adjustment.** Open tasks are counted into one tier each: overdue, due today or tomorrow, or due within 7 days. Only the single most severe rule applies, and the result is capped at 100.

| Condition | Points added |
|---|---|
| 2 or more overdue | +20 |
| 1 overdue, or 2 or more due within 48 hours | +12 |
| 1 due within 48 hours, or 3 or more due this week | +5 |
| Otherwise | 0 |

**3. Band.** 0–33 Low · 34–66 Moderate · 67–100 Higher.

The combined result is calculated on the device and saved with the check-in, so later task changes don't rewrite past results. "Why this result?" (`lib/explain.js`) shows each factor's contribution and any deadline adjustment, so every result can be traced back to the calculation.

### Next-step recommendation (`lib/recommendation.js`)

The recommended task is chosen deterministically. Open tasks are ranked by urgency (overdue → today → tomorrow → this week → later → no date), then by the student's priority, then by the earlier due date.

A **Higher** band never changes *which* task is chosen, and never hides a deadline. It only makes the suggested action smaller: "Just open the task".

---

## Privacy and data

- **Data is kept to a minimum:** no surname, student ID or institution is collected; a display name is optional.
- **Nothing is shared automatically:** the support summary and Overwhelmed Mode's help message are only ever copied to the student's own clipboard.
- **Signed-in data lives in the student's own account:** Firestore rules restrict every read and write to the signed-in owner.
- **Signed-in web sessions leave little on the device:** Firestore's default in-memory cache is used, with no persistent offline cache, to reduce data left behind on shared computers. The only thing Nuvora itself stores in the browser in this mode is an "onboarding seen" flag. Firebase Authentication also keeps the sign-in session in the browser, as any login does, until the student signs out.
- **Students control their data:** they can export everything as JSON, delete check-ins and reflections, delete completed tasks, delete everything, or, in Firebase mode, delete their account. Account deletion re-checks the password before anything is removed. Because Firebase Authentication and Firestore are separate services, it is not a single atomic operation.

---

## Firebase setup (optional)

1. Create a Firebase project. Enable **Email/Password Authentication** and **Cloud Firestore**.
2. Copy `.env.example` to `.env.local` and fill in the web app configuration values.
3. Deploy the security rules: `firebase deploy --only firestore:rules`.

The Firebase web configuration is not a secret; access to data is controlled by Authentication and the rules. `serviceAccountKey.json` (admin credentials used only by the seed scripts) and `.env.local` are both in `.gitignore` and must never be committed or shared.

### Synthetic data scripts (`scripts/`)

- **`seedHistoricalData.mjs`:** writes synthetic historical tasks, check-ins and reflections for demonstrations.
- **`seedProgressStats.mjs`:** writes synthetic Progress statistics.
- **`seedPlanningTasks.mjs`:** contains a list of sample tasks but is not currently used by any script.

⚠️ The first two scripts use the Admin SDK and write to **every user** in the configured Firebase project. Only run them against a project that contains test accounts. The seeded reflections use a `text` field rather than the app's own prompts; the Reflection screen displays both formats.

---

## Android and iOS

Capacitor 8 wraps the same static build in native shells: app ID `com.nuvora.dissertation`, `webDir: 'out'`.

```bash
npm run android:sync   # build + copy into android/, then:
npm run android:open   # open in Android Studio

npm run ios:sync       # build + copy into ios/ (building the app itself needs macOS and Xcode)
npm run ios:open
```

- **Native behaviour through plugins:** status bar style, iOS keyboard resizing, and opening external links in the system browser. These do nothing on the web.
- **Screen edges:** the layout reserves room for the notch, home indicator and edge-to-edge system bars (`viewport-fit=cover` with safe-area padding).
- **Full build instructions:** see [`docs/ANDROID_BUILD.md`](docs/ANDROID_BUILD.md) and [`docs/IOS_BUILD.md`](docs/IOS_BUILD.md).

These are private test builds for the dissertation, not store releases.

---

## Testing

```bash
npm test           # Vitest + Testing Library (jsdom)
npm run build      # production static export into out/
```

At the time of submission: **25 test files, 316 tests, all passing**, and the production build succeeds. The suite covers:
- the scoring model, deadline adjustment, explanations, recommendations, patterns, date handling and step templates
- the storage layer in demo mode, including recovery from corrupted data
- Firebase-mode journeys, run through the real `lib/store.js` against an in-memory stand-in for Firestore (`test/fakeFirestore.js`)
- end-to-end user journeys, including saving, reloading and deleting data
- Calm Mode, accessibility (axe), colour contrast, and a static check of `firestore.rules`

`firestore-rules.emulator-test.js` tests the security rules against the Firebase emulator, but has not yet been run successfully. `npm run test:rules` currently reports "No test files found", because Vitest's default file pattern does not match `*.emulator-test.js`.

---

## Project structure

```
app/                  Next.js entry (layout, page) and stylesheets (app/styles/)
components/
  NuvoraApp.jsx       App shell: sign-in state, data loading, screen navigation, Calm Mode
  screens/            One component per screen (Today, Tasks, Checkin, Learn, …)
  ui/                 Shared, accessible building blocks (sheet, drawer, timer, …)
lib/                  Logic with no UI: scoring, recommendations, storage, dates, steps
test/                 Test helpers (in-memory Firestore stand-in)
docs/                 Project walkthrough and Android/iOS build guides
scripts/              Synthetic-data seed scripts (Admin SDK; see warning above)
firestore.rules       Firestore security rules
android/, ios/        Generated Capacitor native projects
```

For a detailed walkthrough of the code, see [`docs/PROJECT_EXPLAINED.md`](docs/PROJECT_EXPLAINED.md). The key source files also have explanatory comments.

---

## Known limitations

- **Not tested on real phones:** mobile layouts were checked in a desktop browser at phone sizes (320–390 px), not on physical devices. The keyboard behaviour and safe-area spacing still need checking on a real Android phone and iPhone.
- **"Not sure" check-ins in Firebase mode:** these are saved with `risk: null`, which the current `validRisk` rule in `firestore.rules` does not appear to allow. When signed in, they may be refused. This has not been confirmed against the emulator. Demo mode is unaffected.
- **Android Back button:** there is no handler for the hardware Back button, and screens don't create browser history, so Back may close the app instead of returning to the previous screen.
- **Export in the phone apps:** "Download my data" uses a browser download, which may not work inside the Android and iOS apps.
- **Offline saving:** in Firebase mode, a save made while offline waits until the connection returns. After a full reload while offline, unsaved changes are not guaranteed to survive.
- **Explanations for older check-ins:** check-ins saved before deadline data was stored with each result explain their deadline lines using the current task list.

---

## Evidence and ethics boundary

The software has been developed and tested with **synthetic and demo data only**. No participant data is collected. Usability interviews or surveys must not be carried out until formal ethics approval is confirmed. If a survey is later approved, it will use the university-required Jisc route.
