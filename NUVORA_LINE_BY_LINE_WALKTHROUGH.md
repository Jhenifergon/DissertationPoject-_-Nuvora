# Nuvora — Line-by-Line Code Walkthrough

*How the app is built and what each part of the code does. For the Implementation chapter of the dissertation.*

---

## How to read this document

This document goes through the Nuvora source code **in the order the app runs**, from the moment the page loads to the moment data is saved in the database. For each file it:

1. says **what the file is for** and why it exists as a separate file;
2. quotes the code in **short numbered blocks** (the numbers are the real line numbers in the file, so `store.js:333–356` can be cited directly);
3. explains **what each line or small group of lines does** and **why it was written that way**.

The logic files (`lib/`, the app shell, and the security rules) are explained truly line by line, because this is where the design decisions live. The screen files contain a lot of layout markup (JSX), so for those the markup is explained **block by block**, and every function and decision inside them is still explained line by line.

**Important facts that apply everywhere:**

- **No AI or machine learning.** Every score, suggestion and sentence the app shows comes from fixed, deterministic rules written in the code. The same input always gives the same output.
- **Not diagnostic.** The "workload pressure" result is a supportive estimate from the student's own answers. It does not detect or measure any condition.
- **Two storage modes.** *Firebase mode* stores data in Google Cloud Firestore behind a login. *Demo mode* stores data in the browser's `localStorage` with sample data and no login. The same screens work in both, because all storage goes through one file (`lib/store.js`).
- Line numbers match the code **after the fixes made on 29 September 2026** (Section 34.1). Every numbered code line in this document was checked automatically against the source files. If the code changes later, the function names will still find the right place.

---

## Contents

**Part A — Foundations**
1. Technology stack (`package.json`)
2. Architecture at a glance
3. Build and project configuration
4. Entry point (`app/layout.js`, `app/page.js`)

**Part B — The app shell**
5. `components/NuvoraApp.jsx` — state, loading, navigation, settings, Calm Mode

**Part C — Data and security**
6. `lib/firebase.js` — connecting to Firebase
7. `lib/store.js` — the single data layer
8. `firestore.rules` — server-side security

**Part D — The rule-based logic**
9. `lib/pressureConfig.js` and `lib/risk.js` — the pressure score
10. `lib/pressure.js` — the deadline adjustment
11. `lib/explain.js` — "Why this result?"
12. `lib/dates.js` — date rules
13. `lib/recommendation.js` — choosing the one next step
14. `lib/steps.js` — micro-step templates
15. `lib/patterns.js` — trends across check-ins
16. Small helpers: `modules.js`, `greeting.js`, `timer.js`, `authErrors.js`
17. `lib/calmSound.js` — the Calm Mode sound

**Part E — Screens**
18. Splash, LoadError, Onboarding
19. Auth (log in, sign up, reset password)
20. Today (including Calm Mode views)
21. Tasks
22. Check-in
23. Overwhelmed Mode
24. Learn
25. Progress and Weekly Reflection
26. Support
27. Settings
28. Privacy & data

**Part F — Shared UI, styling, testing, mobile**
29. Shared UI components (`components/ui/`)
30. Styling and the design system (`app/styles/`)
31. Automated testing
32. Android and iOS (Capacitor)

**Part G — Putting it together**
33. End-to-end traces (what happens when…)
34. Limitations, and problems fixed during the code review

---

# Part A — Foundations

## 1. Technology stack — `package.json`

`package.json` lists the libraries the app depends on and the commands used to run, test and build it.

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "npx serve@latest out",
  "lint": "eslint .",
  "test": "vitest run",
  "test:coverage": "vitest run --coverage",
  "test:rules": "firebase emulators:exec --only firestore \"vitest run --config vitest.rules.config.js\"",
  "android:sync": "next build && npx cap sync android",
  "android:open": "npx cap open android",
  "ios:sync": "next build && npx cap sync ios",
  "ios:open": "npx cap open ios"
}
```

| Script | What it does |
|---|---|
| `dev` | Starts the Next.js development server with hot reload, for building the app. |
| `build` | Builds the production version. Because of `output: 'export'` (Section 3), this produces a folder of plain static files called `out/`. |
| `start` | Serves the `out/` folder, the same way a web host would. |
| `lint` | Runs ESLint to find code-quality problems. |
| `test` | Runs every unit and component test once with Vitest. |
| `test:coverage` | Same, and also measures which lines the tests reach. |
| `test:rules` | Starts a local Firestore **emulator** and runs the security-rule tests against the real `firestore.rules` file. |
| `android:sync` / `ios:sync` | Builds the web app, then copies it into the native Android / iOS project with Capacitor. |
| `android:open` / `ios:open` | Opens the native project in Android Studio / Xcode. |

**Main dependencies and why each one is used:**

| Library | Role in Nuvora |
|---|---|
| `next` (16) | The React framework. Used here mainly for its build system and static export. |
| `react`, `react-dom` (19) | Builds the user interface out of components and state. |
| `firebase` (11) | Firebase Authentication (accounts) and Cloud Firestore (database). |
| `zod` | Checks that the check-in answers are valid before the score is calculated (Section 9). |
| `lucide-react` | The line icons (Home, Leaf, Heart, etc.). |
| `@fontsource/nunito` | The Nunito font, bundled with the app so it works offline and inside the phone apps. |
| `@capacitor/*` | Wraps the web app as native Android and iOS apps, and gives access to the status bar, keyboard and system browser. |

**Development-only dependencies:** `vitest` (test runner), `@testing-library/react` and `jest-dom` (render components and check what the user would see), `jsdom` (a simulated browser for tests), `axe-core` (automated accessibility checks), `@firebase/rules-unit-testing` (tests security rules against the emulator), `eslint` (code quality), `@capacitor/cli` (the Capacitor command-line tool).

`firebase-admin` is used only by the scripts in `scripts/`, which fill a test account with sample history for demonstrations. It is not part of the app the student runs.

---

## 2. Architecture at a glance

Nuvora is a **single-page React application** built with Next.js and exported as static files. The same files run in three places: a web browser, an Android app, and an iOS app.

```
┌────────────────────────────────────────────────────────────────────┐
│ app/page.js  →  components/NuvoraApp.jsx  (the app shell)          │
│   • holds all shared state (user, data, settings, current screen)  │
│   • decides which screen to show                                   │
│   • passes data + setData down to each screen                      │
├────────────────────────────────────────────────────────────────────┤
│ components/screens/*.jsx   (Today, Tasks, Check-in, …)             │
│   • show the UI and react to taps                                  │
│   • call lib/ logic to compute things                              │
│   • call lib/store.js to save things                               │
├──────────────────────────────┬─────────────────────────────────────┤
│ lib/ rule-based logic        │ lib/store.js (the only data layer)  │
│ risk, pressure, explain,     │   ├─ Firebase mode → Firestore      │
│ recommendation, steps, dates,│   └─ Demo mode → localStorage       │
│ patterns … (pure functions)  │                                     │
└──────────────────────────────┴───────────────┬─────────────────────┘
                                               │
                              firestore.rules (server-side security)
```

Three design principles explain most of the code:

1. **Separation of concerns.** Screens do not do maths and do not talk to the database directly. Maths lives in small *pure functions* in `lib/` (the same input always gives the same output, with no side effects), which makes it easy to test. All saving and loading goes through `lib/store.js`.
2. **One shared copy of the data.** `NuvoraApp.jsx` loads everything once and keeps it in React state. Screens update that copy after each successful save, so every screen always shows the same, current data without reloading from the database.
3. **Save first, then show success.** Every screen waits for the save to finish before it tells the student something was saved. If the save fails, the student sees a calm error message and nothing pretends to have worked.

---

## 3. Build and project configuration

### 3.1 `next.config.mjs`

```js
 1  /** @type {import('next').NextConfig} */
 2  const nextConfig = {
 ...
 9    output: 'export',
 ...
14    images: { unoptimized: true },
15  };
17  export default nextConfig;
```

- **Line 1** is a type hint so the code editor can autocomplete the Next.js options.
- **Line 9 — `output: 'export'`** is the most important build decision. It tells Next.js to produce **plain static files** (HTML, JavaScript, CSS) instead of an app that needs a Node.js server. This is required because the Android and iOS apps are just those files packaged inside a phone app, and there is no server on a phone. It also means **the pressure score has to be calculated on the device** (Section 22).
- **Line 14** turns off Next.js image optimisation, which needs a server and would otherwise break the static export.

### 3.2 `jsconfig.json`

```json
{"compilerOptions":{"paths":{"@/*":["./*"]}}}
```

This creates the `@/` shortcut. `import { loadData } from '@/lib/store'` means "from the project root, open `lib/store`". It avoids long relative paths such as `../../lib/store`.

### 3.3 `.env.example`

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

A template for the Firebase connection settings. The real values go in a `.env.local` file, which is not committed to git. The `NEXT_PUBLIC_` prefix tells Next.js to **copy these values into the JavaScript at build time**. As Section 6 explains, **whether these values are present decides whether the app runs in Firebase mode or demo mode.**

### 3.4 `firebase.json`

```json
{ "firestore": { "rules": "firestore.rules" },
  "emulators": { "firestore": { "port": 8080 } } }
```

Tells the Firebase command-line tool where the security rules are (so `firebase deploy` uploads them) and which port the local test emulator uses.

### 3.5 `capacitor.config.ts`

```ts
10  const config: CapacitorConfig = {
11    appId: 'com.nuvora.dissertation',
12    appName: 'Nuvora',
13    webDir: 'out'
14  };
```

- **Line 11** is the unique app identifier used by the Android and iOS stores.
- **Line 12** is the name shown under the app icon.
- **Line 13** points Capacitor at the `out/` folder produced by `next build`, so **the phone apps run exactly the same code as the website**.

### 3.6 Test configuration — `vitest.config.js`, `vitest.setup.js`, `vitest.rules.config.js`

```js
 5  export default defineConfig({
 6    plugins: [react()],
 7    resolve: {
10      alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
11    },
12    test: {
13      environment: 'jsdom',
14      setupFiles: ['./vitest.setup.js'],
15      coverage: { provider: 'v8', reporter: ['text', 'html'],
22        include: ['lib/**', 'components/**', 'app/**'],
23        exclude: ['**/*.test.{js,jsx}', '**/*.emulator-test.js', 'lib/firebase.js'],
```

- **Line 6** lets Vitest understand JSX (the HTML-like syntax in React files).
- **Line 10** recreates the `@/` shortcut for tests, because Vitest does not read `jsconfig.json`.
- **Line 13 — `jsdom`** gives tests a simulated browser (a `document`, buttons, `localStorage`), so components can be rendered and clicked without a real browser.
- **Line 14** runs `vitest.setup.js` before every test file. That file adds extra checks such as `toBeInTheDocument()` and replaces the canvas function that jsdom does not support (axe-core calls it).
- **Lines 22–23** say which files count towards test coverage. Test files, the emulator suite and the Firebase connection file are excluded.

`vitest.rules.config.js` is a second, separate configuration used only by `npm run test:rules`. It runs in a plain Node environment and includes only `firestore-rules.emulator-test.js`, which needs a running Firestore emulator. That file's name deliberately does not end in `.test.js`, so a normal `npm test` skips it.

---

## 4. Entry point — `app/layout.js` and `app/page.js`

### 4.1 `app/layout.js`

```js
 1  import './globals.css';
 2  import '@fontsource/nunito/400.css';
 3  import '@fontsource/nunito/600.css';
 4  import '@fontsource/nunito/700.css';
 5  import '@fontsource/nunito/800.css';
 7  export const metadata = { title: 'Nuvora', description: 'A calm academic workload companion' };
12  export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
14  export default function RootLayout({ children }) {
21    return <html lang="en"><body suppressHydrationWarning>{children}</body></html>;
22  }
```

In Next.js, `layout.js` is the outer frame that wraps every page.

- **Line 1** loads the whole stylesheet once, for the whole app.
- **Lines 2–5** load the Nunito font in four weights (regular to extra-bold). Nunito was chosen for its rounded, friendly letter shapes.
- **Line 7** sets the browser tab title and the description search engines show.
- **Line 12** sets the mobile viewport. `width: 'device-width'` makes the page as wide as the phone screen. `viewportFit: 'cover'` lets the layout reach under the iPhone notch; the CSS then uses `env(safe-area-inset-*)` to keep the header and bottom navigation clear of it.
- **Line 21** outputs the `<html>` and `<body>` tags. `lang="en"` tells screen readers to pronounce the text as English (an accessibility requirement). `suppressHydrationWarning` silences a harmless warning caused by browser extensions such as Grammarly adding attributes to `<body>`; it applies only to that one element.

### 4.2 `app/page.js`

```js
1  import NuvoraApp from '@/components/NuvoraApp';
2  export default function Page() { return <NuvoraApp />; }
```

The only page in the app. It renders `NuvoraApp`, and everything else happens inside that one component. Nuvora has no URL routes: moving between screens changes a piece of state, not the web address (Section 5.8 explains why).

---

# Part B — The app shell

## 5. `components/NuvoraApp.jsx`

This is the **root component** of the app. It:

- tracks who is signed in;
- loads the student's data once and keeps the shared copy;
- keeps the settings and saves changes to them;
- runs Calm Mode's session state and background sound;
- decides which screen to show and draws the header, menu and bottom navigation around it.

### 5.1 Imports (lines 1–28)

```js
 1  'use client';
 2  import { useEffect, useRef, useState } from 'react';
 3  import { BookOpen, Heart, Home, Leaf, ListTodo, LogOut, Menu, Settings, Shield, TrendingUp, Volume2, VolumeX } from 'lucide-react';
 4  import { onAuthStateChanged, signOut } from 'firebase/auth';
 5  import { Capacitor } from '@capacitor/core';
 6  import { StatusBar, Style } from '@capacitor/status-bar';
 7  import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
 8  import { auth, firebaseEnabled } from '@/lib/firebase';
 9  import { defaultSettings, loadData, saveSettings } from '@/lib/store';
10  import { startCalmSound, stopCalmSound } from '@/lib/calmSound';
11  import { CALM_SESSION_DEFAULTS, GENERIC_ERROR } from '@/components/constants';
12–28     … Drawer, Logo, StatusMessage and every screen component
```

- **Line 1 — `'use client'`** tells Next.js this component runs in the browser. It needs browser features (state, `localStorage`, click handlers), so it cannot be pre-rendered on a server only.
- **Line 2** imports three React *hooks*: `useState` (remembers a value between renders and redraws the screen when it changes), `useEffect` (runs code after the screen is drawn, such as loading data or adding event listeners), and `useRef` (holds a value or a reference to an HTML element without causing a redraw).
- **Line 3** imports the icons used in the header, menu and navigation bar.
- **Line 4** imports the Firebase functions that report sign-in changes and sign the user out.
- **Lines 5–7** import Capacitor plugins that only do something inside the phone apps.
- **Line 8** imports the Firebase connection and the `firebaseEnabled` flag that decides the storage mode.
- **Line 9** imports the default settings and the two storage functions this file needs.
- **Line 10** imports the Calm Mode sound controls.
- **Line 11** imports shared constants (Section 5.2).
- **Lines 12–28** import the shared UI pieces and all fourteen screens.

`components/constants.js`, imported on line 11, holds two values used in several files:

```js
export const CALM_SESSION_DEFAULTS = {
  hideDeadlines: true, hideProgressNumbers: true, reduceVisualDetail: true, reduceMotion: true,
};
export const GENERIC_ERROR = 'That did not save. Please try again in a moment.';
```

`CALM_SESSION_DEFAULTS` holds the four temporary Calm Mode preferences, all switched on by default, so Calm Mode starts with the lowest possible demand. `GENERIC_ERROR` is the one calm error message used whenever a save fails, so the wording is the same everywhere.

### 5.2 Navigation definitions (lines 30–49)

```js
43  const nav = [['today', Home, 'Today'], ['tasks', ListTodo, 'Tasks'], ['learn', BookOpen, 'Learn'], ['progress', TrendingUp, 'Progress'], ['support', Heart, 'Support']];
44  const calmNav = [['today', Home, 'My step'], ['support', Heart, 'Support']];
48  const MENU_SCREENS = ['settings', 'privacy'];
49  const SCREEN_NAMES = { today: 'Today', tasks: 'Tasks', … overwhelmed: 'Overwhelmed Mode' };
```

- **Line 43** defines the normal bottom navigation bar as a list of `[screen id, icon, label]`. Keeping it as data means the bar is drawn with one loop (line 318) instead of five copies of the same button code.
- **Line 44** is the **Calm Mode navigation bar**: only two items, and "Today" is renamed "My step". Fewer choices on screen means less to decide, which is the purpose of Calm Mode.
- **Line 48** lists the screens opened from the side menu. The app remembers which screen the student came from, so these screens can offer a "back" button.
- **Line 49** gives each screen a readable name, so the back button can say "← Tasks" instead of just "Back".

The comment on lines 30–39 records the design decision: navigation is **one piece of state, not URL routes**. Reasons: it keeps the static export simple for Capacitor; unfinished work (such as a half-completed check-in) survives moving between screens; and every screen stays inside the same "phone" frame. The cost is that screens cannot be bookmarked and the browser's Back button does not move between screens, so every screen that hides the bottom bar has its own back button.

### 5.3 State (lines 51–82)

```js
51  export default function NuvoraApp() {
56    const [user, setUser] = useState(firebaseEnabled ? undefined : { uid: 'demo', email: 'demo@nuvora.local' });
57    const [screen, setScreen] = useState('today');
58    const [returnTo, setReturnTo] = useState('today');
59    const [data, setData] = useState(null);
60    const [menu, setMenu] = useState(false);
61    const menuButtonRef = useRef(null);
62    const [settings, setSettings] = useState(defaultSettings);
63    const [settingsBusy, setSettingsBusy] = useState(false);
64    const [settingsError, setSettingsError] = useState('');
74    const [calmSession, setCalmSession] = useState(CALM_SESSION_DEFAULTS);
75    const [pausedThisSession, setPausedThisSession] = useState(false);
76    const [restartAcknowledged, setRestartAcknowledged] = useState(false);
77    const [showCalmExit, setShowCalmExit] = useState(false);
81    const [checkinDraft, setCheckinDraft] = useState({ step: 0, answers: {} });
82    const previousCalmModeRef = useRef(settings.calmMode);
```

Each `useState` call creates one remembered value and a function to change it. Changing it redraws the screen.

- **Line 56 — `user`** can be in **three states**:
  - `undefined`: Firebase is still checking whether someone is signed in → show the splash screen.
  - `null`: nobody is signed in → show onboarding or the login screen.
  - an object: a signed-in user.

  In **demo mode**, `user` starts as a fixed fake user (`uid: 'demo'`), so the app opens straight away with no login.
- **Line 57 — `screen`** is the id of the screen currently showing. This one value *is* the navigation system.
- **Line 58 — `returnTo`** remembers where to go back to from Settings or Privacy.
- **Line 59 — `data`** holds **all** the student's data: `{ tasks, checkins, reflections, settings, stats }`. It is `null` until loading finishes.
- **Line 60 — `menu`** says whether the side drawer is open.
- **Line 61 — `menuButtonRef`** points to the menu button, so keyboard focus can return to it when the drawer closes (an accessibility requirement).
- **Lines 62–64** hold the settings, whether a settings save is in progress (used to disable buttons and prevent double saves), and any settings error message.
- **Lines 74–77 — Calm Mode session state.** These values are **not saved to the database**. They reset each time Calm Mode is switched on:
  - `calmSession`: the four temporary preferences (hide deadlines, hide numbers, less detail, less motion).
  - `pausedThisSession`: the student pressed "Stop for now".
  - `restartAcknowledged`: the student has already seen the "welcome back" screen.
  - `showCalmExit`: the "How would you like to come back?" screen is open.
- **Line 81 — `checkinDraft`** stores the check-in answers **here, not inside the Check-in screen**. When the student leaves the check-in half-way, the Check-in screen is removed, but this state stays, so their answers are still there when they come back.
- **Line 82 — `previousCalmModeRef`** remembers what Calm Mode was **before** the latest change, so the code can tell "Calm Mode was just switched on" apart from "Calm Mode was already on". It is a ref, not state, because changing it should not redraw the screen.

### 5.4 Side effects — offline notice, native setup, Calm Mode, sign-in, sound (lines 84–154)

**Offline notice (lines 90–101):**

```js
 90  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' || navigator.onLine !== false);
 91  useEffect(() => {
 92    if (typeof window === 'undefined') return undefined;
 93    const goOnline = () => setIsOnline(true);
 94    const goOffline = () => setIsOnline(false);
 95    window.addEventListener('online', goOnline);
 96    window.addEventListener('offline', goOffline);
 97    return () => {
 98      window.removeEventListener('online', goOnline);
 99      window.removeEventListener('offline', goOffline);
100    };
101  }, []);
```

- **Line 90** starts with the browser's own online status. The `typeof navigator === 'undefined'` check stops a crash during the build step, where there is no browser.
- **Lines 93–96** listen for the browser's `online` and `offline` events and update the state.
- **Lines 97–100** are the *cleanup function*: React runs it when the component is removed, so the listeners do not leak.
- The empty list `[]` at the end means "run this once, when the component first appears".
- Line 298 uses `isOnline` to show a quiet notice. The comment (lines 84–89) explains a **privacy decision**: Nuvora does **not** turn on Firestore's permanent offline storage, so check-in data is less likely to be left on a shared computer. The cost is that data saved while offline is only kept while the page stays open.

**Native phone setup (lines 110–116):**

```js
110  useEffect(() => {
111    if (!Capacitor.isNativePlatform()) return;
112    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
113    if (Capacitor.getPlatform() === 'ios') {
114      Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {});
115    }
116  }, []);
```

- **Line 111** stops straight away on the web; only the phone apps continue.
- **Line 112** makes the phone's status-bar icons (clock, battery) **dark**, so they can be seen against Nuvora's light cream background. `.catch(() => {})` ignores any failure, because this is cosmetic and must never crash the app.
- **Lines 113–114** on iOS only: make the app shrink when the on-screen keyboard opens, so text boxes near the bottom are not hidden behind it.

**Calm Mode "just switched on" (lines 122–137):**

```js
122  useEffect(() => {
123    const justEnabled = settings.calmMode && !previousCalmModeRef.current;
124    previousCalmModeRef.current = settings.calmMode;
126    if (justEnabled) {
127      setCalmSession(CALM_SESSION_DEFAULTS);
128      setPausedThisSession(false);
129      setRestartAcknowledged(false);
130      setShowCalmExit(false);
132      if (['tasks', 'learn', 'progress'].includes(screen)) {
133        setScreen('today');
134        setMenu(false);
135      }
136    }
137  }, [settings.calmMode, screen]);
```

- **Line 123** — Calm Mode was *just* switched on if it is on now and was off before.
- **Line 124** stores the current value for the next comparison.
- **Lines 127–130** reset all the temporary Calm session values, so every Calm session starts fresh with the lowest-demand defaults.
- **Lines 132–135** — if the student was on a screen full of choices (Tasks, Learn, Progress), take them **once** to the single-step Today view. Because this only happens at the moment of switching on, the student can still open their plan afterwards without being sent back.
- **Line 137** — the effect runs again whenever Calm Mode or the screen changes.

**Sign-in listener (line 139):**

```js
139  useEffect(() => (firebaseEnabled ? onAuthStateChanged(auth, setUser) : undefined), []);
```

In Firebase mode, this subscribes to Firebase's sign-in state. Firebase calls `setUser` with the user object after login, with `null` after logout, and once at start-up after it has checked any saved session. `onAuthStateChanged` returns an "unsubscribe" function; because the arrow function returns it, React uses it as the cleanup. In demo mode nothing is subscribed.

**Calm sound stopping rules (lines 147–154):**

```js
147  const [calmSoundOn, setCalmSoundOn] = useState(false);
148  useEffect(() => {
149    if (!user || !settings.calmMode || settings.calmTone === false) {
150      stopCalmSound();
151      setCalmSoundOn(false);
152    }
153  }, [user, settings.calmMode, settings.calmTone]);
154  useEffect(() => () => stopCalmSound(), []);
```

- **Line 147** tracks whether the sound is playing, so the header button can show the right icon.
- **Lines 148–153** stop the sound whenever the student signs out, Calm Mode is off (including after a failed save is rolled back), or the sound setting is switched off.
- **Line 154** stops the sound when the whole app closes.
- **Starting** the sound is deliberately **not** done here. Phones only allow sound to start as the direct result of a tap, so starting happens inside the tap handlers (line 236 and lines 288–291). Stopping has no such restriction, so it can follow the state.

### 5.5 Loading the student's data (lines 163–195)

```js
163  const [loadStatus, setLoadStatus] = useState('idle'); // idle | loading | success | error
164  const [retryTick, setRetryTick] = useState(0);
166  useEffect(() => {
171    if (!user) {
172      setData(null);
173      return undefined;
174    }
175    let cancelled = false;
176    setLoadStatus('loading');
177    loadData(user.uid)
178      .then(d => {
179        if (cancelled) return;
180        setData(d);
186        previousCalmModeRef.current = d.settings.calmMode;
188        setSettings(d.settings);
189        setLoadStatus('success');
190      })
191      .catch(() => {
192        if (!cancelled) setLoadStatus('error');
193      });
194    return () => { cancelled = true; };
195  }, [user, retryTick]);
```

- **Line 163** — loading has four states. `error` is an explicit state, so a failed load shows a retry screen instead of leaving the student on the splash screen for ever (the comment on lines 156–162 records that this was a real bug that was fixed).
- **Line 164 — `retryTick`** is a counter. Adding 1 to it (line 214) makes this effect run again, which is how "Try again" works.
- **Lines 171–174** — when the student signs out, the previous account's data is **removed from memory**. On a shared computer, the next person to sign in waits for their own data and never briefly sees someone else's tasks.
- **Line 175 — `cancelled`** protects against a *race condition*: if the user changes while loading is still happening (for example, a quick sign-out), the old result is thrown away when it arrives (lines 179 and 192).
- **Line 177** calls `loadData` from the store (Section 7.8), which reads all the data in one go.
- **Line 180** puts the data into the shared state.
- **Line 186** sets the "previous Calm Mode" ref to the stored value **before** the settings are applied. Without this, the effect in 5.4 would think Calm Mode had "just been switched on" every time a student who left it on opened the app.
- **Line 188** applies the stored settings.
- **Line 194** is the cleanup that sets `cancelled`.
- **Line 195** — this runs when the user changes or when "Try again" is pressed.

### 5.6 Onboarding flag (lines 199–200)

```js
199  const ONBOARDING_KEY = 'nuvora-onboarding-seen';
200  const [onboardingDone, setOnboardingDone] = useState(() => typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_KEY) === '1');
```

The three welcome screens are shown once per browser or phone. Only a "seen" flag is stored on the device, **no personal data**. The function passed to `useState` runs only on the first render, so `localStorage` is not read again on every redraw.

### 5.7 Choosing what to show (lines 205–218)

```js
205  if (user === undefined) return <Splash />;
206  if (!user) {
207    if (firebaseEnabled && !onboardingDone) {
208      return <Onboarding onDone={() => { localStorage.setItem(ONBOARDING_KEY, '1'); setOnboardingDone(true); }} />;
209    }
210    return <Auth />;
211  }
212  if (loadStatus === 'error') {
213    return <LoadError
214      onRetry={() => setRetryTick(t => t + 1)}
215      onSignOut={() => (firebaseEnabled ? signOut(auth) : location.reload())}
216    />;
217  }
218  if (!data) return <Splash />;
```

This is a **sequence of guards**. The first one that matches decides what is shown:

1. **Line 205** — still checking the sign-in → splash screen.
2. **Lines 206–211** — signed out → onboarding the first time (Firebase mode only), otherwise the login screen. When onboarding finishes, the flag is saved (line 208).
3. **Lines 212–217** — loading failed → the calm error screen with "Try again" (adds 1 to `retryTick`) and "Sign out" (in demo mode this reloads the page).
4. **Line 218** — data still loading → splash screen.
5. Otherwise, the full app below.

### 5.8 Navigation helpers (lines 220–226)

```js
220  const go = s => {
221    if (MENU_SCREENS.includes(s) && !MENU_SCREENS.includes(screen)) setReturnTo(screen);
222    setScreen(s);
223    setMenu(false);
224  };
225  const back = { label: SCREEN_NAMES[returnTo] || 'Today', go: () => go(returnTo) };
226  const visibleNav = settings.calmMode ? calmNav : nav;
```

- **Lines 220–224 — `go(s)`** is how every screen navigates. It is passed down to the screens as a prop.
  - **Line 221** — when opening Settings or Privacy from a normal screen, remember that screen as the return point. Moving *between* Settings and Privacy does not overwrite it, so "back" still returns to where the student really started.
  - **Line 222** changes the screen.
  - **Line 223** closes the menu drawer.
- **Line 225** builds the back button for Settings and Privacy, with a readable label.
- **Line 226** picks the two-item Calm Mode bar or the normal five-item bar.

### 5.9 Saving settings — `updateSettings` (lines 231–252)

```js
231  async function updateSettings(next) {
232    if (settingsBusy) return false;
236    if (next.calmMode && !settings.calmMode && next.calmTone !== false) setCalmSoundOn(startCalmSound());
237    const previous = settings;
238    setSettings(next);
239    setSettingsBusy(true);
240    setSettingsError('');
241    try {
242      await saveSettings(user.uid, next);
243      return true;
244    } catch (err) {
245      console.error('Unable to save settings:', err);
246      setSettings(previous);
247      setSettingsError(GENERIC_ERROR);
248      return false;
249    } finally {
250      setSettingsBusy(false);
251    }
252  }
```

This one function handles every settings change in the app (Calm Mode, text size, display name, restart point, and so on).

- **Line 232** — ignore the tap if a save is already running, to prevent two saves overlapping.
- **Line 236** — if this change **switches Calm Mode on** and the sound setting is not off, start the sound **now**, while still inside the student's tap (the only time phones allow it).
- **Line 237** keeps a copy of the old settings.
- **Line 238** applies the change on screen **straight away** (an *optimistic update*), so the app feels instant.
- **Lines 239–240** mark the save as busy and clear any old error.
- **Line 242** saves to storage and waits.
- **Line 243** returns `true`, so the caller knows it worked. For example, "Stop for now" only says "Your place is saved" after this returns `true`.
- **Lines 244–248** — if the save fails: log it for developers, **roll back** to the old settings (so the screen never shows a setting that was not saved), show the calm error, and return `false`.
- **Line 250 — `finally`** always clears the busy flag, whether the save worked or not.

### 5.10 Rendering the app frame (lines 254–321)

```js
254  const calmReducedMotion = settings.calmMode && calmSession.reduceMotion;
262  return <main
263    className={`${settings.calmMode ? 'calm' : ''} ${(settings.reducedMotion || calmReducedMotion) ? 'reduced' : ''}${settings.calmMode && calmSession.reduceVisualDetail ? ' calm-low-detail' : ''}`}
264    style={{ '--scale': settings.textScale }}
265  >
```

- **Line 254** — motion is reduced if the student turned on Reduced Motion in Settings, **or** if Calm Mode is on with its "Reduce motion" session preference.
- **Line 263** adds CSS classes to the outermost element:
  - `calm` switches on Calm Mode's softer palette;
  - `reduced` removes all animation (`.reduced * { animation: none !important; transition: none !important; }` in `base.css`);
  - `calm-low-detail` hides decorative illustrations.
- **Line 264** sets the CSS variable `--scale` to the chosen text size (1, 1.15 or 1.3). `base.css` sets `font-size: calc(16px * var(--scale, 1))` on `main`, and all other sizes use `em` units, so **all the text in the app grows together**.
- The comment on lines 256–261 explains the design: accessibility preferences are applied **once, at the top**, and every screen inherits them without needing any code of its own.

```js
266  <section className="phone">
267    <header>
268      <button className="icon" ref={menuButtonRef} onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button>
269      <Logo />
270      <div className="header-actions">
271        <button className={`calm-toggle${settings.calmMode ? ' on' : ''}`} type="button"
274          aria-pressed={settings.calmMode}
275          aria-label={settings.calmMode ? 'Turn Calm Mode off' : 'Turn Calm Mode on'}
276          disabled={settingsBusy}
277          onClick={() => updateSettings({ ...settings, calmMode: !settings.calmMode })}>
279          <Leaf aria-hidden="true" /> {settings.calmMode ? 'Calm on' : 'Calm'}
280        </button>
283        {settings.calmMode && <button className="icon sound-toggle" type="button"
286          aria-pressed={calmSoundOn}
287          aria-label={calmSoundOn ? 'Stop calming sound' : 'Play calming sound'}
288          onClick={() => {
289            if (calmSoundOn) { stopCalmSound(); setCalmSoundOn(false); }
290            else setCalmSoundOn(startCalmSound());
291          }}>
293          {calmSoundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
294        </button>}
```

- **Line 266** — `.phone` is the rounded "phone-shaped" frame. On a small screen the CSS makes it fill the whole screen.
- **Line 268** is the menu button. The icon has no text, so `aria-label` gives it a spoken name for screen readers. The ref lets focus return here when the menu closes.
- **Lines 271–280** — the **Calm Mode toggle is in the header on every screen**, so the student can reach it from anywhere with one tap. `aria-pressed` tells screen readers whether it is on. `{ ...settings, calmMode: !settings.calmMode }` copies all the settings and flips only Calm Mode. The button is disabled while a save is running.
- **Lines 283–294** — while Calm Mode is on, a **sound button** is always available, so the sound can be stopped at any moment. This meets WCAG success criterion 1.4.2 (Audio Control). Icons marked `aria-hidden="true"` are skipped by screen readers because the button already has a label.

```js
297  {settingsError && <div className="content" …><StatusMessage text={settingsError} tone="error" /></div>}
298  {!isOnline && <div className="content" …><p className="status-msg status" role="status">You're offline. …</p></div>}
299  <Drawer open={menu} onClose={() => setMenu(false)} triggerRef={menuButtonRef}>
300    <Logo />
301    <button onClick={() => go('settings')}><Settings /> Settings</button>
302    <button onClick={() => go('privacy')}><Shield /> Privacy &amp; data</button>
303    <button onClick={() => (firebaseEnabled ? signOut(auth) : location.reload())}><LogOut /> Sign out</button>
304    <p>Nuvora provides academic support, not medical advice or diagnosis.</p>
305  </Drawer>
```

- **Line 297** shows a settings save error at the top of every screen.
- **Line 298** shows the offline notice. `role="status"` makes screen readers announce it politely.
- **Lines 299–305** — the side menu (Section 29). It holds Settings, Privacy, Sign out, and a permanent reminder that the app is **not medical advice**. Signing out in Firebase mode calls `signOut`, which triggers the listener on line 139, which sets `user` to `null`, which shows the login screen. In demo mode it just reloads the page.

```js
306  <div className={`content${screen === 'overwhelmed' ? ' overwhelmed-bg' : ''}`}>
307    {screen === 'today' && <Today data={data} go={go} uid={user.uid} setData={setData} settings={settings} updateSettings={updateSettings} … />}
308    {screen === 'tasks' && <Tasks data={data} uid={user.uid} setData={setData} calmMode={settings.calmMode} calmSession={calmSession} />}
309    {screen === 'checkin' && <Checkin … draft={checkinDraft} setDraft={setCheckinDraft} hideNumbers={settings.calmMode && calmSession.hideProgressNumbers} />}
 …
316    {screen === 'overwhelmed' && <Overwhelmed data={data} uid={user.uid} setData={setData} go={go} settings={settings} />}
317  </div>
```

- **Line 306** — the scrolling content area. Overwhelmed Mode gets its own softer background.
- **Lines 307–316** are the **"router"**: `screen === 'x' && <X />` draws a screen only when it is the current one. Each screen receives only the props it needs. Almost all of them get:
  - `data` — the shared copy of the student's data;
  - `setData` — so the screen can update the shared copy after a successful save;
  - `uid` — the user id, passed to the store functions;
  - `go` — to navigate.

  Some also receive `settings`, `updateSettings`, and the Calm session values. Passing values down like this is called *props drilling*. It is simple and clear for an app of this size, and means no extra state-management library is needed.

```js
318  {!['checkin', 'overwhelmed', 'settings', 'reflection', 'privacy'].includes(screen) &&
       <nav className={settings.calmMode ? 'calm-nav' : ''}>
         {visibleNav.map(([id, I, label]) =>
           <button key={id} className={screen === id ? 'active' : ''} onClick={() => go(id)}>
             <I aria-hidden="true" /><span>{label}</span></button>)}
       </nav>}
```

- **Line 318** draws the bottom navigation bar, except on focused screens (Check-in, Overwhelmed, Settings, Reflection, Privacy). Hiding it there removes distractions while the student is doing one thing, and those screens have their own back buttons. `visibleNav.map(...)` turns each `[id, Icon, label]` entry into a button. `key={id}` helps React track each button. The current screen's button gets the `active` class so it is highlighted.


---

# Part C — Data and security

## 6. `lib/firebase.js` — connecting to Firebase

This file creates the connection to Firebase **once**, and decides which storage mode the app runs in.

### 6.1 Imports and configuration (lines 1–36)

```js
 1  import { getApp, getApps, initializeApp } from 'firebase/app';
 7  import { EmailAuthProvider, getAuth, reauthenticateWithCredential, deleteUser as firebaseDeleteUser } from 'firebase/auth';
14  import { getFirestore } from 'firebase/firestore';
18  const config = {
19    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
22    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
25    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      … storageBucket, messagingSenderId, appId
36  };
```

- **Line 1** — the functions that start a Firebase app, or reuse one that already exists.
- **Line 7** — the Authentication functions. `deleteUser` is renamed `firebaseDeleteUser` so it cannot be confused with Nuvora's own `deleteAccount` function below.
- **Line 14** — the function that opens the Firestore database.
- **Lines 18–36** — the connection settings, read from the environment variables described in Section 3.3.

### 6.2 The storage-mode switch (lines 44–47)

```js
44  export const firebaseEnabled = Boolean(
45    config.apiKey &&
46    config.projectId
47  );
```

This is **the single switch between the two storage modes**. If an API key and a project id were present when the app was built, `firebaseEnabled` is `true` (Firebase mode). Otherwise it is `false` (demo mode). `Boolean(...)` turns the result into a clean `true` or `false`.

Because `NEXT_PUBLIC_` values are copied into the code when it is built, the mode is **fixed for each build**. The comment (lines 38–43) also records a security point: the Firebase web configuration **is not a secret**. It only identifies the project. Access to the data is controlled by **Firebase Authentication plus the security rules** (Section 8).

### 6.3 Creating the app, auth and database (lines 49–81)

```js
49  const app = firebaseEnabled
50    ? (getApps().length ? getApp() : initializeApp(config))
55    : null;
57  export const auth = app ? getAuth(app) : null;
79  export const db = app ? getFirestore(app) : null;
```

- **Lines 49–55** — in Firebase mode, reuse the existing Firebase app if there is one (`getApps().length`), otherwise create it. This prevents a "duplicate app" error when the development server reloads a file. In demo mode, `app` is `null`.
- **Line 57 — `auth`** is the Authentication service, used for login, logout and account deletion.
- **Line 79 — `db`** is the Firestore database connection, used by `store.js`.

The long comment on lines 61–78 records a **privacy decision**. Firestore can keep a permanent copy of data in the browser (IndexedDB) so that it works offline. Nuvora **deliberately leaves this off**, because check-in answers can be sensitive and the app might be used on a shared university computer. Data is cached only in memory for the current session. A future "trusted device" option could turn permanent storage on after the student agrees.

### 6.4 `reauthenticate(password)` (lines 94–121)

```js
 94  export async function reauthenticate(password) {
 97    const user = auth?.currentUser;
 99    if (!user) { throw new Error('Not signed in.'); }
105    if (!user.email) { throw new Error('The signed-in account does not have an email address available for re-authentication.'); }
111    const credential = EmailAuthProvider.credential(user.email, password);
117    await reauthenticateWithCredential(user, credential);
121  }
```

Firebase only allows sensitive actions such as deleting an account if the user signed in **recently**. This function asks for the password again to prove that.

- **Line 97** gets the signed-in user. `auth?.` means "if `auth` exists" (it is `null` in demo mode).
- **Lines 99 and 105** stop with a clear error if nobody is signed in, or the account has no email.
- **Line 111** builds a credential from the email and the password just typed.
- **Line 117** asks Firebase to check it. A wrong password throws an error, which the Privacy screen shows as a friendly message.

### 6.5 `deleteAccount()` (lines 145–157)

```js
145  export async function deleteAccount() {
146    const user = auth?.currentUser;
148    if (!user) { throw new Error('Not signed in.'); }
154    await firebaseDeleteUser(user);
157  }
```

Deletes the Firebase login account itself. The comment (lines 123–144) explains the **order of the whole deletion**, which the Privacy screen follows (Section 28):

1. `reauthenticate()` — check the password **before** anything is deleted;
2. delete all Firestore data;
3. `deleteAccount()`.

The first version deleted the data first and could then fail with `auth/requires-recent-login`, leaving a student with **no data but an account that still existed**. Checking the password first removes that failure. The comment is honest that the process is still **not atomic**: Authentication and Firestore are separate services, so a network failure half-way through could still leave the two out of step.

---

## 7. `lib/store.js` — the single data layer

**Every save and every load in Nuvora goes through this file.** Screens never talk to Firestore or `localStorage` directly. This is the *repository pattern*: one module hides where the data is stored, so the rest of the app behaves the same in both modes.

Every function follows the same shape:

```js
export async function something(uid, …) {
  if (!firebaseEnabled) {
    // DEMO MODE: read the one JSON object from localStorage, change it, write it back
    return;
  }
  // FIREBASE MODE: call the Firestore API
}
```

### 7.1 The data model

The comment on lines 5–28 describes where data is stored in Firebase mode:

```
users/{uid}                     ← one document per student
  ├─ settings: { calmMode, textScale, displayName, restartMemory, … }
  ├─ stats:    { stepsCompleted, strategyUses: { start, big, energy, reset, support } }
  ├─ tasks/{taskId}             ← one document per task
  ├─ checkins/{checkinId}       ← one document per daily check-in
  └─ reflections/{reflectionId} ← one document per weekly reflection
```

Putting everything under `users/{uid}` makes the security rules simple: "a user may only touch the branch under their own id".

In demo mode, the whole structure is **one JSON object** stored in `localStorage` under the key `nuvora-demo-data-v1` (line 30).

The comment also records two differences between the modes that the screens have to handle:
- In demo mode, the task-update functions return the updated task. In Firebase mode they return **nothing**. So screens never use the return value; they apply the same change to their own copy of the data instead.
- A Firestore save waits until the server accepts it. While offline, it keeps waiting, so a "Saving…" state can last until the connection comes back.

### 7.2 Defaults (lines 30–63)

```js
30  const key = 'nuvora-demo-data-v1';
32  export const defaultSettings = {
33    calmMode: false,
37    calmTone: true,
38    reducedMotion: false,
39    textScale: 1,
40    displayName: '',
41    hideProgress: false,
42    supportPersonName: '',
43    supportPersonNote: '',
44    restartMemory: null,
45  };
52  export const defaultStats = { stepsCompleted: 0, strategyUses: { start: 0, big: 0, energy: 0, reset: 0, support: 0 } };
```

- **Line 30** — the `localStorage` key. The `-v1` suffix leaves room to change the format later.
- **Lines 32–45** — every setting and its default value:

  | Setting | Meaning |
  |---|---|
  | `calmMode` | Calm Mode on or off. |
  | `calmTone` | Play the background sound when Calm Mode starts (on by default, can be switched off). |
  | `reducedMotion` | Remove animation. |
  | `textScale` | Text size: 1, 1.15 or 1.3. |
  | `displayName` | Optional name used in the greeting. |
  | `hideProgress` | Hide the Progress screen's details. |
  | `supportPersonName` / `supportPersonNote` | An optional note about who the student could ask for help. Nuvora never contacts them. |
  | `restartMemory` | The "Stop for now" restart point (Section 20). |

- **Line 52 — `defaultStats`.** The comment (lines 47–51) explains an ethical design choice: the app counts **small steps taken** and **which support strategies were used**, and deliberately **not** "tasks completed", streaks, targets or missed days. These numbers are for reflection. They are not a productivity score that could make the student feel judged.

```js
56  export function withStepCounted(stats) {
57    return { ...stats, stepsCompleted: (stats?.stepsCompleted || 0) + 1 };
58  }
59  export function withStrategyCounted(stats, barrierId) {
60    const strategyUses = { ...defaultStats.strategyUses, ...(stats?.strategyUses || {}) };
61    strategyUses[barrierId] = (strategyUses[barrierId] || 0) + 1;
62    return { ...stats, strategyUses };
63  }
```

These make the **same +1 change to the in-memory copy** that `recordStepCompleted` and `recordStrategyUse` make in storage, so the Progress screen updates without reloading. They build **new objects** (`{ ...stats, … }`) instead of changing the old one, because React only notices a change when it receives a new object. Line 60 fills any missing counters with 0 first.

### 7.3 Demo sample data — `buildSeed()` (lines 65–143)

```js
65  function dayOffset(offset) {
66    const d = new Date();
67    d.setDate(d.getDate() + offset);
68    return d.toISOString().slice(0, 10);
69  }
70  function timeAgo(daysAgo) {
71    const d = new Date();
72    d.setDate(d.getDate() - daysAgo);
73    d.setHours(9, 0, 0, 0);
74    return d.toISOString();
75  }
```

- **`dayOffset(n)`** returns a date `n` days from today as `YYYY-MM-DD` (`.slice(0, 10)` keeps just the date part). Used for task due dates.
- **`timeAgo(n)`** returns 9 am, `n` days ago, as a full timestamp. Used for when check-ins happened.

```js
 85  function buildSeed() {
 86    const trendScores = [78, 65, 60, 52, 45, 30, 28]; // oldest -> newest
 87    const checkins = trendScores
 88      .map((score, i) => {
 89        const { band, message } = bandFromScore(score);
 90        return {
 91          id: `seed-checkin-${i}`,
 92          answers: {},
 93          risk: { score, band, message,
 95            factors: { workload: score, taskInitiation: Math.max(0, score - 10), focus: Math.max(0, score - 15),
 99                       rest: Math.max(0, score - 20), confidence: Math.max(0, score - 25) } },
103          createdAt: timeAgo(trendScores.length - 1 - i),
104        };
105      })
106      .reverse();
```

- **Line 86** — seven sample scores that go down over a week, so the demo shows an improving trend.
- **Line 89** — each band ("Low", "Moderate", "Higher") and message comes from the **real banding function** (`bandFromScore`, Section 9). The demo therefore cannot disagree with how the real app works.
- **Lines 95–99** — sample factor values so the "Why this result?" breakdown has something to show. `Math.max(0, …)` stops values below zero.
- **Line 103** — the oldest score is dated 6 days ago, the newest today.
- **Line 106** — reversed so the newest comes first, which is the order real check-ins are stored in.

The comment on lines 77–84 explains why dates are **calculated from today** instead of fixed: an earlier version used fixed August 2026 dates, which were already in the past when the app was revisited, so the "overdue" and "due soon" examples no longer made sense.

**Lines 108–142** return six sample tasks (overdue, due today, due tomorrow, later in the week, one completed), each with its current micro-step, plus two sample reflections, default settings and sample statistics.

### 7.4 Upgrading old tasks — `migrateTask(t)` (lines 151–164)

```js
151  export function migrateTask(t) {
152    const withDefaults = { priority: 'normal', taskType: 'general', ...t };
153    if (withDefaults.currentStep) return withDefaults;
154    const { step, ...rest } = withDefaults;
155    return {
156      ...rest,
157      currentStep: {
158        id: `${t.id}-step-1`,
159        text: step || 'Open this task and note one small first action.',
160        done: false,
161        completedAt: null,
162      },
163    };
164  }
```

Early versions of Nuvora stored a task's step as one plain text field, `step`. The current design separates the **academic task** (for example "Write methods section") from its **current micro-step** (for example "Write one heading"), so finishing a step never means finishing the whole assignment. This function upgrades old tasks **as they are read**, without changing anything stored.

- **Line 152** — add `priority: 'normal'` and `taskType: 'general'` if they are missing. Because `...t` comes after the defaults, any real value in the task wins.
- **Line 153** — a task that already has a `currentStep` is in the new shape, so return it.
- **Line 154** — take the old `step` field out, keeping everything else in `rest`.
- **Lines 155–163** — build a proper `currentStep` object from the old text, or a gentle default if there was none.

### 7.5 Reading and writing in demo mode (lines 166–193)

```js
166  function localRead() {
167    if (typeof window === 'undefined') return buildSeed();
168    const raw = localStorage.getItem(key);
169    if (!raw) return buildSeed();
170    try {
171      const parsed = JSON.parse(raw);
175      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return buildSeed();
179      for (const list of ['tasks', 'checkins', 'reflections']) {
180        if (!Array.isArray(parsed[list])) parsed[list] = [];
181      }
182      return parsed;
183    } catch {
187      return buildSeed();
188    }
189  }
190  function localWrite(data) {
191    localStorage.setItem(key, JSON.stringify(data));
192    return data;
193  }
```

`localRead` is written **defensively**: whatever is stored, it never crashes the app.

- **Line 167** — during the build there is no browser, so return sample data.
- **Lines 168–169** — first visit (nothing stored) → sample data.
- **Line 171** — turn the stored text back into an object.
- **Line 175** — if the stored value is valid JSON but the wrong shape (for example `null` or a list), start again with sample data.
- **Lines 179–181** — if any of the three lists is missing, use an empty list, so later code such as `tasks.map` cannot fail.
- **Lines 183–187** — if the text is not valid JSON at all (edited by hand, or a write was interrupted), start again instead of leaving the student on a blank screen.
- **`localWrite`** (lines 190–193) turns the object into text and saves it.

### 7.6 Cleaning stored settings and stats (lines 200–296)

Data loaded from storage is **never trusted blindly**. It could be old, partly written, or edited.

```js
200  function sanitizeRestartMemory(raw) {
201    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
203    const taskId = typeof raw.taskId === 'string' ? raw.taskId : '';
204    const taskTitle = typeof raw.taskTitle === 'string' ? raw.taskTitle.slice(0, 200) : '';
209    const stepText = typeof raw.stepText === 'string' ? raw.stepText.slice(0, 500) : '';
214    const stoppedAt = typeof raw.stoppedAt === 'string' && !Number.isNaN(Date.parse(raw.stoppedAt)) ? raw.stoppedAt : '';
220    if (!taskId || !stepText || !stoppedAt) return null;
222    return { taskId, taskTitle, stepText, stoppedAt };
228  }
```

- **Line 201** — not an object → there is no restart point.
- **Lines 203–218** — check the type of each field. Long text is cut to a safe length (`.slice(0, 200)`, `.slice(0, 500)`). `stoppedAt` must be a date the browser can read.
- **Line 220** — without a task id, step text or time, the restart point is useless, so it is dropped.

```js
230  function sanitizeSettings(raw) {
231    const r = raw && typeof raw === 'object' ? raw : {};
233    return {
234      calmMode: typeof r.calmMode === 'boolean' ? r.calmMode : defaultSettings.calmMode,
239      reducedMotion: typeof r.reducedMotion === 'boolean' ? r.reducedMotion : defaultSettings.reducedMotion,
246      textScale: typeof r.textScale === 'number' && Number.isFinite(r.textScale) && r.textScale >= 0.5 && r.textScale <= 2 ? r.textScale : defaultSettings.textScale,
254      displayName: typeof r.displayName === 'string' ? r.displayName.slice(0, 100) : defaultSettings.displayName,
       … the same pattern for hideProgress, supportPersonName (.slice(0, 100)), supportPersonNote (.slice(0, 300)), calmTone
279      restartMemory: sanitizeRestartMemory(r.restartMemory),
280    };
281  }
```

Each setting is checked **separately**: if its type is right, it is kept; otherwise that one setting uses its default. **One damaged value never resets all of the student's preferences.** `Number.isFinite` rejects `NaN` and `Infinity`, and the 0.5–2 range rejects absurd sizes; either would otherwise break the CSS text-size calculation. The `.slice()` limits and the text-size range are **the same as the limits in `firestore.rules`** (Section 8.4). Because `saveSettings` passes everything through this function before writing, a settings save is never refused by the server, even if an older stored value was too long.

```js
285  function sanitizeStats(raw) {
286    const r = raw && typeof raw === 'object' ? raw : {};
287    const su = r.strategyUses && typeof r.strategyUses === 'object' ? r.strategyUses : {};
288    const strategyUses = {};
289    for (const k of Object.keys(defaultStats.strategyUses)) {
290      strategyUses[k] = typeof su[k] === 'number' && Number.isFinite(su[k]) ? su[k] : defaultStats.strategyUses[k];
291    }
292    return {
293      stepsCompleted: typeof r.stepsCompleted === 'number' && Number.isFinite(r.stepsCompleted) ? r.stepsCompleted : defaultStats.stepsCompleted,
294      strategyUses,
295    };
296  }
```

The same idea for the statistics. Line 289 loops over the **known** strategy names only, so an unexpected extra key in storage is ignored.

### 7.7 Reflection dates (lines 304–324)

```js
304  export function reflectionTime(r) {
305    const c = r?.createdAt;
306    if (!c) return 0;
307    if (typeof c.toMillis === 'function') return c.toMillis();
308    if (typeof c.seconds === 'number') return c.seconds * 1000;
309    const ms = typeof c === 'number' ? c : Date.parse(c);
310    return Number.isNaN(ms) ? 0 : ms;
311  }
319  function normalizeReflections(list) {
320    if (!Array.isArray(list)) return [];
321    return list
322      .filter(r => r && typeof r === 'object')
323      .sort((a, b) => reflectionTime(b) - reflectionTime(a));
324  }
```

A reflection's `createdAt` can arrive in **three formats**: a Firestore `Timestamp` object (loaded from Firebase), a plain `{ seconds }` object, or a text date (demo mode, or a reflection just saved). `reflectionTime` turns all of them into one number (milliseconds since 1970), so sorting and display work the same way whatever the source.

- **Line 306** — a missing date returns 0, so a broken entry sorts **last**, not first.
- **Lines 307–310** — handle each format in turn.
- **`normalizeReflections`** removes invalid entries (line 322) and sorts **newest first** (line 323; `b - a` gives descending order).

### 7.8 Loading everything — `loadData(uid)` (lines 333–356)

```js
333  export async function loadData(uid = 'demo') {
334    if (!firebaseEnabled) {
335      const d = localRead();
336      return {
337        tasks: Array.isArray(d.tasks) ? d.tasks.map(migrateTask) : [],
338        checkins: Array.isArray(d.checkins) ? d.checkins : [],
339        reflections: normalizeReflections(d.reflections),
340        settings: sanitizeSettings(d.settings),
341        stats: sanitizeStats(d.stats),
342      };
343    }
344    const taskSnap = await getDocs(query(collection(db, 'users', uid, 'tasks'), orderBy('createdAt', 'desc')));
345    const checkSnap = await getDocs(query(collection(db, 'users', uid, 'checkins'), orderBy('createdAt', 'desc')));
346    const reflectionSnap = await getDocs(query(collection(db, 'users', uid, 'reflections'), orderBy('createdAt', 'desc')));
347    const userSnap = await getDoc(doc(db, 'users', uid));
348    const stored = userSnap.exists() ? userSnap.data() : null;
349    return {
350      tasks: taskSnap.docs.map(d => migrateTask({ id: d.id, ...d.data() })),
351      checkins: checkSnap.docs.map(d => ({ id: d.id, ...d.data() })),
352      reflections: normalizeReflections(reflectionSnap.docs.map(d => ({ id: d.id, ...d.data() }))),
353      settings: sanitizeSettings(stored?.settings),
354      stats: sanitizeStats(stored?.stats),
355    };
356  }
```

Called **once** by `NuvoraApp` when the student arrives. It returns all their data in one object.

- **Lines 334–342 (demo mode)** — read the local store and pass each part through the upgrade and cleaning functions.
- **Lines 344–346 (Firebase mode)** — read each sub-collection **newest first**. `collection(db, 'users', uid, 'tasks')` builds the path `users/{uid}/tasks`. `query(…, orderBy('createdAt', 'desc'))` sorts by creation time, newest first. `getDocs` fetches every matching document.
- **Line 347** — read the `users/{uid}` document itself, which holds the settings and stats.
- **Line 348** — a brand-new user has no document yet, so `stored` is `null`, and the cleaning functions then return the defaults.
- **Lines 350–352** — each Firestore document keeps its id separately from its data, so `{ id: d.id, ...d.data() }` joins them into one plain object. Tasks also go through `migrateTask`.

Note: Firestore **leaves out any document that has no `createdAt` field** when you sort by that field (the comment on line 332 mentions this). The app always writes `createdAt`, so this only affects data created some other way.

### 7.9 Task functions (lines 358–431)

**Adding a task:**

```js
358  export async function addTask(uid, task) {
359    if (!firebaseEnabled) {
360      const d = localRead();
361      const now = new Date().toISOString();
362      const saved = migrateTask({ ...task, id: crypto.randomUUID(), done: false, createdAt: now, updatedAt: now });
363      d.tasks.unshift(saved);
364      localWrite(d);
365      return saved;
366    }
367    const ref = await addDoc(collection(db, 'users', uid, 'tasks'), { ...task, done: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
368    return migrateTask({ ...task, id: ref.id, done: false });
369  }
```

- **Line 362 (demo)** — give the task a random unique id (`crypto.randomUUID()`), mark it not done, and record the time.
- **Line 363** — `unshift` adds it at the **start** of the list, so it appears first.
- **Line 367 (Firebase)** — `addDoc` creates a new document with an automatic id. `serverTimestamp()` asks Firestore to use **Google's server clock** rather than the phone's clock, which could be set wrongly.
- **Line 368** — return the task with the new id, so the screen can add it to its list.

**Other task functions** follow the same pattern:

| Function | Lines | What it changes |
|---|---|---|
| `toggleTask(uid, id, done)` | 367–375 | Marks the **whole assignment** done or not done (`updateDoc(…, { done })`). |
| `removeTask(uid, id)` | 377–385 | Deletes one task (`deleteDoc`). |
| `updateTask(uid, id, patch)` | 389–398 | Changes the task's own fields (title, module, due date, priority), and deliberately **nothing else**. |
| `setCurrentStep(uid, id, step)` | 403–411 | Replaces the current micro-step (edited, picked from alternatives, or the next one generated). |
| `completeCurrentStep(uid, id, done)` | 415–427 | Marks **only the micro-step** done. |

`completeCurrentStep` shows the key rule of the data model:

```js
419  export async function completeCurrentStep(uid, id, done = true) {
420    const completedAt = done ? new Date().toISOString() : null;
421    if (!firebaseEnabled) {
423      d.tasks = d.tasks.map(t => (t.id === id ? { ...t, currentStep: { ...t.currentStep, done, completedAt } } : t));
       …
426    }
427    await updateDoc(doc(db, 'users', uid, 'tasks', id), {
428      'currentStep.done': done,
429      'currentStep.completedAt': done ? serverTimestamp() : null,
430    });
431  }
```

- **Line 423** — in demo mode, copy the task and its step and set `done` on the **step only**; the task's own `done` is left alone.
- **Lines 428–429** — in Firebase mode, the dotted names (`'currentStep.done'`) update **only those fields inside** the `currentStep` map, without overwriting the rest of the task.
- The comment on lines 417–418 states the rule directly: *this must never mark the full academic task as done — that is `toggleTask`'s job.*

### 7.10 Check-ins, reflections, settings (lines 433–475)

```js
433  export async function saveCheckin(uid, data) {
434    if (!firebaseEnabled) {
436      d.checkins.unshift({ ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
       …
439    }
440    await addDoc(collection(db, 'users', uid, 'checkins'), { ...data, createdAt: serverTimestamp() });
441  }
```

Saves one check-in: the answers, plus the calculated result (or `risk: null` for an incomplete one).

```js
452  export async function saveReflection(uid, data) {
453    const createdAt = new Date().toISOString();
454    if (!firebaseEnabled) { … return saved; }
462    const ref = await addDoc(collection(db, 'users', uid, 'reflections'), { ...data, createdAt: serverTimestamp() });
463    return { ...data, id: ref.id, createdAt };
464  }
```

Reflections are **entirely the student's own words**. They are never generated, summarised or scored. In Firebase mode, the server time is not known on the device straight away, so line 463 returns the **local** time for display. The next time the data is loaded, the server's time replaces it.

```js
466  export async function saveSettings(uid, settings) {
467    const merged = sanitizeSettings({ ...defaultSettings, ...settings });
468    if (!firebaseEnabled) { d.settings = merged; localWrite(d); return; }
474    await setDoc(doc(db, 'users', uid), { settings: merged }, { merge: true });
475  }
```

- **Line 467** — fill in any missing settings with defaults, then clean the result **before saving**, so bad values can never be written.
- **Line 474** — `setDoc` with `{ merge: true }` updates **only** the `settings` field of the user document and leaves `stats` alone. It also creates the document if it does not exist yet (for example, right after sign-up).

### 7.11 Statistics counters (lines 479–504)

```js
479  export async function recordStepCompleted(uid) {
480    if (!firebaseEnabled) { … d.stats = { ...stats, stepsCompleted: (stats.stepsCompleted || 0) + 1 }; … }
487    await setDoc(doc(db, 'users', uid), { stats: { stepsCompleted: increment(1) } }, { merge: true });
488  }
493  export async function recordStrategyUse(uid, barrierId) {
       …
503    await setDoc(doc(db, 'users', uid), { stats: { strategyUses: { [barrierId]: increment(1) } } }, { merge: true });
504  }
```

`increment(1)` is an **atomic** Firestore operation: the server adds 1 to the stored number itself. If two devices both add 1 at the same moment, both are counted; nothing is lost the way it could be with "read, add 1, write back". `[barrierId]` is a *computed key*: if `barrierId` is `'big'`, only `strategyUses.big` is increased.

### 7.12 Deleting and exporting data (lines 506–563)

```js
514  async function deleteAllDocsIn(uid, subcollection) {
515    const snap = await getDocs(collection(db, 'users', uid, subcollection));
516    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
517  }
```

Firestore has no "delete a whole collection" command for web apps, so this reads every document in the collection and deletes each one. `Promise.all` runs the deletions **at the same time** and waits for all of them.

Each deletion function removes **exactly** what its name says, and nothing else. This matches the plain-language promises on the Privacy screen:

| Function | Lines | Removes |
|---|---|---|
| `deleteCheckinHistory` | 515–524 | All check-ins **and** reflections. Tasks and settings stay. |
| `deleteCompletedTasks` | 526–535 | Only tasks with `done: true` (line 538 filters them). |
| `deleteAllData` | 540–551 | Everything: all three collections, then the `users/{uid}` document itself (line 554). |

```js
544  export async function deleteAllData(uid) {
545    if (!firebaseEnabled) {
550      localWrite({ tasks: [], checkins: [], reflections: [], settings: { ...defaultSettings }, stats: { ...defaultStats } });
551      return;
552    }
       …
555  }
```

**Line 550** shows an important detail. In demo mode, simply removing the storage key would make `localRead` think this was a first visit and **bring the sample data back**, silently undoing the deletion the student asked for. So an explicitly **empty** state is written instead.

```js
560  export async function exportAllData(uid) {
561    const data = await loadData(uid);
562    return { exportedAt: new Date().toISOString(), ...data };
563  }
```

The JSON export reuses `loadData`, so the file always contains exactly what the app itself shows, plus the time of export. This supports the student's right of access under data-protection law (UK GDPR).

---

## 8. `firestore.rules` — server-side security

The front-end code can be changed by anyone who opens the browser's developer tools, so **real security has to be enforced on the server**. These rules run on Google's servers and check every single read and write before it happens.

### 8.1 Header and ownership helper (lines 1–13)

```
 1  rules_version = '2';
 3  service cloud.firestore {
 4    match /databases/{database}/documents {
10      function isOwner(userId) {
11        return request.auth != null
12          && request.auth.uid == userId;
13      }
```

- **Line 1** — use version 2 of the rules language.
- **Lines 3–4** — the rules apply to every document in this project's Firestore database.
- **Lines 10–13 — `isOwner`** is the core rule: the request must come from a **signed-in** user (`request.auth != null`), and that user's id must **match** the `{userId}` in the path they are accessing. `request.auth` is filled in by Firebase from the login token and cannot be faked by the app.

### 8.2 Validating task data (lines 22–64)

```
22  function validTask(data) {
23    return
24      data.title is string && data.title.size() > 0 && data.title.size() <= 200
28      && data.module is string && data.module.size() <= 100
31      && data.due is string && data.due.size() <= 10
35      && ( !('priority' in data) || ( data.priority is string && data.priority in ['low', 'normal', 'high'] ) )
47      && data.bucket is string && data.bucket in ['today', 'week', 'later']
54      && data.done is bool
56      && data.currentStep is map
58      && data.currentStep.id is string
60      && data.currentStep.text is string && data.currentStep.text.size() <= 500
63      && data.currentStep.done is bool;
64  }
```

This checks the **shape** of a task before Firestore accepts it:
- the title must be text of 1–200 characters;
- the module name at most 100 characters;
- the due date at most 10 characters (`YYYY-MM-DD`);
- priority, if present, must be one of three values (it may be missing, because older tasks were created before it existed — see `migrateTask`);
- the bucket must be `today`, `week` or `later`;
- `done` must be true or false;
- there must be a `currentStep` with an id, text of at most 500 characters, and a `done` flag.

This stops broken or oversized data being saved even if someone bypasses the app, and keeps the stored data in the shape the app expects.

### 8.3 Validating check-ins (lines 73–114)

```
 73  function validRisk(data) {
 74    return !('risk' in data)
 75      || data.risk == null
 76      || ( data.risk is map
 82        && data.risk.score is number && data.risk.score >= 0 && data.risk.score <= 100
 86        && data.risk.band is string && data.risk.band in ['Low', 'Moderate', 'Higher']
 93        && data.risk.factors is map );
 95  }
103  function validCheckin(data) {
104    return data.answers is map
107      && ( !('createdAt' in data) || data.createdAt is timestamp || data.createdAt is string )
113      && validRisk(data);
114  }
```

- **Lines 74–75** — a check-in may have **no result** (`risk: null`). This is how "Not sure" answers are respected: an incomplete check-in is saved without being forced into a band.
- **Lines 82–93** — if there is a result, its score must be a number from **0 to 100** (the same range the app produces: `calculatePressure` stays within 0–100 and `combineWorkloadPressure` caps with `Math.min(100, …)`), the band must be one of the **three known bands**, and the factors must be present.
- **Lines 104–113** — a check-in must include the answers, and its date must be a real timestamp or a text date.

### 8.4 Validating settings, stats and reflections (lines 120–187)

```
120  function optionalString(data, key, max) {
121    return !(key in data)
122      || (data[key] is string && data[key].size() <= max);
123  }
136  function validRestartMemory(m) {
137    return m == null
138      || ( m is map
140        && m.get('taskId', '') is string
141        && m.get('taskTitle', '') is string && m.get('taskTitle', '').size() <= 200
144        && m.get('stepText', '') is string && m.get('stepText', '').size() <= 500
145        && m.get('stoppedAt', '') is string );
147  }
149  function validSettings(s) {
150    return s is map
151      && s.get('calmMode', false) is bool
       …   calmTone, reducedMotion, hideProgress are bool
155      && s.get('textScale', 1) is number && s.get('textScale', 1) >= 0.5 && s.get('textScale', 1) <= 2
158      && optionalString(s, 'displayName', 100)
159      && optionalString(s, 'supportPersonName', 100)
160      && optionalString(s, 'supportPersonNote', 300)
161      && validRestartMemory(s.get('restartMemory', null));
162  }
164  function validStats(st) {
165    return st is map
166      && st.get('stepsCompleted', 0) is number
167      && st.get('strategyUses', {}) is map;
168  }
170  function validUserDoc(data) {
171    return (!('settings' in data) || validSettings(data.settings))
172      && (!('stats' in data) || validStats(data.stats));
173  }
181  function validReflection(data) {
182    return optionalString(data, 'manageable', 2000)
183      && optionalString(data, 'hard', 2000)
184      && optionalString(data, 'text', 2000)
185      && optionalString(data, 'barrier', 100);
186  }
```

- **Lines 120–123 — `optionalString`** is a small reusable helper: a field may be **missing**, but if present it must be text no longer than `max` characters. `data[key]` reads a field whose name is held in a variable.
- **Lines 136–147** — the "Stop for now" restart point may be `null`, or a map with text fields of limited length. `m.get('taskId', '')` reads a field and uses `''` if it is missing, so a missing field never causes an error.
- **Lines 149–162 — `validSettings`** checks the **type** of each setting (true/false switches, a text size between 0.5 and 2) and the **length** of each piece of text.
- **Lines 164–168 — `validStats`** checks that the step count is a number and the strategy counts are a map.
- **Lines 170–173 — `validUserDoc`** applies these checks to the `users/{uid}` document, where settings and stats are stored as **fields**.
- **Lines 181–186 — `validReflection`** checks only the **size** of reflections. Their content is the student's own words and is deliberately not judged. `text` and `barrier` are the field names used by the seed script; the app uses `manageable` and `hard`.

**Two design points explain the details:**
1. **Extra keys are allowed.** Settings are saved with `{ merge: true }`, and for merge writes the rules check the **whole resulting document**. The seed scripts add extra keys such as `syntheticProgress`. A rule that banned unknown keys would therefore make every later settings save fail for seeded demo accounts. So only the known fields are checked.
2. **The limits match the app.** Each text limit here is the same as the `maxLength` of the matching input box (`SettingsPage.jsx`, `Auth.jsx`, `Reflection.jsx`) and the `.slice()` limits in `sanitizeSettings` (`store.js`), so the app never sends anything the server would refuse.

### 8.5 Access rules (lines 196–281)

```
196  match /users/{userId} {
198    allow read: if isOwner(userId);
200    allow create, update: if isOwner(userId) && validUserDoc(request.resource.data);
206    allow delete: if isOwner(userId);
215    match /tasks/{taskId} {
         … read/delete if owner; create/update if owner AND validTask(request.resource.data)
       }
236    match /checkins/{checkinId} {
         … read/delete if owner; create/update if owner AND validCheckin(request.resource.data)
       }
260    match /reflections/{reflectionId} {
262      allow read, delete: if isOwner(userId);
265      allow create, update: if isOwner(userId) && validReflection(request.resource.data);
       }
281  }
```

- **Lines 196–206** — only the owner can read or delete their own user document. Creating or changing it also requires `validUserDoc`.
- **Lines 215 and 236** — tasks and check-ins: the owner can read and delete; creating or changing also requires the data to pass `validTask` or `validCheckin`. `request.resource.data` means "the document **as it would look after** this write", so even a partial update is checked against the full result.
- **Lines 260–266** — reflections: owner only, with the size check.
- There are **no** `/settings` or `/stats` sub-collection rules. An earlier version had them, but the app never used them, because settings and stats are fields on the user document. They are now refused by the default deny below.

### 8.6 Default deny (lines 290–292)

```
290  match /{document=**} {
291    allow read, write: if false;
292  }
```

`{document=**}` matches **any path at all**. `if false` means "never". So **anything not explicitly allowed above is refused**. This is the secure-by-default principle: a new collection added later is private until a rule is written for it.

**Testing the rules.** There are two test files:
- `firestore.rules.test.js` (7 tests, runs with `npm test`) checks the rules file's text, for example that the score limit is 100 and that the unused sub-collection rules are gone.
- `firestore-rules.emulator-test.js` (**54 tests, all passing** with `npm run test:rules`, run on 29 September 2026) runs the **real rules** in the Firebase Firestore emulator. It checks ownership (one user cannot read or write another user's data), task, check-in, settings, stats and reflection validation, and deletion. Every "rejects…" test starts from a **valid** document and changes **exactly one** field, and most are paired with an "accepts…" test of the same document (for example, score 100 accepted and 101 rejected). That way each test proves the specific rule it is named after.


---

# Part D — The rule-based logic

Every file in this part is made of **pure functions**: they take values in and return a value, with no saving, no network and no hidden state. The same input always gives the same output. This is what makes Nuvora's behaviour **transparent** (it can be explained in full), **deterministic** (it is predictable), and **testable** (each rule has automated tests).

## 9. The workload-pressure score — `lib/pressureConfig.js` and `lib/risk.js`

### 9.1 `lib/pressureConfig.js` — the weights (lines 13–27)

```js
13  export const PRESSURE_WEIGHTS = Object.freeze({
14    workload: 0.30,
15    taskInitiation: 0.25,
16    focus: 0.20,
17    rest: 0.15,
18    confidence: 0.10,
19  });
21  export const PRESSURE_LABELS = Object.freeze({
22    workload: 'Workload feeling',
23    taskInitiation: 'Task initiation',
24    focus: 'Focus',
25    rest: 'Rest',
26    confidence: 'Confidence',
27  });
```

- **Lines 13–19** — how much each factor counts towards the score. The five weights **add up to 1.0**, so the score stays on the same 0–100 scale as each factor. Workload feeling (30%) and task initiation (25%) count most because Nuvora's aim is academic overload and difficulty getting started, the two problems its features address most directly. The comment (line 7) is clear that **these weights are the author's design decision, not clinically validated values**.
- **Lines 21–27** — readable names for each factor, used in the explanation text.
- **`Object.freeze`** makes both objects read-only, so no other part of the code can change the weights while the app is running.
- The weights live in their **own file** so that the scoring (`risk.js`) and the explanation (`explain.js`) both read the **same numbers** and cannot drift apart. `pressureConfig.test.js` checks the weights add up to 1.

### 9.2 `lib/risk.js` — input checking (lines 15–21)

```js
 1  import { z } from 'zod';
 2  import { PRESSURE_WEIGHTS } from './pressureConfig';
15  export const checkInSchema = z.object({
16    mood: z.number().int().min(1).max(4),
17    sleep: z.number().int().min(1).max(5),
18    focus: z.number().int().min(1).max(5),
19    initiation: z.number().int().min(1).max(5),
20    confidence: z.number().int().min(1).max(5),
21  });
```

A **schema** describes what valid input looks like. Zod checks the five answers **before any maths happens**: each must be a whole number (`.int()`) in its range. The workload question (`mood`) has four options; the others are 1–5 scales. If anything is wrong, Zod **throws an error** instead of quietly producing a misleading score. "Not sure" answers never reach this function, because the Check-in screen stops before scoring (Section 22).

### 9.3 `bandFromScore(score)` (lines 26–48)

```js
26  export function bandFromScore(score) {
27    if (score > 66) {
28      return { band: 'Higher', message: "It looks like you're carrying a lot. Let's shrink today to one small step." };
33    }
35    if (score > 33) {
36      return { band: 'Moderate', message: "Today's answers suggest that your workload may feel difficult to manage. Let's choose one manageable next step." };
41    }
43    return { band: 'Low', message: 'Your workload feels manageable. Keep going at your own pace.' };
48  }
```

Turns a 0–100 score into one of three **bands**, each with a supportive message:

| Score | Band | Message tone |
|---|---|---|
| 0–33 | Low | "manageable… keep going at your own pace" |
| 34–66 | Moderate | "may feel difficult… one manageable next step" |
| 67–100 | Higher | "carrying a lot… shrink today to one small step" |

The checks run from the top down, so the first match wins. The wording is **deliberately non-clinical and non-alarming**: it describes the workload, not the person, and always ends in a small action. The function is exported separately so the deadline adjustment (Section 10) and the demo data can re-band a score with **exactly the same thresholds and wording**.

### 9.4 `calculatePressure(input)` (lines 62–113)

```js
 62  export function calculatePressure(input) {
 63    const c = checkInSchema.parse(input);
 65    const invert = value =>
 66      ((5 - value) / 4) * 100;
 68    const mood =
 69      ((c.mood - 1) / 3) * 100;
 71    const factors = {
 72      workload: Math.round(mood),
 74      taskInitiation: Math.round(invert(c.initiation)),
 78      focus: Math.round(invert(c.focus)),
 82      rest: Math.round(invert(c.sleep)),
 86      confidence: Math.round(invert(c.confidence)),
 89    };
 91    const score = Math.round(
 92      factors.workload * PRESSURE_WEIGHTS.workload +
 95      factors.taskInitiation * PRESSURE_WEIGHTS.taskInitiation +
 98      factors.focus * PRESSURE_WEIGHTS.focus +
101      factors.rest * PRESSURE_WEIGHTS.rest +
104      factors.confidence * PRESSURE_WEIGHTS.confidence
106    );
108    return {
109      score,
110      factors,
111      ...bandFromScore(score),
112    };
113  }
```

This is the core calculation. It has three steps.

**Step 1 — check the input (line 63).** `checkInSchema.parse` returns the checked answers or throws an error.

**Step 2 — turn each answer into a 0–100 "pressure factor" (lines 65–89).** A higher number always means "adds more pressure".
- **Lines 65–66 — `invert`**: four of the questions run from difficult (1) to easy (5), so they are **reversed**: `(5 − value) / 4 × 100`. Answer 5 (for example "well rested") gives 0; answer 1 ("very tired") gives 100; answer 3 gives 50.
- **Lines 68–69 — workload**: this question already runs from calm (1) to very overwhelming (4), so it is scaled directly: `(value − 1) / 3 × 100`. Answer 1 gives 0, 2 gives 33.3, 3 gives 66.7, 4 gives 100.
- **Lines 71–89** round each factor to a whole number and name it. Note that the `sleep` answer becomes the `rest` factor, and `initiation` becomes `taskInitiation`.

**Step 3 — weighted sum (lines 91–106).** Each factor is multiplied by its weight and the results are added up. Because the weights add up to 1, the result is also 0–100. It is rounded to a whole number.

**Return (lines 108–112).** The score, **all five factors** (so the explanation can show what caused the score), and the band and message (spread in from `bandFromScore`).

**Worked example** (this is the test `risk.test.js` line 6, "uses the documented weighting"):

| Answer | Value | Factor calculation | Factor | × weight | Contribution |
|---|---|---|---|---|---|
| Workload (`mood`) | 2 | (2−1)/3 × 100 = 33.3 → | 33 | × 0.30 | 9.9 |
| Task initiation | 3 | (5−3)/4 × 100 = | 50 | × 0.25 | 12.5 |
| Focus | 3 | | 50 | × 0.20 | 10.0 |
| Rest (`sleep`) | 3 | | 50 | × 0.15 | 7.5 |
| Confidence | 3 | | 50 | × 0.10 | 5.0 |
| **Total** | | | | | **44.9 → 45 → Moderate** |

The extremes are also tested: the most positive answers give exactly **0**, the most negative give exactly **100**, and the band boundaries are exact (33 is Low, 34 is Moderate; 66 is Moderate, 67 is Higher).

---

## 10. The deadline adjustment — `lib/pressure.js`

**Why it exists** (comment, lines 20–23): two students can *feel* the same but face very different real workloads. The check-in measures how things feel; the task deadlines add an **objective** signal. This file adds a **small, capped** number of points for upcoming deadlines, **on top of** the self-report score, without ever changing the self-report weights.

### 10.1 The levels (lines 30–35)

```js
30  const LEVELS = [
31    { level: 'high', points: 20, test: c => c.overdueCount >= 2 },
32    { level: 'moderate', points: 12, test: c => c.overdueCount === 1 || c.dueSoonCount >= 2 },
33    { level: 'mild', points: 5, test: c => c.dueSoonCount === 1 || c.dueWeekCount >= 3 },
34    { level: 'none', points: 0, test: () => true },
35  ];
```

A **table of rules**, ordered from most to least severe. Each has a name, the points it adds, and a `test` function.

| Level | Points | When |
|---|---|---|
| high | +20 | 2 or more overdue tasks |
| moderate | +12 | exactly 1 overdue, **or** 2 or more due today/tomorrow |
| mild | +5 | exactly 1 due today/tomorrow, **or** 3 or more due in 2–7 days |
| none | 0 | otherwise (`() => true` always matches, so there is always a result) |

Writing the rules as data makes them easy to read, check and change.

### 10.2 `countDeadlines(tasks, now)` (lines 39–45)

```js
39  export function countDeadlines(tasks, now = new Date()) {
40    const open = tasks.filter(t => !t.done);
41    const overdueCount = open.filter(t => isOverdue(t.due, now)).length;
42    const dueSoonCount = open.filter(t => !isOverdue(t.due, now) && isDueWithin48h(t.due, now)).length;
43    const dueWeekCount = open.filter(t => !isOverdue(t.due, now) && !isDueWithin48h(t.due, now) && isDueWithinDays(t.due, 7, now)).length;
44    return { overdueCount, dueSoonCount, dueWeekCount };
45  }
```

- **Line 39** — `now` is a parameter with today as the default. Tests pass a fixed date, so they give the same result on any day.
- **Line 40** — only **open** tasks count; completed ones add no pressure.
- **Lines 41–43** — each task is counted in **exactly one** group. "Due soon" excludes overdue tasks, and "due this week" excludes both, so nothing is counted twice.

### 10.3 `deadlineAdjustment` and `combineWorkloadPressure` (lines 47–69)

```js
47  export function deadlineAdjustment(counts) {
48    const match = LEVELS.find(l => l.test(counts));
49    return { level: match.level, points: match.points };
50  }
56  export function combineWorkloadPressure(baseRisk, tasks, now = new Date()) {
57    const counts = countDeadlines(tasks, now);
58    const { level, points } = deadlineAdjustment(counts);
59    const adjustedScore = Math.min(100, baseRisk.score + points);
60    const { band, message } = bandFromScore(adjustedScore);
61    return {
62      ...baseRisk,
63      baseScore: baseRisk.score,
64      score: adjustedScore,
65      band,
66      message,
67      deadline: { ...counts, level, points },
68    };
69  }
```

- **Line 48** — `find` returns the **first** matching level. Because the list is ordered most-severe first, the **single most severe** level is used. Levels are **not added together**, so a long task list cannot take over the result.
- **Line 59** — add the points, capped at 100 (`Math.min`).
- **Line 60** — re-band the **adjusted** score using the same thresholds.
- **Lines 61–68** — return the full result: the original factors (`...baseRisk`), the **original self-report score kept as `baseScore`** (so it is never lost), the new score, band and message, and a `deadline` record of the counts, level and points.

**When it runs** (comment, lines 25–28): once, when a check-in is completed. The whole result, including the deadline counts, is **saved with the check-in**, so later changes to tasks do not rewrite past results.

**Example:** the worked example above (45, Moderate) plus one overdue task → "moderate" level, +12 → 57, still Moderate. With two overdue tasks → +20 → 65, still Moderate. With a base score of 50 and two overdue tasks → 70 → **Higher**.

---

## 11. "Why this result?" — `lib/explain.js`

This file creates the plain-language explanation shown under every result. **Every sentence is chosen by a fixed rule from the stored numbers**, so the explanation can always be traced back to the calculation. It is never generated text.

### 11.1 `rankFactorContributions(factors)` (lines 14–39)

```js
14  export function rankFactorContributions(factors) {
17    return Object.keys(PRESSURE_WEIGHTS)
20      .map(key => ({
21        key,
23        label: PRESSURE_LABELS[key],
26        value: factors[key],
29        contribution: factors[key] * PRESSURE_WEIGHTS[key],
32      }))
34      .sort((a, b) => b.contribution - a.contribution);
39  }
```

- **Line 17** — go through the five factor names, taken from the **same weights object** the score uses.
- **Lines 20–32** — for each factor, record its name, label, its 0–100 value, and its **contribution**: how many points it actually added to the score (value × weight).
- **Line 34** — sort largest contribution first.

It ranks by **contribution**, not raw value. For example, confidence at 100 contributes only 10 points (weight 0.10), while workload at 50 contributes 15 points (weight 0.30), so workload is the larger cause.

### 11.2 `resolveDeadlineInfo` (lines 47–68)

```js
47  function resolveDeadlineInfo(risk, tasks, now) {
52    if (risk.deadline) {
53      return risk.deadline;
54    }
56    const counts = countDeadlines(tasks, now);
62    return { ...counts, ...deadlineAdjustment(counts) };
68  }
```

Newer check-ins store their deadline information (Section 10.3), and that stored record is used (line 52). **Older** check-ins, saved before this feature existed, have none, so it is worked out from the **current** task list instead. This avoids migrating old data. The comment (lines 45–46) states the limitation honestly: for those old check-ins, the deadline lines describe the tasks **as they are now**, not as they were on that day.

### 11.3 `explainPressure(risk, tasks, now, { forSharing })` (lines 80–173)

```js
 80  export function explainPressure(risk, tasks = [], now = new Date(), { forSharing = false } = {}) {
 86    const bullets = [];
 88    const ranked = rankFactorContributions(risk.factors);
 93    if (ranked[0].contribution > 0) {
 96      bullets.push(`${ranked[0].label} was the largest contributor today.`);
 99    }
101    ranked.slice(1).forEach(f => {
104      if (f.value >= 60) {
105        bullets.push(`${f.label} increased the result.`);
108      } else if (!forSharing && f.value <= 20) {
112        bullets.push(`${f.label} had a smaller effect.`);
115      }
116    });
```

- **Line 88** — rank the factors.
- **Lines 93–99** — name the **largest** contributor, but only if it actually added something (all-zero answers produce no "largest contributor" line).
- **Lines 101–116** — for each of the other four factors:
  - value 60 or more → "*X* increased the result";
  - value 20 or less → "*X* had a smaller effect" (only on screen, not in the shared summary);
  - between 21 and 59 → no line, to keep the explanation short.

```js
118    const deadlineInfo = resolveDeadlineInfo(risk, tasks, now);
125    if (deadlineInfo.overdueCount === 1) { bullets.push('One assignment is overdue.'); }
132    else if (deadlineInfo.overdueCount > 1) { bullets.push(`${deadlineInfo.overdueCount} assignments are overdue.`); }
141    if (deadlineInfo.dueSoonCount === 1) { bullets.push('One assignment is due within 48 hours.'); }
148    else if (deadlineInfo.dueSoonCount > 1) { bullets.push(`${deadlineInfo.dueSoonCount} assignments are due within 48 hours.`); }
157    if (!forSharing && deadlineInfo.points > 0) {
161      bullets.push(`Upcoming deadlines added ${deadlineInfo.points} points to today's result.`);
164    }
166    if (!bullets.length) { bullets.push('No single factor stood out today.'); }
172    return bullets;
173  }
```

- **Lines 125–155** — factual deadline lines, with correct singular and plural wording ("One assignment is…" / "3 assignments are…").
- **Lines 157–164** — say how many points the deadlines added (on screen only).
- **Line 166** — if no rule produced a line, say so, so the list is never empty.
- **`forSharing`** (the comment on lines 76–79): the Support screen reuses this function to build a summary the student can send to a tutor. In that case the lines that only make sense next to the score ("had a smaller effect", "added N points") are left out.

**Example** for the worked example with one overdue task: "Task initiation was the largest contributor today." / "One assignment is overdue." / "Upcoming deadlines added 12 points to today's result." (Task initiation: 50 × 0.25 = 12.5, which beats workload: 33 × 0.30 = 9.9.)

---

## 12. Date rules — `lib/dates.js`

This file handles dates in a way designed for **time-blindness** (difficulty sensing how much time is left, common with ADHD). Tasks store a due **date**, not a time, so all comparisons are made in **whole days**.

```js
 8  function startOfDay(d) {
 9    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
10  }
12  export function parseDate(due) {
13    if (!due) return null;
14    const d = new Date(`${due}T00:00:00`);
15    return Number.isNaN(d.getTime()) ? null : d;
16  }
19  export function daysUntil(due, now = new Date()) {
20    const d = parseDate(due);
21    if (!d) return null;
22    const ms = startOfDay(d).getTime() - startOfDay(now).getTime();
23    return Math.round(ms / 86400000);
24  }
```

- **`startOfDay`** (lines 8–10) — the same date at midnight, so the time of day is ignored.
- **`parseDate`** (lines 12–16) — turns `"2026-10-05"` into a date. Adding `T00:00:00` **without** a time zone makes the browser read it as **local** midnight. Without it, `new Date("2026-10-05")` is read as midnight UTC, which can show as the **previous day** in time zones behind UTC. Invalid text returns `null`.
- **`daysUntil`** (lines 19–24) — whole days from today to the due date: negative means overdue, 0 means today. 86,400,000 is the number of milliseconds in a day. `Math.round` corrects the one-hour difference on days when the clocks change.

```js
29  export function relativeDueLabel(due, now = new Date()) {
30    const days = daysUntil(due, now);
31    if (days === null) return 'No due date';
32    if (days < 0) return days === -1 ? 'Overdue by 1 day' : `Overdue by ${Math.abs(days)} days`;
33    if (days === 0) return 'Due today';
34    if (days === 1) return 'Due tomorrow';
35    return `${days} days left`;
36  }
```

Turns the number of days into **calm, factual text**, for example "Due tomorrow" or "3 days left". The comment (lines 26–28) records the design rule: never flashing styles or shaming words ("you're late"). "Overdue by 2 days" states the fact without judgement. Relative wording ("3 days left") is easier to act on than a calendar date for someone who finds time hard to sense.

```js
38  export function isOverdue(due, now)       { const days = daysUntil(due, now); return days !== null && days < 0; }
44  export function isDueWithin48h(due, now)  { … return days !== null && days >= 0 && days <= 1; }
49  export function isDueWithinDays(due, days, now) { … return d !== null && d >= 0 && d <= days; }
```

Simple yes/no questions used by `pressure.js`. "Within 48 hours" means **today or tomorrow** (0 or 1 days), because there is no due time to measure 48 hours exactly.

```js
56  const URGENCY_ORDER = ['overdue', 'today', 'tomorrow', 'week', 'later', 'none'];
58  export function urgencyCategory(due, now = new Date()) {
59    const days = daysUntil(due, now);
60    if (days === null) return 'none';
61    if (days < 0) return 'overdue';
62    if (days === 0) return 'today';
63    if (days === 1) return 'tomorrow';
64    if (days <= 7) return 'week';
65    return 'later';
66  }
68  export function urgencyRank(due, now = new Date()) {
69    return URGENCY_ORDER.indexOf(urgencyCategory(due, now));
70  }
```

- **`urgencyCategory`** puts a date into one of six groups.
- **`urgencyRank`** turns the group into a number (0 = most urgent, 5 = no date), so tasks can be sorted by urgency. The grouping and the recommendation both use this one list, so they always agree (comment, lines 54–55).

```js
76  export function effectiveBucket(task, now = new Date()) {
77    if (!task.due) return task.bucket || 'later';
78    const cat = urgencyCategory(task.due, now);
79    if (cat === 'overdue' || cat === 'today' || cat === 'tomorrow') return 'today';
80    if (cat === 'week') return 'week';
81    return 'later';
82  }
```

Decides which tab (Today / Week / Later) a task appears under, **calculated from its due date every time**. A task created under "Later" therefore **moves to "Week" and then "Today" by itself** as the date gets closer. This helps with time-blindness because the student does not have to re-sort their list. Only a task with no due date uses the tab it was created under (line 77).

---

## 13. Choosing the one next step — `lib/recommendation.js`

**Why only one?** (comment, lines 5–8): a full to-do list can itself be the barrier. Deciding where to start is often the hardest part (*task initiation*). So Today and Overwhelmed Mode both show **one** task, chosen by the **same** function, so the student never sees two different "next steps".

```js
26  const PRIORITY_RANK = { high: 0, normal: 1, low: 2 };
28  function priorityRank(task) {
29    return PRIORITY_RANK[task.priority] ?? PRIORITY_RANK.normal;
30  }
32  function dueTimestamp(task) {
33    const d = parseDate(task.due);
34    return d ? d.getTime() : Infinity;
35  }
```

- **Line 26** — priorities as numbers; lower means more important.
- **Line 29** — `??` means "if missing, use normal priority".
- **Lines 32–35** — the due date as a number for sorting. Tasks with no date get `Infinity`, so they sort last.

```js
37  export function pickPriorityTask(tasks, now = new Date()) {
38    const open = tasks.filter(t => !t.done);
39    if (!open.length) return null;
40    return [...open].sort((a, b) => {
41      const urgency = urgencyRank(a.due, now) - urgencyRank(b.due, now);
42      if (urgency !== 0) return urgency;
43      const priority = priorityRank(a) - priorityRank(b);
44      if (priority !== 0) return priority;
45      return dueTimestamp(a) - dueTimestamp(b);
46    })[0];
47  }
```

This applies the rules **in a fixed order** (comment, lines 10–20):

1. **Line 38** — only tasks not yet done.
2. **Line 39** — none open → `null` (screens then show "Your plan is clear").
3. **Line 40** — `[...open]` copies the list so the original is not reordered.
4. **Lines 41–42** — sort by **urgency** first: overdue, today, tomorrow, this week, later, no date.
5. **Lines 43–44** — tie → the student's own **priority** (high, normal, low).
6. **Line 45** — still tied → the **earlier due date**.
7. Still tied → the original order is kept, because JavaScript's sort is *stable*. So the result only changes when the data changes.
8. **Line 46** — `[0]` takes the first task after sorting.

```js
52  export function recommendAction(tasks, band, now = new Date()) {
53    const task = pickPriorityTask(tasks, now);
54    if (!task) return null;
55    const stepText = task.currentStep?.text || 'Open this task and note one small first action.';
56    const actionText = band === 'Higher' ? `Just open "${task.title}". Nothing else is needed right now.` : stepText;
57    return { task, actionText };
58  }
```

Links the pressure score to the recommendation:
- **Line 53** — the task is chosen the same way whatever the band.
- **Line 55** — normally, the action is the task's current micro-step.
- **Line 56** — when pressure is **Higher**, the action becomes even smaller: *just open the task, nothing else*.

The key principle (comment, lines 22–24 and 49–51): **the pressure band changes how *small* the action is, never *which* task is chosen.** An urgent deadline is never hidden from a stressed student; it is just made easier to approach.

---

## 14. Micro-step templates — `lib/steps.js`

This file provides the **small first actions** that break big tasks down. They are **fixed templates**, not AI and not personalised. The task type only chooses which list of templates is used (comment, lines 1–12).

```js
14  export const TASK_TYPES = [
15    { id: 'general', label: 'General / other' },
16    { id: 'essay', label: 'Essay or written report' },
17    { id: 'presentation', label: 'Presentation' },
18    { id: 'exam', label: 'Exam revision' },
19    { id: 'lab', label: 'Lab report or practical' },
20    { id: 'group', label: 'Group project' },
21  ];
23  const ALTERNATIVE_STEPS = [
24    'Open the file or page and read only the title.',
25    'Write down one sentence about what this task needs.',
26    'Set a two-minute timer and do only the first small part.',
27  ];
```

- **Lines 14–21** — the six task types in the "Task type" drop-down.
- **Lines 23–27** — three very small, general steps offered by "Try a different step".

```js
32  const PROGRESSIONS = {
33    general: [ 'Open the file or page and read only the title.', 'Write or type just the first sentence.', 'Complete one small section or question.', 'Look back over what you have done so far.' ],
39    essay: [ 'Open a blank document and write only the title.', 'Write one sentence saying what the essay will argue.', 'List three points you might make, in any order.', 'Write the topic sentence for just one paragraph.', 'Read back what you have and note one thing to improve.' ],
      … presentation, exam, lab, group — five steps each
74  };
```

A **fixed sequence of steps for each task type**. Each list starts with the smallest possible action (usually just *open* something) and grows slowly. This is **graded task entry**: the first step is so small that starting feels possible.

```js
 76  function progressionFor(taskType) {
 77    return PROGRESSIONS[taskType] || PROGRESSIONS.general;
 78  }
 81  export function initialStepText(taskType) {
 82    return progressionFor(taskType)[0];
 83  }
 88  function stepId(taskId) {
 89    return `${taskId}-step-${crypto.randomUUID()}`;
 90  }
```

- **Lines 76–78** — the list for this task type, or the general list for an unknown type.
- **Lines 81–83** — the first step, given to every new task.
- **Lines 88–90** — makes a unique id such as `abc-step-1b9d6bcd-…`, so steps shown at the same time can be told apart. `crypto.randomUUID()` produces a random unique identifier, so ids stay unique **even after the app reloads**. An earlier version used a counter that restarted at 1 on every reload.

```js
 92  export function suggestAlternativeSteps(task) {
 93    return ALTERNATIVE_STEPS.map(text => ({ id: stepId(task.id), text, done: false, completedAt: null }));
 94  }
 96  export function makeCustomStep(task, text) {
 97    return { id: stepId(task.id), text: text.trim(), done: false, completedAt: null };
 98  }
106  export function nextStepAfter(task) {
107    const seq = progressionFor(task.taskType);
108    const currentIndex = seq.indexOf(task.currentStep?.text);
109    const next = seq[currentIndex + 1];
110    const text = next || 'Take a short break — you have made real progress today.';
111    return { id: stepId(task.id), text, done: false, completedAt: null };
112  }
```

- **`suggestAlternativeSteps`** — turns the three alternatives into step objects.
- **`makeCustomStep`** — a step in the student's **own words** (from "Edit"). `.trim()` removes extra spaces.
- **`nextStepAfter`** — the next step in the sequence:
  - **Line 108** — find where the current step is in the list by matching its text.
  - **Line 109** — take the one after it. If the student wrote their own step, `indexOf` returns −1, so −1 + 1 = 0 and the sequence **starts again at the first template**.
  - **Line 110** — at the end of the list, instead of asking for more, the app suggests **a short break** and recognises the progress made.

```js
118  export function withStep(task, step) {
119    return { ...task, currentStep: step };
120  }
122  export function withStepDone(task, done = true) {
123    return { ...task, currentStep: { ...task.currentStep, done, completedAt: done ? new Date().toISOString() : null } };
124  }
```

The **in-memory** versions of the store's step updates. Because Firestore mode returns nothing from those functions (Section 7.1), screens use these to apply the same change to their copy of the data.

---

## 15. Trends across check-ins — `lib/patterns.js`

This file looks across **several** past check-ins for real patterns. Its main rule is **caution**: a single day is never described as a trend. Each function needs a minimum amount of data and a clear difference before it says anything.

```js
14  function checkinDate(c) {
15    return new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt);
16  }
```

Reads a check-in's date whether it is a Firestore timestamp (`{ seconds }`) or text.

```js
23  export function mostFrequentContributor(checkins, sampleSize = 8) {
24    const scored = checkins.filter(c => c.risk && c.risk.factors).slice(0, sampleSize);
25    if (scored.length < 3) return null;
27    const counts = {};
28    for (const c of scored) {
29      const top = rankFactorContributions(c.risk.factors)[0];
30      if (top.contribution > 0) counts[top.key] = (counts[top.key] || 0) + 1;
31    }
32    const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
33    if (!ranked.length) return null;
35    const [key, count] = ranked[0];
36    if (count < Math.ceil(scored.length / 2)) return null;
37    return { factor: key, label: LABELS[key], count, of: scored.length };
38  }
```

Finds which factor was **most often** the largest cause.
- **Line 24** — only scored check-ins (incomplete ones are skipped), newest 8.
- **Line 25** — fewer than 3 → not enough data, say nothing.
- **Lines 28–31** — for each check-in, find its top factor (using the same ranking as the explanation) and count it.
- **Line 32** — sort the factors by how often they were top.
- **Line 36** — the winner must be top in **at least half** of the check-ins. Winning 2 of 5 is not a pattern, just the most common of five similar options.

```js
44  export function dayOfWeekPattern(checkins) {
45    const scored = checkins.filter(c => c.risk);
46    if (scored.length < 6) return null;
48    const byDay = {};
49    for (const c of scored) {
50      const d = checkinDate(c);
51      if (Number.isNaN(d.getTime())) continue;
52      const day = d.getDay();
53      (byDay[day] ||= []).push(c.risk.score);
54    }
55    const daysWithEnough = Object.entries(byDay).filter(([, scores]) => scores.length >= 2);
56    if (daysWithEnough.length < 2) return null;
58    const averages = daysWithEnough
59      .map(([day, scores]) => ({ day: Number(day), avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
60      .sort((a, b) => b.avg - a.avg);
61    const highest = averages[0];
62    const lowest = averages[averages.length - 1];
63    if (highest.avg - lowest.avg < 15) return null;
65    return { highestDay: DAY_NAMES[highest.day], highestAvg: Math.round(highest.avg), lowestDay: DAY_NAMES[lowest.day], lowestAvg: Math.round(lowest.avg) };
69  }
```

Compares the average score on different **days of the week**.
- **Line 46** — needs at least 6 scored check-ins.
- **Lines 49–54** — group scores by weekday (0 = Sunday). `||=` creates the list the first time a day is seen. Invalid dates are skipped (line 51).
- **Line 55** — only days with **at least 2** check-ins count.
- **Line 56** — at least 2 such days are needed to compare.
- **Lines 58–60** — the average score for each day, highest first.
- **Line 63** — the difference must be **at least 15 points**. Anything smaller is treated as noise.

```js
75  export function buildPatternInsights(checkins) {
76    const insights = [];
77    const freq = mostFrequentContributor(checkins);
78    if (freq) insights.push(`${freq.label} has been your largest contributor on ${freq.count} of your last ${freq.of} check-ins.`);
79    const dow = dayOfWeekPattern(checkins);
80    if (dow) insights.push(`Your workload pressure tends to be higher on ${dow.highestDay}s (average ${dow.highestAvg}) than ${dow.lowestDay}s (average ${dow.lowestAvg}).`);
81    return insights;
82  }
```

Builds the sentences shown on the Progress screen. If there is not enough data it returns an **empty list**, and the section simply does not appear. The comment (lines 71–74) explains why there is no "not enough data yet" message: that could feel like pressure to check in more often.

```js
90  export function orderByUsage(items, usageCounts, idKey = 'id') {
91    return [...items].sort((a, b) => (usageCounts[b[idKey]] || 0) - (usageCounts[a[idKey]] || 0));
92  }
```

Puts the Overwhelmed Mode options the student has **used most** at the top, which means fewer decisions at the moment deciding is hardest. Because the sort is stable, a student with no history sees the original order.

---

## 16. Small helpers

### 16.1 `lib/modules.js` — module names and colours

```js
 6  const STARTER_MODULES = ['Dissertation', 'Other'];
 8  export function availableModules(tasks = []) {
 9    const used = tasks.map(t => t.module).filter(Boolean);
10    const unique = [...new Set([...STARTER_MODULES, ...used])];
12    return unique.filter(m => m !== 'Other').concat(unique.includes('Other') ? ['Other'] : []);
13  }
```

- **Line 9** — collect every module name the student has used, dropping empty ones (`filter(Boolean)`).
- **Line 10** — join them with the starter list and remove duplicates (`new Set`).
- **Line 12** — move "Other" to the end, so it reads as a catch-all.

The module chips therefore **grow from the student's own tasks** without any extra storage.

```js
21  const NAMED_MODULE_COLORS = { Dissertation: 'amber', 'Database Systems': 'purple', 'HCI Group Project': 'teal', 'Web Development': 'blue' };
27  const FALLBACK_PALETTE = ['purple', 'teal', 'amber', 'blue'];
29  export function moduleColor(name) {
30    if (NAMED_MODULE_COLORS[name]) return NAMED_MODULE_COLORS[name];
31    let hash = 0;
32    for (let i = 0; i < (name || '').length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
33    return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
34  }
```

Gives each module a soft colour so the student can tell modules apart at a glance. Known modules have fixed colours. For any other name, lines 31–33 compute a **hash**: a number calculated from the letters (`× 31 + character code` is a classic string hash; `>>> 0` keeps it a positive whole number). `% 4` then picks one of four colours. The same name **always gets the same colour**, with nothing stored.

### 16.2 `lib/greeting.js`

```js
 4  export function timeOfDayGreeting(now = new Date()) {
 5    const hour = now.getHours();
 6    if (hour < 12) return 'Good morning';
 7    if (hour < 18) return 'Good afternoon';
 8    return 'Good evening';
 9  }
12  export function displayNameOrFallback(displayName) {
13    const trimmed = (displayName || '').trim();
14    return trimmed || 'there';
15  }
```

The greeting on Today follows the real clock. If the student gave no name, the app says "How are things feeling, **there**?" instead of inventing or guessing a name. (`avatarInitial`, lines 17–20, returns the first letter of the name, or a dot.)

### 16.3 `lib/timer.js`

```js
3  export function formatSeconds(totalSeconds) {
4    const safe = Math.max(0, Math.round(totalSeconds));
5    const m = Math.floor(safe / 60);
6    const s = safe % 60;
7    return `${m}:${String(s).padStart(2, '0')}`;
8  }
```

Turns seconds into `m:ss` (for example 125 → `2:05`). `padStart(2, '0')` adds the leading zero. Negative numbers become 0. It is a separate pure function so it can be tested without running a real timer.

### 16.4 `lib/authErrors.js`

```js
14  const MESSAGES = {
15    'auth/invalid-credential': "The email or password doesn't match. Please check and try again.",
16    'auth/wrong-password':     "The email or password doesn't match. Please check and try again.",
17    'auth/user-not-found':     "The email or password doesn't match. Please check and try again.",
18    'auth/invalid-email': 'Check that your email address is written correctly.',
19    'auth/email-already-in-use': 'An account already exists with this email. Try logging in instead.',
20    'auth/weak-password': 'Choose a password with at least 6 characters.',
21    'auth/too-many-requests': 'There have been several attempts. Please try again shortly.',
22    'auth/network-request-failed': "We couldn't connect right now. Your information hasn't been changed.",
      …
26  };
28  const DEFAULT_MESSAGE = 'Something went wrong. Please try again in a moment.';
30  export function authErrorMessage(error, fallback = DEFAULT_MESSAGE) {
31    return MESSAGES[error?.code] || fallback;
32  }
```

Firebase error codes (such as `auth/wrong-password`) are written for developers. This table turns them into **calm, specific messages** for students. Two design points:

- **Security:** lines 15–17 give the **same** message for "wrong password" and "no such account". Different messages would let someone test which email addresses have accounts (*account enumeration*).
- **Reassurance:** the network error says "Your information hasn't been changed", because anxious users often worry that something was lost.

Line 31 looks up the code and falls back to a general message for anything unknown.

---

## 17. The Calm Mode sound — `lib/calmSound.js`

A soft, continuous background sound, **generated in code** with the Web Audio API (no audio file). The comment (lines 9–19) is careful: Nuvora **does not claim it treats or calms ADHD**. It is offered because some people find a steady sound helps them settle and block out distractions. It is entirely optional, only starts from a tap, can always be stopped from the header (WCAG 1.4.2), fades in and out, and can be switched off in Settings.

```js
21  const CHORD = [
22    { freq: 196.0, gain: 0.5 },   // G3
23    { freq: 293.66, gain: 0.35 }, // D4
24    { freq: 392.0, gain: 0.15 },  // G4, quietest
25  ];
26  const DETUNE_CENTS = 4;
27  const MASTER_GAIN = 0.035;
28  const BREATH_HZ = 1 / 12;
29  const BREATH_DEPTH = 0.3;
30  const FADE_IN = 2.5;
31  const FADE_OUT = 1.2;
33  let current = null;
```

- **Lines 21–25** — three low notes that form a soft, open chord (G–D–G). Each is quieter than the one below it.
- **Line 26** — each note is played twice, slightly out of tune (±4 cents), which gives a warm "chorus" effect.
- **Line 27** — overall volume: very quiet, so it stays in the background.
- **Lines 28–29** — the volume rises and falls by ±30% once every 12 seconds, like slow breathing.
- **Lines 30–31** — fade-in and fade-out times in seconds.
- **Line 33** — the sound currently playing, or `null`. Keeping it in one place means it can never play twice.

```js
41  export function startCalmSound() {
42    if (current) return true;
43    try {
44      const AudioCtx = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
45      if (!AudioCtx) return false;
46      const ctx = new AudioCtx();
47      const now = ctx.currentTime;
49      const filter = ctx.createBiquadFilter();
50      filter.type = 'lowpass';
51      filter.frequency.value = 900;
53      const master = ctx.createGain();
54      master.gain.setValueAtTime(0.0001, now);
55      master.gain.exponentialRampToValueAtTime(MASTER_GAIN, now + FADE_IN);
56      filter.connect(master);
57      master.connect(ctx.destination);
60      const breath = ctx.createOscillator();
61      const breathDepth = ctx.createGain();
62      breath.frequency.value = BREATH_HZ;
63      breathDepth.gain.value = MASTER_GAIN * BREATH_DEPTH;
64      breath.connect(breathDepth);
65      breathDepth.connect(master.gain);
67      const sources = [breath];
68      for (const { freq, gain } of CHORD) {
69        for (const detune of [-DETUNE_CENTS, DETUNE_CENTS]) {
70          const osc = ctx.createOscillator();
71          const g = ctx.createGain();
72          osc.type = 'sine';
73          osc.frequency.value = freq;
74          osc.detune.value = detune;
75          g.gain.value = gain / 2;
76          osc.connect(g);
77          g.connect(filter);
78          sources.push(osc);
79        }
80      }
81      for (const s of sources) s.start(now);
83      current = { ctx, master, sources };
84      return true;
85    } catch {
86      current = null;
87      return false;
88    }
89  }
```

The Web Audio API works like connecting boxes with cables: sound sources → effects → speakers.

- **Line 42** — already playing → do nothing.
- **Lines 44–46** — create an audio context (the "sound system"). `webkitAudioContext` supports older Safari. No audio support → return `false` quietly.
- **Lines 49–51** — a **low-pass filter** removes frequencies above 900 Hz, taking away any harsh or bright sound.
- **Lines 53–57** — the **master volume**. It starts almost silent and rises smoothly to full over 2.5 seconds (a fade-in, so the sound never starts suddenly). The chain is: filter → master volume → speakers.
- **Lines 60–65** — the **"breathing"**: a very slow *oscillator* (a wave generator at 1/12 Hz, one cycle every 12 seconds) connected to the master **volume control** itself, so it gently pushes the volume up and down.
- **Lines 68–80** — for each of the 3 notes, two slightly detuned **sine-wave** oscillators (the purest, softest tone), each through its own volume control into the filter. That is 6 tone sources.
- **Line 81** — start everything at the same moment.
- **Line 83** — remember what is playing, so it can be stopped.
- **Lines 85–88** — if anything fails (for example, the browser blocks audio), return `false` and let the app carry on silently.

```js
 93  export function stopCalmSound() {
 94    if (!current) return;
 95    const { ctx, master, sources } = current;
 96    current = null;
 97    try {
 98      const now = ctx.currentTime;
 99      master.gain.cancelScheduledValues(now);
100      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
101      master.gain.exponentialRampToValueAtTime(0.0001, now + FADE_OUT);
102      for (const s of sources) s.stop(now + FADE_OUT + 0.05);
103      setTimeout(() => { ctx.close().catch(() => {}); }, (FADE_OUT + 0.3) * 1000);
104    } catch {
105      try { ctx.close(); } catch { /* already closed */ }
106    }
107  }
```

- **Line 94** — nothing playing → nothing to do, so it is always safe to call.
- **Line 96** — mark as stopped **straight away**, so a fast second tap can start a new sound cleanly.
- **Lines 99–101** — cancel any fade still in progress, then fade the volume down over 1.2 seconds. An "exponential" ramp cannot reach exactly 0, so it goes to 0.0001, which cannot be heard.
- **Line 102** — stop the oscillators just after the fade ends.
- **Line 103** — then close the audio context to free the phone's audio hardware.
- **Lines 104–106** — if something goes wrong, close immediately.


---

# Part E — Screens

Every screen is a React function component in `components/screens/`. Most screens follow the same **save pattern**, which is worth understanding once:

```js
async function doSomething() {
  if (busy) return;                 // 1. ignore double taps
  setBusy(true); setError('');      // 2. show "Saving…", clear old errors
  try {
    await storeFunction(uid, …);    // 3. save first, and wait
    setData(d => ({ …changed copy… }));  // 4. only then update the shared data
    setStatus('Saved.');            // 5. only then say it worked
  } catch {
    setError(GENERIC_ERROR);        // 6. calm error; nothing on screen changed
  } finally {
    setBusy(false);                 // 7. always re-enable the button
  }
}
```

`setData(d => …)` uses the *functional form*: React passes in the **latest** data, which avoids losing a change if two updates happen close together.

## 18. Splash, LoadError and Onboarding

### 18.1 `Splash.jsx`

```js
6  export function Splash() {
7    return <main><section className="phone splash"><Mascot size={110} /><Logo /><p>A calmer way to move forward.</p></section></main>;
8  }
```

The waiting screen shown while sign-in is checked or data loads: the cloud mascot, the logo and a calm tagline. No spinner, to keep it quiet.

### 18.2 `LoadError.jsx`

```js
 9  export function LoadError({ onRetry, onSignOut }) {
10    const headingRef = useRef(null);
11    useEffect(() => { headingRef.current?.focus(); }, []);
12    return <main><section className="phone splash">
13      <Mascot size={90} mood="neutral" />
14      <h1 ref={headingRef} tabIndex={-1} style={{ textAlign: 'center' }}>We couldn't load your study space.</h1>
15      <p>Your data hasn't been changed.</p>
16      <button className="primary" onClick={onRetry}>Try again</button>
17      <button className="link" onClick={onSignOut}>Sign out</button>
18    </section></main>;
19  }
```

- **Lines 10–11 and 14** — when the screen appears, keyboard and screen-reader **focus moves to the heading**, so a screen-reader user hears straight away what happened. `tabIndex={-1}` makes a heading focusable by code but not by the Tab key.
- **Line 13** — the mascot has a neutral face, not a worried one.
- **Line 15** — honest reassurance: loading only **reads** data, so nothing can have been lost.
- **Lines 16–17** — two ways forward: retry, or sign out.

### 18.3 `Onboarding.jsx`

```js
 6  const ONBOARDING_SCREENS = [
 7    { title: 'Move forward without pressure', text: 'Nuvora helps turn academic overload into one manageable next step.' },
 8    { title: 'Support, not diagnosis', text: 'Check-ins help Nuvora suggest study support. They are not medical assessments or diagnoses.' },
 9    { title: 'You stay in control', text: 'Your tasks and check-ins stay private to your account and are not automatically shared with your university.' },
10  ];
15  export function Onboarding({ onDone }) {
16    const [step, setStep] = useState(0);
17    const screen = ONBOARDING_SCREENS[step];
18    const last = step === ONBOARDING_SCREENS.length - 1;
      …
23    <p className="sr-only">Step {step + 1} of {ONBOARDING_SCREENS.length}</p>
24    <div className="row" … aria-hidden="true">
25      {ONBOARDING_SCREENS.map((_, i) => <span key={i} style={{ … background: i === step ? 'var(--purple)' : 'var(--purple-soft)' }} />)}
26    </div>
27    <button className="primary" onClick={() => (last ? onDone() : setStep(s => s + 1))}>{last ? 'Get started' : 'Continue'}</button>
28    {!last && <button className="link" onClick={onDone}>Skip</button>}
```

- **Lines 6–10** — three short screens that set expectations: the **purpose**, that it is **not a diagnosis**, and **privacy**. It is kept to three on purpose, not a long carousel.
- **Line 16** — which screen is showing.
- **Line 18** — whether this is the last screen.
- **Line 23** — `sr-only` text is invisible but read by screen readers ("Step 2 of 3").
- **Lines 24–26** — the progress dots are for sighted users only, so they are hidden from screen readers (the text on line 23 already gives that information).
- **Line 27** — "Continue" moves forward; on the last screen "Get started" calls `onDone`, which saves the "seen" flag (Section 5.7).
- **Line 28** — "Skip" is always available, so the student is never forced through.

---

## 19. `Auth.jsx` — log in, sign up, reset password

```js
13  export function Auth() {
14    const [mode, setMode] = useState('login'); // login | signup | reset
15    const [email, setEmail] = useState(''), [password, setPassword] = useState('');
16    const [displayName, setDisplayName] = useState('');
17    const [error, setError] = useState(''), [busy, setBusy] = useState(false);
18    const [resetEmail, setResetEmail] = useState('');
19    const [resetStatus, setResetStatus] = useState({ text: '', tone: 'status' });
```

One component with **three modes**. Every text box is a *controlled input*: its value lives in state and is updated on every key press.

### 19.1 `submit(e)` — log in or create an account (lines 21–42)

```js
21  async function submit(e) {
22    e.preventDefault();
23    if (busy) return;
24    setBusy(true);
25    setError('');
26    try {
27      if (mode === 'login') {
28        await signInWithEmailAndPassword(auth, email, password);
29      } else {
30        const credential = await createUserWithEmailAndPassword(auth, email, password);
33        if (displayName.trim()) {
34          await saveSettings(credential.user.uid, { displayName: displayName.trim() });
35        }
36      }
37    } catch (err) {
38      setError(authErrorMessage(err));
39    } finally {
40      setBusy(false);
41    }
42  }
```

- **Line 22** — stop the browser's default form submit, which would reload the page.
- **Line 28** — log in with Firebase. If this works, Firebase fires the listener in `NuvoraApp` (line 139), which sets `user`, which loads the data and shows the app. **This component does not need to navigate anywhere itself.**
- **Line 30** — create a new account.
- **Lines 33–35** — save the optional display name. The comment notes that **nothing identifying** is asked for: no surname and no student id (data minimisation).
- **Line 38** — any error becomes a calm message (Section 16.4).

### 19.2 `submitReset(e)` — password reset (lines 48–66)

```js
48  async function submitReset(e) {
      …
53    const REASSURING_MESSAGE = 'If an account exists for this email, password-reset instructions have been sent.';
54    try {
55      await sendPasswordResetEmail(auth, resetEmail);
56      setResetStatus({ text: REASSURING_MESSAGE, tone: 'status' });
57    } catch (err) {
58      if (err.code === 'auth/user-not-found') {
59        setResetStatus({ text: REASSURING_MESSAGE, tone: 'status' });
60      } else {
61        setResetStatus({ text: authErrorMessage(err), tone: 'error' });
62      }
```

- **Line 55** — Firebase sends the reset email.
- **Lines 58–59** — if **no account exists**, the app shows **the same** message as when one does. This stops the reset form being used to discover which emails are registered (the same protection as Section 16.4).

### 19.3 The forms (lines 68–134)

- **Lines 68–94** — the reset screen: one email field and "Back to log in".
- **Lines 113–116** — two tab buttons, "Log in" and "Sign up", with `aria-pressed` so screen readers announce which is selected. Switching clears any old error.
- **Line 119** — the email field has `type="email"` (the phone shows the email keyboard) and `autoComplete="email"` (password managers can fill it in).
- **Line 120** — the password field uses `autoComplete="current-password"` when logging in and `"new-password"` when signing up, so password managers offer to save or generate a password. `minLength="6"` matches Firebase's minimum. In sign-up mode, `aria-describedby="password-hint"` links the field to the "At least 6 characters." hint (line 121), so screen readers read the hint with the field.
- **Line 122** — the optional display name field, clearly labelled "(optional)", with the placeholder "You can skip this".
- **Line 123** — "Forgot password?" copies the email already typed into the reset form.
- **Line 125** — the submit button shows "Please wait…" and is disabled while busy.
- **Lines 107–108** — the welcome text: "No shame. No pressure. One step at a time." sets a supportive tone from the first screen.

---

## 20. `Today.jsx` — the home screen

Today shows the latest pressure result (or an invitation to check in), a button into Overwhelmed Mode, and **one** recommended next step. When Calm Mode is on, it replaces the whole dashboard with simpler views.

### 20.1 Working out what to show (lines 36–59)

```js
36  export function Today({ data, go, uid, setData, settings, updateSettings, settingsBusy, calmSession, setCalmSession, pausedThisSession, setPausedThisSession, restartAcknowledged, setRestartAcknowledged, showCalmExit, setShowCalmExit }) {
37    const [calmSettingsOpen, setCalmSettingsOpen] = useState(false);
40    const risk = data.checkins[0]?.risk;
41    const recommendation = recommendAction(data.tasks, risk?.band);
42    const restartMemory = settings.restartMemory;
43    const restartTask = restartMemory
44      ? data.tasks.find(t => t.id === restartMemory.taskId && !t.done && !t.currentStep?.done)
45      : null;
46    const hasValidRestart = Boolean(restartMemory && restartTask);
```

- **Line 40** — the **latest** check-in's result (check-ins are stored newest first). If it was incomplete, `risk` is `null`, and Today simply invites a new check-in.
- **Line 41** — the one recommended task and action (Section 13), made smaller if pressure is Higher.
- **Lines 42–46** — the "Stop for now" **restart point**. It only counts as valid if its task **still exists, is not done, and its step is not done**. A restart point for a finished or deleted task is ignored.

```js
51  const calmTaskTitle = hasValidRestart
52    ? restartMemory.taskTitle || restartTask?.title || recommendation?.task?.title
53    : recommendation?.task?.title;
55  const calmInstruction = hasValidRestart
56    ? restartMemory.stepText
57    : calmSession.hideDeadlines
58      ? 'Make one small update. You can stop whenever you need.'
59      : recommendation?.actionText;
```

What Calm Mode shows:
- If there is a restart point, use its saved task and step, so the student resumes exactly where they stopped.
- Otherwise, if "Hide time pressure" is on, use a wording with **no time pressure at all** (lines 57–58), so the text does not contradict the student's choice.
- Otherwise, the normal recommended action.

### 20.2 Calm Mode actions (lines 61–90)

```js
61  async function stopForNow() {
62    if (!recommendation || settingsBusy) return;
64    const restartPoint = {
65      taskId: recommendation.task.id,
66      taskTitle: recommendation.task.title,
67      stepText: recommendation.actionText,
68      stoppedAt: new Date().toISOString(),
69    };
72    if (!(await updateSettings({ ...settings, restartMemory: restartPoint }))) return;
73    setRestartAcknowledged(false);
74    setPausedThisSession(true);
75  }
```

**"Stop for now"** gives the student permission to stop, and saves their place.
- **Lines 64–69** — record the task, the step and the time.
- **Line 72** — save it **with the settings**, so it survives closing the app. `updateSettings` returns `false` if the save failed, and then the function stops, so **"Your place is saved" is only shown when it really is saved**.
- **Line 74** — show the "You can stop here" view.

```js
77  async function clearRestartMemory() {
79    if (!(await updateSettings({ ...settings, restartMemory: null }))) return;
80    setRestartAcknowledged(false);
81  }
83  async function leaveCalmMode(destination = 'today') {
85    if (!(await updateSettings({ ...settings, calmMode: false }))) return;
86    setShowCalmExit(false);
87    setPausedThisSession(false);
88    setRestartAcknowledged(false);
89    go(destination);
90  }
```

- **`clearRestartMemory`** — forget the restart point ("Use today's suggestion instead" / "Dismiss").
- **`leaveCalmMode`** — switch Calm Mode off, reset the session views, and go to Today or Tasks, as the student chose.

```js
94  const focusTaskId = recommendation?.task.id;
95  const todaysTasks = data.tasks.filter(t => effectiveBucket(t) === 'today' && !t.done && t.id !== focusTaskId).slice(0, 3);
```

Other tasks due today, **leaving out** the recommended one (it already has its own card) and showing **at most 3**, to keep the screen short.

### 20.3 The five views, checked in order

Like the guards in `NuvoraApp`, Today checks conditions in order and returns the first view that matches (comment, lines 23–31).

**View 1 — Leaving Calm Mode (lines 97–130)**, when `showCalmExit` is true. The heading is "How would you like to come back?", with the reassurance "Nothing will be marked complete. Any saved restart point will stay available." and three choices: *Return to Today*, *Show my tasks*, *Stay in Calm Mode*. Leaving Calm Mode is a **gentle, reversible choice**, not an abrupt switch back to the full dashboard.

**View 2 — Paused (lines 132–163)**, after "Stop for now": "**You can stop here.** Your place is saved. Nuvora will not ask you to do anything else unless you choose to continue." It shows the saved restart point, "Continue from here", and "Leave Calm Mode". This gives **explicit permission to rest**, which can reduce guilt about stopping.

**View 3 — Welcome back (lines 165–192)**, when Calm Mode is on, a valid restart point exists and it has not yet been acknowledged: "**You already have a safe place to restart.**" It shows the saved task and step **before** anything new, with "Continue from here", "Use today's suggestion instead" and "Leave Calm Mode". This supports resuming work after an interruption, which is often hard.

**View 4 — Calm Mode focus (lines 200–296)**, when Calm Mode is on and there is a task. The whole dashboard collapses to:
- a small "Calm Mode is on" header;
- **one card**: "YOUR NEXT SMALL STEP", the task title and the instruction (lines 215–228);
- **two main buttons**: "Open my plan" and "Stop for now" (lines 220–227);
- a folded "Adjust calm settings" panel (lines 230–280) with the **four temporary preferences** as switches. Each one updates only the session state, e.g. `setCalmSession(current => ({ ...current, hideDeadlines: v }))`. `aria-expanded` and `aria-controls` tell screen readers whether the panel is open and which element it controls;
- "Leave Calm Mode".

The comment (lines 194–199) describes the principle: **genuine Calm Mode is not just a colour change. It reduces the number of decisions to one.** Nothing is deleted or disabled; the full plan is one tap away.

**View 5 — The normal dashboard (lines 298–339):**

```js
299  {hasValidRestart && <article className="panel" …>
300    <small>RESTART POINT SAVED</small>
301    <h2>Pick up where you left off</h2>
       …
308        onClick={async () => { if (await updateSettings({ ...settings, calmMode: true })) setRestartAcknowledged(true); }}
312        Continue gently
314      <button className="link" … onClick={clearRestartMemory}>Dismiss</button>
316  </article>}
```

- **Lines 299–316** — if a restart point exists while Calm Mode is off, offer "**Continue gently**". This switches Calm Mode on (which also starts the sound, since this is a tap) and goes straight to the saved step.

```js
317  <div className="welcome welcome-card">
319    <small>{timeOfDayGreeting().toUpperCase()}</small>
320    <h1>How are things feeling, {displayNameOrFallback(settings.displayName)}?</h1>
      …
324  {!risk
325    ? <button className="checkin-card" onClick={() => go('checkin')}>
326        <div><b>Check in when it would help</b><span>A few gentle questions · skip anytime</span></div> …
329    : <RiskCard risk={risk} tasks={data.tasks} onUpdate={() => go('checkin')} hideNumbers={settings.calmMode && calmSession.hideProgressNumbers} />}
330  <button className="overwhelmed" onClick={() => go('overwhelmed')}><Heart /> I'm feeling overwhelmed</button>
331  <div className="section-title"><h2>One small next step</h2><button onClick={() => go('tasks')}>View plan</button></div>
332  {recommendation ? <FocusTask key={recommendation.task.id} task={recommendation.task} actionText={recommendation.actionText} uid={uid} setData={setData} /> : (
333    data.tasks.length === 0
334      ? <div className="empty"><Leaf /><h2>Your space is ready.</h2> … + Add one task … Take a short check-in first</div>
335      : <Empty title="Your plan is clear" text="That is enough for today." />
336  )}
337  {todaysTasks.length > 0 && <h2>{focusTaskId ? 'Also on today's plan' : 'Today's plan'}</h2>}
338  {todaysTasks.map(t => <MiniTask key={t.id} task={t} />)}
```

- **Lines 317–320** — greeting by time of day and name.
- **Lines 324–329** — no result yet → an **invitation** ("Check in *when it would help*… skip anytime"), not a demand. Otherwise, the result card.
- **Line 330** — the "**I'm feeling overwhelmed**" button is always on the home screen, one tap away.
- **Line 332** — the focused task. `key={recommendation.task.id}` makes React create a **fresh** card when the recommended task changes, so any half-finished edit from the previous task does not carry over.
- **Lines 333–335** — two different empty states: a **new** student gets "Your space is ready. Add one thing that's currently on your mind. It doesn't need to be your biggest task."; a student who has finished everything gets "**Your plan is clear.** That is enough for today."
- **Lines 337–338** — up to three other tasks for today.

### 20.4 `RiskCard` (lines 344–367)

```js
344  function RiskCard({ risk, tasks, onUpdate, hideNumbers = false }) {
345    const explanation = explainPressure(risk, tasks);
346    return <article className={`risk ${risk.band.toLowerCase()}`}>
347      {!hideNumbers && <div className="score" aria-hidden="true">{risk.score}</div>}
      …
349      <h3>Workload pressure · {risk.band}</h3>
350      <p>{risk.message}</p>
352      <button className="risk-update" onClick={onUpdate}> … Update workload pressure … Take a new check-in …
360      <details>
361        <summary>Why this result?</summary>
362        {!hideNumbers && <p className="hint">Pressure estimate: {risk.score}/100 — a supportive estimate, not a diagnosis.</p>}
363        <ul className="explanation-list">{explanation.map((line, i) => <li key={i}>{line}</li>)}</ul>
364      </details>
```

- **Line 345** — build the explanation lines (Section 11).
- **Line 346** — the CSS class `risk low` / `risk moderate` / `risk higher` sets the card colour. The palette uses teal and warm amber, **never alarm red** (Section 30).
- **Line 347** — the big number is hidden when Calm Mode hides numbers. It is `aria-hidden` because the same number is read out in the explanation (line 362), so screen readers do not hear it twice.
- **Lines 360–364** — the explanation is inside `<details>`, a built-in **show/hide** element. It is *progressive disclosure*: the explanation is always available but does not crowd the screen. Every result says clearly that it is **not a diagnosis**.

### 20.5 `FocusTask` — the recommended task card (lines 374–437)

```js
374  function FocusTask({ task, actionText, uid, setData }) {
375    const [mode, setMode] = useState('view'); // view | editing | choosing
376    const [draftText, setDraftText] = useState(task.currentStep?.text || '');
377    const [busy, setBusy] = useState(false);
378    const [status, setStatus] = useState({ text: '', tone: 'status' });
379    const stepDone = task.currentStep?.done;
383    async function run(persist, patch, successText) {
384      if (busy) return;
385      setBusy(true);
386      setStatus({ text: '', tone: 'status' });
387      try {
388        await persist();
389        setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === task.id ? patch(t) : t)) }));
390        setStatus({ text: successText, tone: 'status' });
391        setMode('view');
392      } catch {
393        setStatus({ text: GENERIC_ERROR, tone: 'error' });
394      } finally {
395        setBusy(false);
396      }
397    }
```

- **Line 375** — the card has three modes: viewing, editing the step, or choosing an alternative step.
- **Lines 383–397 — `run(persist, patch, successText)`** is a small **reusable helper** for the save pattern. Each button passes in:
  - `persist`: a function that saves to storage;
  - `patch`: a function that makes the same change to a task in memory;
  - `successText`: the message to show.

  Line 389 applies `patch` **only to this task** in the shared list. This one helper replaces four near-copies of the same try/catch code.

The buttons (lines 404–434):

| Button | `persist` | `patch` | Message |
|---|---|---|---|
| **Save** (editing) | `setCurrentStep(uid, id, makeCustomStep(task, draftText))` | `withStep` | "Step updated." |
| A suggested alternative | `setCurrentStep(uid, id, alt)` | `withStep` | "Step updated." |
| **Mark this step done** | `completeCurrentStep(...)`, then `recordStepCompleted(...)` | `withStepDone` | "Saved. That step is done — the assignment stays open until you choose to complete it." |
| **Generate next step** | `setCurrentStep(uid, id, nextStepAfter(task))` | `withStep` | "Here is a next small step." |

Details:
- **Line 409** — "Save" is disabled if the edit is empty (`!draftText.trim()`).
- **Lines 421–425 — "Mark this step done":**
  ```js
  422  await completeCurrentStep(uid, task.id, true);
  424  await recordStepCompleted(uid).then(() => setData(d => ({ ...d, stats: withStepCounted(d.stats) })), () => {});
  ```
  First the step is saved as done. Then the "small steps taken" count is increased. The count is **secondary**: `.then(success, () => {})` catches and ignores a failure of the counter, so a counting problem can **never** make the student think their step was not saved (comment, line 423).
- The success message on line 425 **explains the data model to the student**: completing a step does **not** complete the assignment.
- **Lines 431–434** — once the step is done, the card shows "Step complete" and "Generate next step" (Section 14).

**`MiniTask`** (lines 439–444) is a small read-only row showing a task's title, due label and current step.

---

## 21. `Tasks.jsx` — the plan

### 21.1 `TaskForm` — add and edit form (lines 17–48)

```js
17  function TaskForm({ initial, tasks, onCancel, onSave, saving }) {
18    const [module, setModule] = useState(initial?.module || 'Dissertation');
19    const [addingModule, setAddingModule] = useState(false);
20    const [customModule, setCustomModule] = useState('');
21    const chips = availableModules(tasks);
23    return <form className="panel" onSubmit={e => {
24      e.preventDefault();
25      const f = new FormData(e.currentTarget);
26      onSave({ title: f.get('title'), module, due: f.get('due'), priority: f.get('priority'), taskType: f.get('taskType') });
27    }}>
28      <label>Task name<input name="title" defaultValue={initial?.title} required autoFocus /></label>
      …
33          <button key={m} type="button" data-color={moduleColor(m)} className={`module-chip ${module === m ? 'selected' : ''}`} onClick={() => { setModule(m); setAddingModule(false); }}>{m}</button>
35          <button type="button" … onClick={() => setAddingModule(true)}>+ New module</button>
37      {addingModule && <input type="text" placeholder="Type a module name" value={customModule} onChange={e => { setCustomModule(e.target.value); setModule(e.target.value || 'Other'); }} … />}
39      <label>Due date<input name="due" type="date" defaultValue={initial?.due} /></label>
40      <label>Priority<select name="priority" defaultValue={initial?.priority || 'normal'}>…</select></label>
41      <label>Task type<select name="taskType" defaultValue={initial?.taskType || 'general'}>…</select></label>
42      {!initial && <p className="hint">Nuvora will suggest a small first step based on the task type.</p>}
45      <button className="primary" disabled={saving || !module.trim()}>{saving ? 'Saving…' : (initial ? 'Save changes' : 'Add task')}</button>
```

The same form is used for **adding** (no `initial`) and **editing** (`initial` is the task).
- **Line 18** — the chosen module is kept in state, because it is picked with chip buttons rather than a normal input.
- **Line 21** — the module chips grow from the student's own tasks (Section 16.1).
- **Lines 25–26** — `FormData` reads the named fields (title, due, priority, taskType) when the form is submitted. These are *uncontrolled inputs*: the browser keeps their values, which is simpler for a short form.
- **Line 28** — `required` stops an empty title. `autoFocus` puts the cursor in the title box straight away.
- **Line 33** — each chip has its module colour; the selected chip is highlighted.
- **Lines 35–37** — "+ New module" shows a text box for a new module name.
- **Line 39** — `type="date"` shows the phone's own date picker.
- **Line 41** — the task type decides the first micro-step (line 42 explains this to the student).

### 21.2 State and grouping (lines 58–69)

```js
58  export function Tasks({ data, uid, setData, calmMode, calmSession = CALM_SESSION_DEFAULTS }) {
59    const [tab, setTab] = useState('today');
60    const [adding, setAdding] = useState(false);
61    const [editingId, setEditingId] = useState(null);
62    const [saving, setSaving] = useState(false);
63    const [busyIds, setBusyIds] = useState(() => new Set());
64    const [error, setError] = useState('');
65    const [undo, setUndo] = useState(null); // { id, title }
66    const [showAllTabs, setShowAllTabs] = useState(false);
67    const addTaskTriggerRef = useRef(null);
68    const editTaskTriggerRef = useRef(null);
69    const filtered = data.tasks.filter(t => effectiveBucket(t) === tab);
```

- **Line 63 — `busyIds`** is a **set of task ids currently being saved**. Only **that task's** buttons are disabled, so the student can still work on other tasks meanwhile.
- **Line 65 — `undo`** remembers the last task marked complete, for the Undo link.
- **Lines 67–68** — refs to the buttons that opened the add or edit panel, so focus can return to them when the panel closes.
- **Line 69** — the tasks for the current tab, grouped **by due date** (Section 12).

### 21.3 Creating, editing, completing and deleting (lines 71–150)

```js
71  async function create(fields) {
73    const task = {
74      title: fields.title, module: fields.module, due: fields.due, priority: fields.priority,
78      taskType: fields.taskType || 'general',
79      bucket: tab,
80      done: false,
81      currentStep: { id: crypto.randomUUID(), text: initialStepText(fields.taskType), done: false, completedAt: null },
82    };
      …
86      const saved = await addTask(uid, task);
87      setData(d => ({ ...d, tasks: [saved, ...d.tasks] }));
88      setAdding(false);
```

- **Line 79** — `bucket` records the tab the task was created under, used only if it has no due date.
- **Line 81** — **every new task starts with a first micro-step** from its type (Section 14), so the student never faces a big task with no starting point.
- **Lines 86–88** — save, add to the top of the shared list, close the form.

```js
 96  async function saveEdit(id, fields) {
       …
103      await updateTask(uid, id, fields);
104      setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === id ? { ...t, ...fields } : t)) }));
105      setEditingId(null);
```

Editing changes only the task's own fields. Line 104 merges them into the in-memory copy, because `updateTask` returns nothing in Firebase mode (comment, lines 101–102).

```js
113  async function runOnTask(id, action) {
114    if (busyIds.has(id)) return;
115    setBusyIds(s => new Set(s).add(id));
116    setError('');
117    try {
118      await action();
119    } catch {
120      setError(GENERIC_ERROR);
121    } finally {
122      setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
123    }
124  }
```

A per-task version of the save pattern: add the id to the busy set, run the action, then remove it. Lines 115 and 122 create a **new** Set each time, because React only notices a change when it receives a new object.

```js
126  async function toggle(t) {
127    await runOnTask(t.id, async () => {
128      await toggleTask(uid, t.id, !t.done);
129      setData(d => ({ ...d, tasks: d.tasks.map(x => (x.id === t.id ? { ...x, done: !x.done } : x)) }));
130      setUndo(!t.done ? { id: t.id, title: t.title } : null);
131    });
132  }
134  async function undoComplete() { … await toggleTask(uid, id, false); … }
144  async function remove(t) {
145    if (!window.confirm(`Delete "${t.title}"? This cannot be undone.`)) return;
       …
147      await removeTask(uid, t.id);
148      setData(d => ({ ...d, tasks: d.tasks.filter(x => x.id !== t.id) }));
```

- **`toggle`** marks the **whole assignment** done or not done. When a task is marked **complete**, an **Undo** link appears (line 130), so a mis-tap is easy to fix.
- **`remove`** asks for confirmation first (line 145), because a deletion cannot be undone.

### 21.4 Rendering (lines 154–199)

- **Lines 155–160** — the page title with a "+" button (`aria-label="Add task"`).
- **Lines 161–163** — in **Calm Mode**, only the Today tab is shown, with a "Show week & later" link. Otherwise, three tabs.
- **Lines 165–167** — the undo message, with `role="status"` so it is announced.
- **Lines 168–186** — each task row:
  - a round check button whose `aria-label` names the task ("Mark Submit ethics form as done") and whose `aria-pressed` says whether it is done;
  - the module and, **unless Calm Mode hides time pressure**, the due label and "High priority" (line 176);
  - the title;
  - the current step, and the edit and delete buttons, **unless Calm Mode reduces detail** (lines 179–185).
- **Line 187** — an empty tab says "Nothing here yet. Add one task when you are ready."
- **Lines 191–198** — add and edit open in an `AccessibleSheet` (Section 29), a focused full-screen panel with proper keyboard handling.

---

## 22. `Checkin.jsx` — the daily check-in

### 22.1 The questions (lines 13–23)

```js
13  const questions = [
18    { id: 'mood', title: 'How is your workload feeling today?', max: 4, low: 'Calm', high: 'Very overwhelming', options: ['Calm & in control', 'Manageable', 'Heavier than usual', 'Very overwhelming'] },
19    { id: 'sleep', title: 'How rested do you feel?', max: 5, low: 'Low energy', high: 'Well rested' },
20    { id: 'focus', title: 'How easy is it to focus right now?', max: 5, low: 'Hard to focus', high: 'Easy to focus' },
21    { id: 'initiation', title: 'How easy is it to start tasks today?', max: 5, low: 'Hard to start', high: 'Easy to start' },
22    { id: 'confidence', title: 'How confident do you feel about this week?', max: 5, low: 'Not confident', high: 'Confident' },
23  ];
```

Five short questions, defined as **data**, so one piece of code can draw them all. Each has an `id` (matching the score schema), a `title`, the number of options (`max`) and labels for the two ends of the scale. The first question uses **worded options** instead of bare numbers because it is a different kind of question. Each option still saves the value 1–4, so the scoring is unchanged (comment, lines 14–17).

### 22.2 State (lines 37–53)

```js
37  export function Checkin({ uid, data, setData, go, draft, setDraft, hideNumbers = false }) {
38    const [risk, setRisk] = useState(null);
39    const [incomplete, setIncomplete] = useState(false);
40    const [error, setError] = useState('');
41    const [submitting, setSubmitting] = useState(false);
42    const { step, answers } = draft;
43    const q = questions[step];
44    const scaleRef = useRef(null);
45    const resultHeadingRef = useRef(null);
51    useEffect(() => {
52      if (incomplete || risk) resultHeadingRef.current?.focus();
53    }, [incomplete, risk]);
```

- **Line 42** — the current question number and the answers come from the **draft held by `NuvoraApp`** (Section 5.3), so leaving and coming back does not lose them.
- **Line 43** — the current question.
- **Lines 51–53** — when the result appears, focus moves to its heading, so screen-reader users know the screen has changed.

### 22.3 Answering and moving on (lines 55–111)

```js
55  function setAnswer(value) {
56    setDraft(d => ({ ...d, answers: { ...d.answers, [q.id]: value } }));
57    setError('');
58  }
59  function resetDraft() { setDraft({ step: 0, answers: {} }); }
61  async function next() {
62    if (submitting) return;
63    if (answers[q.id] === undefined) return setError('Choose the option that feels closest, or "Not sure".');
64    if (step < questions.length - 1) return setDraft(d => ({ ...d, step: d.step + 1 }));
```

- **Line 56** — save this question's answer into the draft, keeping all the others.
- **Line 63** — nothing chosen → a gentle prompt that mentions the "Not sure" option.
- **Line 64** — not the last question → go to the next one.

```js
69    const hasUnsure = questions.some(qq => answers[qq.id] === 'unsure');
70    if (hasUnsure) {
71      setSubmitting(true);
72      try {
73        await saveCheckin(uid, { answers, risk: null, incomplete: true });
74        setData(d => ({ ...d, checkins: [{ answers, risk: null, incomplete: true, createdAt: new Date().toISOString() }, ...d.checkins] }));
75        setIncomplete(true);
76      } catch {
77        setError("We couldn't save that. Please try again.");
78      } finally { setSubmitting(false); }
81      return;
82    }
```

**An important ethical decision.** If **any** answer is "Not sure", the app does **not** invent a neutral value to fill the gap. It saves the check-in as **incomplete** with **no result** (`risk: null`) and tells the student so plainly (comment, lines 66–68). A score calculated from guessed data could be misleading.

```js
 84    setSubmitting(true);
 85    setError('');
 86    try {
 92      const r = calculatePressure(answers);
 97      const combined = combineWorkloadPressure(r, data.tasks);
102      await saveCheckin(uid, { answers, risk: combined });
103      setData(d => ({ ...d, checkins: [{ answers, risk: combined, createdAt: new Date().toISOString() }, ...d.checkins] }));
104      setRisk(combined);
105    } catch (err) {
106      console.error('Unable to complete check-in:', err);
107      setError("We couldn't save your check-in just now. Your answers are still here — please try again.");
108    } finally {
109      setSubmitting(false);
110    }
111  }
```

This is the **full data flow of a check-in**:

1. **Line 92** — calculate the self-report score (Section 9). This happens **on the device**. The comment (lines 87–91) gives the reasons: the static build has no server; the answers never have to leave the device just to be scored; scoring works offline and in the phone apps; and a pure function has no network failure point.
2. **Line 97** — add the deadline adjustment from the current tasks (Section 10).
3. **Line 102** — **save first**.
4. **Line 103** — add the new check-in to the **front** of the shared list, so Today, Progress and Support all show it immediately.
5. **Line 104** — only now show the result. The student is **never told a check-in was recorded when it was not** (comment, lines 99–101).
6. **Line 107** — if saving fails, the answers are kept in the draft, and the message says so.

### 22.4 The three views (lines 113–162)

**Incomplete (lines 113–117):** "**That's okay.** Some answers were 'Not sure', so Nuvora hasn't worked out a workload-pressure band today. Your answers are saved, and your next small step is still on Today."

**Result (lines 119–131):** the band ("Moderate pressure"), the message, "This result is not a diagnosis. It only helps Nuvora adjust today's support.", the "Why this result?" explanation, and:

```js
129  <button className="primary" onClick={() => { resetDraft(); go(risk.band === 'Higher' ? 'overwhelmed' : 'today'); }}>Choose my next step</button>
```

A **Higher** result leads **straight to Overwhelmed Mode's** smaller choices; otherwise back to Today. The draft is cleared for next time.

**The question (lines 133–162):**

```js
135  <button className="back" onClick={() => (step ? setDraft(d => ({ ...d, step: d.step - 1 })) : go('today'))}><ChevronLeft /> Back</button>
136  <button className="link" onClick={() => go('today')}>Exit for now</button>
138  <div className="progressbar" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={questions.length} aria-valuetext={`Question ${step + 1} of ${questions.length}`} aria-label="Check-in progress">
139    <span style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
140  </div>
143  <div ref={scaleRef} role="radiogroup" aria-label={q.title} onKeyDown={e => handleRadiogroupKeyDown(e, scaleRef, [...Array.from({ length: q.max }, (_, i) => i + 1), 'unsure'], answers[q.id], setAnswer)}>
      …
153        <button key={n} role="radio" aria-checked={answers[q.id] === n} data-value={n} tabIndex={answers[q.id] === n || (answers[q.id] === undefined && n === 1) ? 0 : -1} onClick={() => setAnswer(n)} …>{n}</button>
      …
158    <button role="radio" aria-checked={answers[q.id] === 'unsure'} data-value="unsure" … onClick={() => setAnswer('unsure')}>Not sure / prefer not to answer</button>
161  <button className="primary bottom" disabled={submitting} onClick={next}>{submitting ? 'Saving…' : 'Continue'}</button>
```

- **Line 135** — "Back" goes to the previous question, or leaves on the first one.
- **Line 136** — "**Exit for now**" leaves at any time without losing answers.
- **Lines 138–140** — a progress bar with full ARIA information, so screen readers say "Question 2 of 5".
- **Line 143** — the answer buttons form an **ARIA radio group**: they look like custom buttons but behave like radio buttons for assistive technology. `onKeyDown` adds arrow-key movement (Section 29.6).
- **Line 153** — each option has `role="radio"` and `aria-checked`. The `tabIndex` logic is the *roving tabindex* pattern: only **one** option in the group can be reached with Tab (the selected one, or the first if none is selected); the arrow keys move between the rest.
- **Line 158** — **every question** has "Not sure / prefer not to answer".
- **One question per screen** means only one decision at a time (comment, lines 25–28).

---

## 23. `Overwhelmed.jsx` — Overwhelmed Mode

Instead of giving more information, Overwhelmed Mode asks the student **what is getting in the way**, and offers **one matching, smaller action** for the same task Today recommends.

```js
14  const BARRIERS = [
15    { id: 'start', label: 'I do not know where to start' },
16    { id: 'big', label: 'The task feels too big' },
17    { id: 'energy', label: 'I have very low energy' },
18    { id: 'reset', label: 'I need a short reset' },
19    { id: 'support', label: 'I need to ask someone for help' },
20  ];
21  const QUICK_RESET = { title: 'A 2-minute breathing reset', text: 'Slow your breathing for two minutes — in for four counts, out for six. There is nothing else to do right now.' };
```

The five barriers, written in the student's own voice ("I…"), and a simple breathing prompt.

| Barrier | What is offered | What is saved |
|---|---|---|
| Where to start | "Just open *task*. Nothing else needed." | The current micro-step is marked done. |
| Too big | Choose one of three smaller steps. | The chosen step becomes the current step, already done. |
| Low energy | An optional 2-minute timer: "You have permission to stop the moment this ends." | The current micro-step is marked done. |
| Short reset | A breathing prompt. | Nothing about the task. |
| Ask for help | An editable message the student copies. | Nothing is sent. |

**None of these ever marks the whole assignment done** (comment, line 35).

### 23.1 Setup (lines 39–64)

```js
39  export function Overwhelmed({ data, uid, setData, go, settings }) {
40    const [barrier, setBarrier] = useState(null);
41    const [done, setDone] = useState(false);
42    const [chosenAlt, setChosenAlt] = useState(null);
43    const [supportMessage, setSupportMessage] = useState('');
      …
47    const task = pickPriorityTask(data.tasks);
54    const orderedBarriers = orderByUsage(BARRIERS, data.stats.strategyUses);
60    useEffect(() => {
61      if (barrier === 'support' && task) {
62        setSupportMessage(`Hi${settings?.supportPersonName ? ` ${settings.supportPersonName}` : ''} — I'm finding "${task.title}" difficult to manage right now and could use a hand. Could we talk it through?`);
63      }
64    }, [barrier, task, settings]);
```

- **Line 47** — the **same task** as Today, chosen by the same function, so the two screens never disagree.
- **Line 54** — the barriers the student has **used most move to the top** (Section 15).
- **Lines 60–64** — when "Ask for help" is chosen, pre-fill a message. If a support person is set in Settings, it greets them by name ("Hi Dr Smith — …"). The message is placed in an editable box, so the student stays in control of the wording.

### 23.2 Actions (lines 68–105)

```js
68  function countStrategy(id) {
69    return recordStrategyUse(uid, id).then(() => setData(d => ({ ...d, stats: withStrategyCounted(d.stats, id) })), () => {});
70  }
74  async function markDone(persist, patch) {
75    if (busy) return;
76    if (!task) { setDone(true); return; }
      …
80      await persist();
81      setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === task.id ? patch(t) : t)) }));
82      if (barrier) await countStrategy(barrier);
83      setDone(true);
```

- **`countStrategy`** — record that a strategy was **actually used** (not just looked at), for the Progress screen and for ordering. Like the step counter, a failure is ignored.
- **`markDone`** — the same save pattern as `FocusTask.run`. **Line 76**: if the student has **no open tasks**, the action still finishes calmly without saving anything, so the screen never breaks.

```js
 91  async function continueAfterReset() { await countStrategy('reset'); go('today'); }
 96  async function copySupportMessage() {
 99      await navigator.clipboard.writeText(supportMessage);
100      await countStrategy('support');
101      setCopyStatus({ text: 'Copied. Nothing is sent automatically.', tone: 'status' });
102    } catch {
103      setCopyStatus({ text: "We couldn't copy that automatically — you can select and copy the text above.", tone: 'error' });
```

The help message is copied to the student's **own clipboard**. Nuvora **never sends anything** by itself. If copying fails (some browsers block it), the student is told how to copy the text by hand.

### 23.3 Rendering (lines 107–160)

- **Lines 107–112** — after an action: "**One step down.** That is genuinely enough for right now." The app **does not push for more**.
- **Lines 115–117** — the mascot looks gently worried, and the heading reads "Let's make everything smaller. What is making this difficult right now?"
- **Lines 118–122** — the barriers as an accessible radio group with arrow-key support.
- **Lines 124–155** — one panel for the chosen barrier:
  - "big": `!chosenAlt` → show three alternatives; once one is picked, show it with "I did this" (line 134), which saves it as the current step with `done: true`.
  - "energy": a `FocusTimer` of 120 seconds (Section 29.5).
- **Line 158** — "**Not now**" always leaves.
- **Line 159** — "No shame. You've got this."

---

## 24. `Learn.jsx` — practical strategies

Learn offers practical tools for common study barriers. The student picks the problem that feels closest and gets **one matching tool**, not a long article. All wording is fixed. Tools that change the plan only replace or complete the **current micro-step**, never the whole assignment. The parking lot, if–then plan and sensory choice are kept **only in memory for this visit** and never saved (comment, lines 14–22).

### 24.1 Saving a suggested step (lines 39–60)

```js
39  async function persistSuggestedStep(text, statusSetter = setSupportStatus) {
40    if (!task || busy) return;
41    setBusy(true);
42    statusSetter({ text: '', tone: 'status' });
43    try {
44      const nextStep = makeCustomStep(task, text);
45      await setCurrentStep(uid, task.id, nextStep);
50      setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === task.id ? { ...t, currentStep: nextStep } : t)) }));
54      statusSetter({ text: 'Saved as your next step for this task.', tone: 'status' });
       …
```

Used by several tools to make a suggested action **the task's real next step**. `statusSetter` lets each tool show its message next to its own buttons.

### 24.2 The six support routes (lines 108–251)

```js
108  const supportChoices = [
109    { id: 'start', icon: '🚪', title: 'I can't start', text: 'Make beginning tiny.' },
110    { id: 'big', icon: '🧩', title: 'This feels too big', text: 'Choose one smaller piece.' },
111    { id: 'energy', icon: '🔋', title: 'I have very low energy', text: 'Lower the demand.' },
112    { id: 'sensory', icon: '🌿', title: 'I'm overstimulated', text: 'Reduce input before work.' },
113    { id: 'company', icon: '👥', title: 'I need company', text: 'Work alongside someone.' },
114    { id: 'unsure', icon: '💭', title: 'I don't know what I need', text: 'Use a three-question helper.' },
115  ];
```

`renderSupportPanel()` (lines 117–251) shows the panel for the chosen route:

| Route | Strategy | What the code does |
|---|---|---|
| **Can't start** (120–136) | *Implementation intention* ("When I open the work, I will find one place to continue"). | Shows an if–then cue for the real task and a button to open the plan. "No timer is required." |
| **Too big** (138–153) | *Task decomposition*: see only the next three actions. | Three buttons, each saving a specific next step for the real task ("Add one useful point to *task*"). |
| **Low energy** (155–172) | *Effort matching*: choose Tiny / Enough / Full. | Tiny saves "Open *task* and leave it ready for later"; Enough keeps the current step; Full opens the plan. "I did the current step" marks it done and counts it (`markLowEnergyDone`, lines 67–81). |
| **Overstimulated** (174–201) | *Sensory regulation* before work. | Five choices (quieter place, lower brightness, pause notifications, headphones, phone out of sight). The choice is **not saved**. "No task work is required." |
| **Need company** (203–211) | *Body doubling*: working alongside someone. | Copies a ready-written message asking someone to join a call (`copyBodyDoubleMessage`, lines 83–95) and offers an optional "Study With Me" video link. |
| **Don't know** (213–250) | A three-question **matcher**. | Three drop-downs; `helperRecommendation()` (lines 97–104) picks a route. |

```js
 97  function helperRecommendation() {
 98    const { brain, environment, task: taskFeeling } = helperAnswers;
 99    if (!brain || !environment || !taskFeeling) return null;
100    if (environment === 'overwhelming') return 'sensory';
101    if (brain === 'tired') return 'energy';
102    if (taskFeeling === 'big' || taskFeeling === 'unclear') return 'big';
103    return 'start';
104  }
```

A **fixed decision rule**. The order matters: an overwhelming environment is dealt with **first** (it is hard to work in any way while overstimulated), then low energy, then task size, and otherwise a launch step.

### 24.3 More study tools (lines 253–425)

Hidden behind "Show more study tools" (lines 390–397, `aria-expanded`), to keep the first view short:

- **Focus Sprint** (lines 269–287) — the student **chooses the length** (2, 5, 10 or 15 minutes). `key={focusSprintMinutes}` on the timer makes React create a **new** timer when the length changes, so it resets correctly. "The timer is optional support, not the goal."
- **Distraction Parking Lot** (lines 289–317) — type an unrelated thought and "park" it so it no longer has to be held in mind (reduces working-memory load). It is stored **only in memory** and "not added to your task list".
- **If–Then Plan** (lines 319–336) — two boxes ("When…", "I will…") build a sentence live: "When I open my dissertation document, I will find the testing section and add one point."
- **Visual Step Map** (lines 338–347) — three actions for the real task, and "Use step 1 as my next step".

- **Line 350** — `const [pick, ...rest] = allActivities;` takes the first tool out as the featured one and keeps the others in `rest`.
- **Lines 410–422** — each of the other tools is a numbered, colour-coded card that opens with `<details>`.

**Reset Space** (lines 374–385) — optional links to NHS Every Mind Matters, the ADHD Foundation and the National Autistic Society, opened with `ExternalLink` (Section 29.4). It is clearly labelled as optional and "not a replacement for professional support".

---

## 25. `Progress.jsx` and `Reflection.jsx`

### 25.1 Progress

Progress is designed to be **reflective, not motivating through pressure**: no streaks, targets, grades or "missed day" counts (comment, lines 13–19).

```js
20  export function Progress({ data, settings, updateSettings, settingsBusy, go, calmSession = CALM_SESSION_DEFAULTS }) {
21    const totalStrategyUses = Object.values(data.stats.strategyUses).reduce((a, b) => a + b, 0);
22    const usedStrategies = Object.entries(data.stats.strategyUses).filter(([, n]) => n > 0);
23    const [showTrends, setShowTrends] = useState(false);
24    const showProgressNumbers = !(settings.calmMode && calmSession.hideProgressNumbers);
26    if (settings.hideProgress) {
27      return <> … <Empty title="Progress is hidden" text="You've chosen not to see these details right now. That's completely fine." />
30        <button … onClick={() => updateSettings({ ...settings, hideProgress: false })}>Show progress again</button>
```

- **Line 21** — add up all strategy uses (`reduce` sums a list).
- **Line 22** — only strategies used at least once are listed.
- **Line 24** — numbers are shown unless Calm Mode hides them.
- **Lines 26–31** — the student can **hide Progress completely**, and the message confirms this is "completely fine".

```js
46  {data.checkins.slice(0, 7).map((c, i) => {
47    const dateLabel = new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt || Date.now()).toLocaleDateString();
48    if (!c.risk) return <div className="trend" …><span>{dateLabel}</span><span className="incomplete-tag">Incomplete</span></div>;
52    return <details className="trend-entry" …>
53      <summary className="trend"><span>{dateLabel}</span><div><i style={{ width: showProgressNumbers ? `${c.risk.score}%` : '100%' }} /></div><b>{showProgressNumbers ? c.risk.score : c.risk.band}</b></summary>
54      <ul className="explanation-list">{explainPressure(c.risk, data.tasks).map((line, j) => <li key={j}>{line}</li>)}</ul>
55    </details>;
```

- **Line 46** — the last 7 check-ins.
- **Line 47** — the date, from a Firestore timestamp or text, in the student's local format.
- **Line 48** — incomplete check-ins are shown as "Incomplete", not hidden or counted as zero.
- **Line 53** — a small bar whose width is the score (a simple bar chart made with CSS). When numbers are hidden, a full-width bar and the band name are shown instead.
- **Line 54** — each day's explanation opens on tap. Seven full explanations at once would be too much to read (comment, lines 49–51).

The rest of the screen:
- **Lines 64–68** — three neutral totals: check-ins so far, small steps taken, strategies used.
- **Lines 37–40** — pattern sentences, only when there is enough data (Section 15).
- **Lines 70–72** — in Calm Mode, the trends are folded behind "Show trends & strategies".
- **Line 73** — the link to Weekly reflection.
- **Line 74** — "Hide these details".

### 25.2 Reflection

```js
 9  const REFLECTION_PROMPTS = [
10    { id: 'manageable', label: 'What felt manageable this week?' },
11    { id: 'hard', label: 'What would help make next week a little easier?' },
12  ];
16  const RECENT_COUNT = 5;
      …
33  async function save() {
35    if (!answers.manageable.trim() && !answers.hard.trim()) {
36      setStatus({ text: 'Write as much or as little as feels useful — at least one answer helps.', tone: 'error' });
37      return;
38    }
      …
42      const saved = await saveReflection(uid, answers);
43      setData(d => ({ ...d, reflections: [saved, ...d.reflections] }));
44      setAnswers({ manageable: '', hard: '' });
45      setStatus({ text: 'Saved. Thank you for taking a moment for this.', tone: 'status' });
```

- **Lines 9–12** — two gentle prompts. The first looks at **what went well**; the second looks **forward** ("what would help"), rather than asking what went wrong.
- **Line 35** — at least one answer is needed, but both are optional.
- **Lines 42–45** — save, add to the top of the list, clear the boxes, and thank the student.
- **Lines 69–77** — past reflections show "Manageable:" and "Would help:", plus a plain `text` field for older entries created by the seed scripts.
- **Lines 78–80** — only the **5 most recent** are shown at first; "Show older reflections (N)" reveals the rest, so nothing is hidden silently.
- The heading text states: "Nothing here is scored or shared."

---

## 26. `Support.jsx` — a summary the student controls

This screen helps a student **explain their situation to a tutor or support service** without having to find the words while overwhelmed.

```js
14  export function Support({ data, settings, go, calmMode = false }) {
15    const risk = data.checkins[0]?.risk;
17    const explanation = risk ? explainPressure(risk, data.tasks, new Date(), { forSharing: true }) : [];
18    const summary = risk ? [
19      `Right now I'm experiencing ${risk.band.toLowerCase()} study pressure.`,
20      '',
21      "What I'm finding difficult:",
22      ...explanation.map(line => `- ${line}`),
23      '',
24      'What could help:',
25      '- Clarifying the nearest deadline',
26      '- Help identifying one priority',
27      '- Breaking the first action down',
28    ].join('\n') : '';
```

- **Line 17** — the explanation in **sharing mode** (Section 11.3), without score-only lines.
- **Lines 18–28** — the summary is built from **fixed sentences plus the explanation lines**; nothing is generated. `.join('\n')` joins the lines with line breaks, and the empty strings make blank lines. Written in the **first person** ("I'm experiencing…") so it can be sent as it is. "What could help" gives the tutor **concrete, practical requests**.

Example output:

```
Right now I'm experiencing moderate study pressure.

What I'm finding difficult:
- Task initiation was the largest contributor today.
- One assignment is overdue.

What could help:
- Clarifying the nearest deadline
- Help identifying one priority
- Breaking the first action down
```

- **Lines 30–38** — "Copy summary" copies to the clipboard only. **Nothing is sent automatically.**
- **Lines 47–49** — in Calm Mode the summary is folded away until asked for.
- **Line 50** — the button is disabled until there is a check-in.
- **Lines 54–70** — links to Settings, the support person, and Privacy.
- **Lines 72–75** — a permanent notice: "**Need urgent help?** Nuvora is not an emergency or healthcare service. Contact your university support service, NHS 111, or emergency services when appropriate." This is an important **safeguarding** boundary.

---

## 27. `SettingsPage.jsx`

```js
11  export function SettingsPage({ value, busy, error, onChange, back }) {
12    const [saved, setSaved] = useState('');
16    async function saveText(field, text) {
17      if (text === (value[field] || '')) return;
18      setSaved('');
19      if (await onChange({ ...value, [field]: text })) setSaved('Saved.');
20    }
```

- `onChange` is `updateSettings` from `NuvoraApp` (Section 5.9).
- **Lines 16–20 — `saveText`** — text fields save **when the student leaves the field** (`onBlur`), and **only if the value changed** (line 17). There is no Save button to remember; a quiet "Saved." confirms it.

The controls:
- **Line 28** — display name ("Optional — used only for a friendly greeting").
- **Line 30** — Calm Mode switch.
- **Line 31** — calming-sound switch. `checked={value.calmTone !== false}` treats a missing value as **on**, matching the default.
- **Line 32** — Reduced motion.
- **Line 34** — text size: Standard (1), Medium (1.15), Large (1.3), as a group of buttons with `aria-pressed`.
- **Lines 35–44** — support person name and note, with the reassurance "**Nuvora never contacts anyone.**"
- **Line 45** — shows the error if there is one, otherwise "Saved.".

Each switch is the shared `Setting` component (Section 29.3).

---

## 28. `Privacy.jsx` — privacy and data controls

The screen puts **plain-language explanations first, then the controls**. Each delete option removes **exactly** what its label says, every one asks for confirmation, and the two "everything" options also require typing **DELETE**.

### 28.1 `downloadJson` (lines 12–22)

```js
12  function downloadJson(obj, filename) {
13    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
14    const url = URL.createObjectURL(blob);
15    const a = document.createElement('a');
16    a.href = url;
17    a.download = filename;
18    document.body.appendChild(a);
19    a.click();
20    a.remove();
21    URL.revokeObjectURL(url);
22  }
```

The standard browser technique for downloading a file created in code:
- **Line 13** — turn the data into nicely formatted JSON text (`null, 2` means indent by 2 spaces) inside a *Blob* (a file held in memory).
- **Line 14** — create a temporary web address for it.
- **Lines 15–19** — create an invisible link with a `download` filename, add it to the page and click it.
- **Lines 20–21** — remove the link and free the memory.

### 28.2 Actions (lines 46–134)

```js
46  function run(name, action, successText) {
47    if (busy) return;
48    setBusy(name);
      …
50    return action()
51      .then(() => setStatus({ text: successText, tone: 'status' }))
52      .catch(() => setStatus({ text: GENERIC_ERROR, tone: 'error' }))
53      .finally(() => setBusy(null));
54  }
```

The save pattern again. `busy` holds the **name** of the running action, so only that button says "Deleting…" while all the buttons are disabled.

| Handler | Lines | Steps |
|---|---|---|
| `handleExport` | 56–69 | `exportAllData` → download `nuvora-data-export-YYYY-MM-DD.json`. |
| `handleDeleteCheckins` | 71–77 | Confirm → `deleteCheckinHistory` → clear check-ins and reflections in memory. |
| `handleDeleteCompleted` | 79–85 | Confirm → `deleteCompletedTasks` → keep only open tasks in memory. |
| `handleDeleteAll` | 87–99 | Must type DELETE → confirm → `deleteAllData` → clear memory → **save default settings**. |
| `handleDeleteAccount` | 101–134 | Must type DELETE **and** enter the password → confirm → **re-authenticate** → delete all data → delete account. |

```js
 88  if (confirmAll.trim().toUpperCase() !== 'DELETE') {
 89    setStatus({ text: 'Type DELETE in the box to confirm.', tone: 'error' });
 90    return;
 91  }
```

Typing DELETE is **deliberate friction** for an action that cannot be undone. `.trim().toUpperCase()` accepts " delete " as well.

```js
122  await reauthenticate(password);
123  await deleteAllData(uid);
124  setData(d => ({ ...d, tasks: [], checkins: [], reflections: [], stats: defaultStats }));
125  await deleteAccount();
```

The **safe order** described in Section 6.5. The comment (lines 115–121) explains: if the password check fails, **nothing has been touched yet**. After `deleteAccount`, Firebase signs the user out, `onAuthStateChanged` notices, and the app returns to the login screen automatically.

### 28.3 Explanations (lines 140–159)

Five folded sections in plain language: *What Nuvora stores*, *How your information is used*, *Who can see your information* (the text changes between Firebase and demo mode, line 149), *Offline and shared devices*, and *About the workload-pressure result* ("**not a diagnosis** of ADHD, autism, burnout, or any condition"). These put the principle of **transparency** from data-protection law into practice. The "Delete your account" section (line 185) only appears in Firebase mode, because demo mode has no account.


---

# Part F — Shared UI, styling, testing and mobile

## 29. Shared UI components — `components/ui/`

Small components reused across many screens, so each behaviour (especially accessibility behaviour) is written **once**.

### 29.1 `Drawer.jsx` — the accessible side menu

```js
 9  export function Drawer({ open, onClose, triggerRef, children }) {
10    const drawerRef = useRef(null);
11    const firstFocusableRef = useRef(null);
13    useEffect(() => {
14      if (!open) return undefined;
15      const triggerEl = triggerRef.current;
16      firstFocusableRef.current?.focus();
17      function onKeyDown(e) {
18        if (e.key === 'Escape') { onClose(); return; }
19        if (e.key !== 'Tab' || !drawerRef.current) return;
20        const focusable = drawerRef.current.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
21        if (!focusable.length) return;
22        const first = focusable[0], last = focusable[focusable.length - 1];
23        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
24        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
25      }
26      document.addEventListener('keydown', onKeyDown);
27      return () => {
28        document.removeEventListener('keydown', onKeyDown);
29        if (triggerEl?.isConnected) triggerEl.focus();
30      };
31    }, [open, onClose, triggerRef]);
33    if (!open) return null;
34    return <>
35      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
36      <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu" ref={drawerRef}>
37        <button className="icon close" ref={firstFocusableRef} onClick={onClose} aria-label="Close menu"><X /></button>
38        {children}
39      </div>
40    </>;
41  }
```

This follows the **WAI-ARIA modal dialog pattern**:
- **Line 15** — remember the button that opened the menu.
- **Line 16** — when the menu opens, **move focus into it** (onto the close button).
- **Line 18** — **Escape closes** it.
- **Lines 19–24** — a **focus trap**: Tab from the last item wraps to the first, and Shift+Tab from the first wraps to the last. Keyboard users cannot accidentally move focus onto the page behind the menu.
- **Line 20** — the list of elements that can receive keyboard focus.
- **Lines 27–30** — when the menu closes, **return focus to the button that opened it**, so the keyboard user does not lose their place. `isConnected` checks that the button is still on the page.
- **Line 35** — clicking the dimmed background also closes it.
- **Line 36** — `role="dialog"` and `aria-modal="true"` tell screen readers this is a modal dialog, and `aria-label` names it.

### 29.2 `AccessibleSheet.jsx`

The same pattern for the full-screen add/edit task panel. The one difference is line 18:

```js
18  const initialTarget = sheet.querySelector('[autofocus]') || sheet.querySelector(focusableSelector);
```

Focus goes to the element marked `autoFocus` (the task-name box) if there is one, otherwise to the first focusable element.

### 29.3 `Setting.jsx` and `StatusMessage.jsx`

```js
3  export function Setting({ label, text, checked, disabled, onChange }) {
4    return <label className="setting"><div><b>{label}</b><p>{text}</p></div><input type="checkbox" role="switch" className="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} /></label>;
5  }
```

An on/off switch. It is a real `<input type="checkbox">` (so it works with the keyboard and screen readers without extra code) with `role="switch"` (so it is announced as "on/off" rather than "checked"). Wrapping everything in `<label>` makes the whole row tappable and links the text to the switch.

```js
6  export function StatusMessage({ text, tone = 'status' }) {
7    if (!text) return null;
8    return <p className={`status-msg ${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>{text}</p>;
9  }
```

Every success and error message in the app uses this component.
- **Line 7** — no text → nothing is drawn.
- **Line 8** — **errors** use `role="alert"` and `aria-live="assertive"`, so screen readers announce them **immediately**. **Confirmations** use `role="status"` and `"polite"`, so they are announced **without interrupting**. It is the one place where this rule is set, so it is applied the same way everywhere.

### 29.4 `ExternalLink.jsx`

```js
13  export function ExternalLink({ href, className, children }) {
14    async function handleClick(event) {
15      if (!Capacitor.isNativePlatform()) return;
16      event.preventDefault();
17      await Browser.open({ url: href });
18    }
20    return (
21      <a className={className} href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
22        {children}
23      </a>
24    );
25  }
```

- On the **web**, this is a normal link that opens a new tab. `rel="noopener noreferrer"` stops the opened page from getting any access to Nuvora's page (a standard security measure).
- In the **phone apps**, normal links are unreliable inside the app's web view. Lines 15–17 stop the normal link and open it in the **system browser** (a Chrome Custom Tab on Android) with the Capacitor Browser plugin.

### 29.5 `FocusTimer.jsx`

```js
12  export function FocusTimer({ seconds = 120, showTone = true }) {
13    const [remaining, setRemaining] = useState(seconds);
14    const [running, setRunning] = useState(false);
15    const [finished, setFinished] = useState(false);
19    useEffect(() => {
20      if (!running) return undefined;
21      const id = setInterval(() => {
22        setRemaining(r => {
23          if (r <= 1) {
24            setRunning(false);
25            setFinished(true);
26            return 0;
27          }
28          return r - 1;
29        });
30      }, 1000);
31      return () => clearInterval(id);
32    }, [running]);
```

A real countdown timer.
- **Lines 19–32** — while running, subtract 1 every second (`setInterval(…, 1000)`). At zero, stop and mark as finished. The cleanup (line 31) stops the interval when the timer is paused or the component is removed, so timers never keep running in the background.
- **Line 22** — the functional update `r => r - 1` always uses the latest value.
- **Line 59** — the display has `role="status" aria-live="polite"`, and says "**Time's up — well done.**" at the end. That is recognition of the effort, not an alarm.
- **Lines 61–63** — Start/Resume, Pause, Reset.
- **Lines 41–56** — an optional soft tone (a quiet 220 Hz sine wave), only after a tap.

### 29.6 `radiogroup.js` — arrow-key navigation

```js
 6  export function handleRadiogroupKeyDown(e, containerRef, values, current, onSelect) {
 7    let idx = values.indexOf(current);
 8    if (idx === -1) idx = 0;
 9    let nextIdx;
10    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (idx + 1) % values.length;
11    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (idx - 1 + values.length) % values.length;
12    else if (e.key === 'Home') nextIdx = 0;
13    else if (e.key === 'End') nextIdx = values.length - 1;
14    else return;
15    e.preventDefault();
16    const nextValue = values[nextIdx];
17    onSelect(nextValue);
18    requestAnimationFrame(() => {
19      const match = Array.from(containerRef.current?.querySelectorAll('[data-value]') || []).find(el => el.dataset.value === String(nextValue));
20      match?.focus();
21    });
22  }
```

Normal HTML radio buttons move with the arrow keys automatically. Nuvora's options are custom buttons, so this adds the same behaviour (the WAI-ARIA radiogroup pattern).
- **Lines 7–8** — find the current option, or start at the first.
- **Lines 10–11** — next / previous. `% values.length` **wraps around** at the ends; `+ values.length` stops the index going negative.
- **Lines 12–13** — Home and End jump to the first and last options.
- **Line 14** — any other key is left alone, so Tab still works normally.
- **Line 15** — stop the arrow keys also scrolling the page.
- **Line 17** — select the new option.
- **Lines 18–21** — after React has redrawn (`requestAnimationFrame`), move **focus** to the newly selected button, found by its `data-value`.

### 29.7 `Mascot.jsx`, `Logo.jsx`, `PageTitle.jsx`, `Empty.jsx`

```js
6  export function Mascot({ size = 64, mood = 'calm' }) {
7    const mouth = { calm: 'M40 55 Q52 63 64 55', worried: 'M40 58 Q52 52 64 58', neutral: 'M42 56 Q52 60 62 56' }[mood];
8    return <svg className="mascot" width={size} height={size * 0.75} viewBox="0 0 104 78" aria-hidden="true">
       … four overlapping circles and ellipses form the cloud, two dots are eyes …
16      <path d={mouth} stroke="var(--ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
17    </svg>;
18  }
```

The cloud mascot is drawn in code as SVG, so it is sharp at any size and needs no image file.
- **Line 7** — the mood changes **only the mouth**: a smile, a small frown, or a flat line. `Q` in the path is a curve whose middle point sets its direction. The body colour **never changes**, so the mascot never turns into an alarm signal (comment, lines 3–5).
- **Line 8** — `aria-hidden="true"` because it is decorative.
- The colours come from CSS variables, so they follow the theme.

`Logo` is the mascot plus the word "Nuvora". `PageTitle` is the coloured header card used at the top of screens (`data-tone` chooses its colour). `Empty` is the friendly empty-state block (leaf icon, heading, text).

---

## 30. Styling and the design system — `app/styles/`

`app/globals.css` imports seven stylesheets **in a fixed order**, because later files deliberately override earlier ones:

| File | Purpose |
|---|---|
| `tokens.css` | **Design tokens**: every colour, radius and shadow as a named CSS variable. |
| `base.css` | Base layout, buttons, forms, the `.phone` frame, `.reduced`, focus outline, reduced-motion media query. |
| `layout-refinement.css` | Spacing and layout improvements. |
| `visual-polish.css` | Cards, colours and visual details. |
| `auth.css` | The login and sign-up screens. |
| `calm-mode.css` | Everything specific to Calm Mode. |
| `final-polish.css` | Final adjustments, including phone safe areas (notch, home indicator). |

**Design tokens (`tokens.css`).** All colours are defined once on `:root`:

```css
--nuvora-bg: #faf7f0;            /* warm cream page background, not white */
--nuvora-purple: #6e62e5;        /* the one primary accent */
--nuvora-purple-dark: #5b4fd1;   /* text-safe purple (~6:1 contrast) */
--nuvora-teal: #4e9e93;          /* calm / supportive */
--nuvora-amber: #b98e45;         /* gentle information */
--nuvora-amber-higher: #c4794f;  /* the "Higher" band: warm, never alarm-red */
--nuvora-text-secondary: #6b6b76;/* readable secondary text (~5.3:1) */
```

Design choices recorded in the file's header comment:
- A **warm neutral background** instead of bright white, to reduce glare.
- **One** main accent colour (purple). Each other colour has **one meaning**: lavender = next step, teal = calm / supportive, amber = gentle information.
- The Higher pressure band is **warm orange, never red**, so the result does not feel like an alarm.
- **Contrast (WCAG AA).** The standard purple is used only as a **background** behind white text (about 4.6:1) or for large decorative shapes. Wherever purple is used as **small text**, the darker `--nuvora-purple-dark` (about 6:1) is used instead. The light grey `--nuvora-text-muted` (about 3.4:1) is kept for decoration only; all readable secondary text uses `--nuvora-text-secondary` (about 5.3:1).
- **Legacy aliases** (lines 75–87) map older variable names onto the new tokens, so the whole colour scheme can be changed from one block.

**Accessibility rules in `base.css`** (summarised; the real rules contain more properties):

```css
main { … font-size: calc(16px * var(--scale, 1)); }                            /* text size setting */
.calm { --bg: var(--calm-bg); }                                                /* Calm Mode's softer background */
.reduced * { animation: none !important; transition: none !important; }       /* in-app Reduced Motion */
:focus-visible { outline: 3px solid var(--nuvora-purple); outline-offset: 2px; } /* visible keyboard focus */
.option, .link { min-height: 44px; }                                           /* large touch targets */
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; … } }
@media (max-width: 500px) { .phone { height: 100vh; border-radius: 0; … } }    /* full-screen on phones */
```

- **Text size**: every other size is in `em`, so changing `--scale` resizes everything.
- **Reduced motion is respected twice**: the operating-system setting (`prefers-reduced-motion`), **and** Nuvora's own setting (`.reduced`). A student who has not changed their system settings can still turn motion off inside the app.
- **Focus outline**: a thick 3px purple outline shows keyboard users where they are. `:focus-visible` shows it for the keyboard but not for mouse clicks.
- **44px minimum touch targets**, the size recommended by WCAG 2.5.5 and Apple's guidelines.
- **Phones**: on screens narrower than 500px the rounded "phone" frame becomes the full screen.

---

## 31. Automated testing

**Current results (run on 29 September 2026):**
- `npx vitest run` → **25 test files, 323 tests, all passing.**
- `npm run test:rules` → **54 security-rule tests, all passing** in the Firestore emulator.
- `npm run build` → the static export builds successfully.

| Kind of test | Files | What they check |
|---|---|---|
| **Unit tests** for the logic | `lib/*.test.js` (14 files) | Every rule: score maths and band edges, deadline levels, explanation wording, date handling, recommendation order, step sequences, pattern thresholds, error messages, sound start/stop, store behaviour in demo mode. |
| **Component and journey tests** | `components/NuvoraApp.*.test.jsx` (8 files) | The real app rendered in jsdom and used like a student would: clicking, typing, moving between screens. |
| **Firebase-mode journeys** | `NuvoraApp.firebase.test.jsx`, `NuvoraApp.firestore-journeys.test.jsx` | The store's **Firestore code** run end to end against `test/fakeFirestore.js`, an in-memory stand-in for Firestore that understands `serverTimestamp()`, dotted field updates and `orderBy`. It can also simulate failed writes. |
| **Automated accessibility** | `NuvoraApp.a11y.test.jsx` | **axe-core** scans Today, Tasks, Check-in, Learn, Progress, Support, Settings and Overwhelmed Mode for accessibility violations; plus manual checks of drawer focus management and arrow-key navigation. |
| **CSS checks** | `app/globals.contrast.test.js`, `app/accessibility.final.test.js` | Calculates the **WCAG contrast ratio** of the key colour pairs from the real stylesheet; checks the reduced-motion rule and the focus outline exist. |
| **Security rules** | `firestore.rules.test.js` (runs with `npm test`), `firestore-rules.emulator-test.js` (run with `npm run test:rules`) | See Section 8.6. |

Examples of important behaviour the tests confirm:
- The documented worked example gives exactly **45 / Moderate**; the extremes give 0 and 100; 33/34 and 66/67 are the exact band edges (`lib/risk.test.js`).
- The end-to-end journey: demo mode → add a task → check-in → explanation → next action → Overwhelmed Mode → micro-step done → **the assignment stays open** (`NuvoraApp.journeys.test.jsx`).
- A failed check-in save **keeps the answers** and shows an accessible error (`NuvoraApp.ui.test.jsx`).
- "Stop for now" **does not say the place is saved when saving failed** (`NuvoraApp.firestore-journeys.test.jsx`).
- The Calm sound starts on a tap, keeps playing between screens, stops when Calm Mode is turned off, and stops when the app closes (`NuvoraApp.calmSound.test.jsx`).

**What the tests do not cover:** they run in a simulated browser, not on real phones; automated accessibility checks find only some kinds of problem, so they do not replace testing with real users and screen readers; and no user evaluation has been carried out.

---

## 32. Android and iOS — Capacitor

Capacitor wraps the **same** static web build in a native app shell that shows it in a full-screen web view. The workflow is:

```
npm run android:sync   →  next build  (produces out/)  →  npx cap sync android  (copies out/ into android/)
npm run android:open   →  opens the project in Android Studio to run on a device or emulator
(the same for ios:sync / ios:open with Xcode)
```

Native-only behaviour lives in the React code and does **nothing on the web**:
- **Status bar** — dark icons on the light background (`NuvoraApp.jsx` line 112).
- **iOS keyboard** — the app shrinks so text boxes stay visible (line 114).
- **External links** — opened in the system browser (`ExternalLink.jsx`).
- **Safe areas** — `viewport-fit=cover` (layout.js) plus `env(safe-area-inset-*)` in `final-polish.css` keep content clear of the notch and home indicator.

Full build instructions are in `docs/ANDROID_BUILD.md` and `docs/IOS_BUILD.md`.

---

# Part G — Putting it together

## 33. End-to-end traces

### 33.1 A student opens the app (Firebase mode)

1. `app/page.js` renders `NuvoraApp`. `user` is `undefined` → **Splash** (`NuvoraApp.jsx:205`).
2. `onAuthStateChanged` (line 139) reports a saved session → `setUser(userObject)`.
3. The loading effect (lines 166–195) calls `loadData(uid)` (`store.js:333`), which runs **four Firestore reads**: tasks, check-ins and reflections (newest first), and the user document.
4. Tasks are upgraded (`migrateTask`); settings and stats are cleaned field by field.
5. `setData(d)` and `setSettings(d.settings)` → the guards pass → the app frame and **Today** appear.
6. Today calls `recommendAction(data.tasks, latestBand)` → `pickPriorityTask` sorts by urgency, priority and date → **one task and one small action** are shown.

### 33.2 A student completes a check-in

1. Today → "Check in when it would help" → `go('checkin')`.
2. Each answer is stored in `checkinDraft` in `NuvoraApp`, one question per screen.
3. On the last question, `next()` (`Checkin.jsx:61`):
   - any "Not sure" → save with `risk: null, incomplete: true` → "That's okay." screen;
   - otherwise → `calculatePressure(answers)` (Zod check → five 0–100 factors → weighted sum → band) → `combineWorkloadPressure(result, tasks)` (count deadlines → most severe level → add points, cap at 100 → re-band).
4. `saveCheckin` → Firestore `addDoc` under `users/{uid}/checkins`. The **security rules** check the owner and `validCheckin` (answers present, band one of the three, score in range).
5. Only after the save succeeds: the new check-in is added to the front of `data.checkins`, and the result screen appears with the band, the message, "not a diagnosis", and the "Why this result?" lines from `explainPressure`.
6. "Choose my next step" → **Overwhelmed Mode** if the band is Higher, otherwise **Today**, where the new band now makes the recommended action smaller if needed.

### 33.3 A student marks a micro-step done

1. Today → `FocusTask` → "Mark this step done" → `run(persist, patch, message)`.
2. `persist`: `completeCurrentStep(uid, id, true)` → Firestore updates **only** `currentStep.done` and `currentStep.completedAt`. Then `recordStepCompleted` → `stats.stepsCompleted` + 1 with atomic `increment(1)` (a failure here is ignored).
3. `patch`: `withStepDone(task)` changes the in-memory copy; `withStepCounted` updates the count.
4. The message confirms that **the assignment stays open**. The card offers "Generate next step" → `nextStepAfter(task)` → the next template for the task type.

### 33.4 A student uses Calm Mode and stops for now

1. The header "Calm" button → `updateSettings({ ...settings, calmMode: true })` → the sound starts inside the tap → the setting is saved.
2. The "just enabled" effect resets the four session preferences to on, and moves the student to Today if they were on Tasks, Learn or Progress.
3. The `<main>` element gets the `calm`, `reduced` and `calm-low-detail` classes; the bottom bar becomes two items.
4. Today shows **View 4**: one task, one step, "Open my plan" / "Stop for now".
5. "Stop for now" → a restart point `{ taskId, taskTitle, stepText, stoppedAt }` is saved **inside the settings** → only if that succeeds → "You can stop here. Your place is saved."
6. Next visit with Calm Mode on → **View 3**, "You already have a safe place to restart", showing the saved step first.

### 33.5 A student deletes their account

1. Privacy → type DELETE + password → confirm.
2. `reauthenticate(password)` — **if this fails, nothing has been deleted.**
3. `deleteAllData(uid)` — deletes every task, check-in and reflection, then `users/{uid}`.
4. `deleteAccount()` — deletes the Firebase Authentication account → Firebase signs the user out → `onAuthStateChanged(null)` → the shared data is cleared from memory → the login screen appears.

---

## 34. Limitations, and problems fixed during the code review

These are worth stating in the Evaluation or Limitations chapter. Reporting both the problems that were **found and fixed** and those that **remain** shows critical awareness of the implementation.

### 34.1 Problems found and fixed (29 September 2026)

Reading the code line by line for this walkthrough found five faults. All were fixed and verified:

| # | Problem found | Fix | Evidence |
|---|---|---|---|
| 1 | The security rules accepted scores up to **120**, although the app never produces more than 100. | The limit is now `<= 100` (`firestore.rules:84`). | Emulator tests "accepts the maximum score of exactly 100" and "rejects a score above 100 (101)". |
| 2 | **Several emulator rule tests passed for the wrong reason.** The check-in "rejects…" tests wrote documents with no `answers` field, and some task "rejects…" tests left out required fields. Those writes were refused for the missing field, so the tests would have passed even if the rule they were named after had been removed. The suite had also **never been run**. | Every "rejects…" test now starts from a **valid** document and changes **one** field, and most are paired with an "accepts…" test. The suite was run in the Firestore emulator. | `npm run test:rules` → **54 tests, all passing**. |
| 3 | **The `users/{uid}` document was not validated**: settings and stats, which are fields on it, only needed ownership. Meanwhile the `/settings` and `/stats` sub-collection rules were **never used** by the app. | New `validUserDoc` / `validSettings` / `validStats` rules check types, the text-size range and text lengths (Section 8.4). The unused sub-collection rules were removed, so the default deny refuses them. | 11 new emulator tests, including a check that seeded documents with extra metadata can still save settings. |
| 4 | **Reflections had no size limit** on the server. | `validReflection` limits each answer to 2,000 characters (content is still not judged). The reflection boxes have `maxLength={2000}`. | 4 new emulator tests. |
| 5 | **Step ids restarted at 1 on every reload** (a counter in `steps.js`). | Ids now use `crypto.randomUUID()` (Section 14). | Unit test "step ids never repeat, even across separate calls". |

To keep the app and the server consistent, the matching `maxLength` limits were added to the display-name, support-person and reflection inputs, and `sanitizeSettings` now trims text to the same lengths (unit test "keeps text within the limits firestore.rules enforces"). After the fixes: **323 unit tests, 54 rule tests, and the production build all pass.**

### 34.2 Remaining limitations (deliberate design choices or outside the code)

**The model**
1. **The weights are a design decision, not validated.** The 30/25/20/15/10 weights and the 33/66 band thresholds are not based on a validated instrument (`pressureConfig.js:7`). Changing the code cannot fix this; it would need a validation study.
2. **Factors are rounded before weighting** (`risk.js:71–89`), so the total can differ by up to about 1 point from an unrounded calculation. This is consistent and tested, and was left unchanged because changing it would alter documented and tested results.
3. **Old check-ins explain deadlines using today's tasks.** Check-ins saved before the deadline adjustment existed have no stored deadline record, so their explanation uses the **current** task list (`explain.js:45–46`). Every check-in saved now stores its own deadline record, so this only affects older data.
4. **Dates are whole days only.** "Due within 48 hours" really means "due today or tomorrow" (`dates.js:3–6`), because tasks store a date but no time.

**Data and security**
5. **Account deletion is not atomic.** Re-authenticating first removes the most likely failure, but Authentication and Firestore are separate services (`firebase.js:123–144`). Making it atomic would need server code (for example a Cloud Function), which the static-export design does not have.
6. **Firestore queries ordered by `createdAt` skip documents without that field** (`store.js:332`). The app always writes it, so this only affects data created in other ways.
7. **No persistent offline storage.** This is a deliberate privacy choice, but it means changes made offline are lost if the page is closed before reconnecting (`firebase.js:61–78`).
8. **Security rules check shape, not honesty.** The rules stop malformed or oversized data, but a signed-in user could still write a well-formed but made-up score to **their own** data. This only affects their own account.

**Interface and evaluation**
9. **No URL routes**, so screens cannot be bookmarked and the browser Back button does not move between screens (`NuvoraApp.jsx:30–39`). A deliberate trade-off for the Capacitor static build.
10. **Testing is automated only.** The tests run in a simulated browser and a local emulator. No user evaluation has been carried out, the app has not been tested on physical phones, and automated accessibility tools find only some issues.

---

*End of walkthrough.*
