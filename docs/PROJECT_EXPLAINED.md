# Nuvora — Project & Code Explained

## Table of Contents

- [What Nuvora is](#what-nuvora-is)
- [Architecture at a glance](#architecture-at-a-glance)
- [How to read this document](#how-to-read-this-document)
- [Part 1: Config, App Shell & UI Components](#part-1-config-app-shell--ui-components)
  - [package.json](#packagejson)
  - [capacitor.config.ts](#capacitorconfigts)
  - [firebase.json](#firebasejson)
  - [jsconfig.json](#jsconfigjson)
  - [vitest.config.js](#vitestconfigjs)
  - [vitest.setup.js](#vitestsetupjs)
  - [serviceAccountKey.json](#serviceaccountkeyjson)
  - [app/layout.js](#applayoutjs)
  - [app/page.js](#apppagejs)
  - [app/globals.css](#appglobalscss)
  - [app/styles/tokens.css](#appstylestokenscss)
  - [app/styles/base.css](#appstylesbasecss)
  - [app/styles/calm-mode.css](#appstylescalm-modecss)
  - [app/styles/layout-refinement.css](#appstyleslayout-refinementcss)
  - [app/styles/visual-polish.css](#appstylesvisual-polishcss)
  - [app/styles/auth.css](#appstylesauthcss)
  - [app/accessibility.final.test.js](#appaccessibilityfinaltestjs)
  - [app/globals.contrast.test.js](#appglobalscontrasttestjs)
  - [components/ui/AccessibleSheet.jsx](#componentsuiaccessiblesheetjsx)
  - [components/ui/Drawer.jsx](#componentsuidrawerjsx)
  - [components/ui/Empty.jsx](#componentsuiemptyjsx)
  - [components/ui/ExternalLink.jsx](#componentsuiexternallinkjsx)
  - [components/ui/FocusTimer.jsx](#componentsuifocustimerjsx)
  - [components/ui/Logo.jsx](#componentsuilogojsx)
  - [components/ui/Mascot.jsx](#componentsuimascotjsx)
  - [components/ui/PageTitle.jsx](#componentsuipagetitlejsx)
  - [components/ui/Setting.jsx](#componentsuisettingjsx)
  - [components/ui/StatusMessage.jsx](#componentsuistatusmessagejsx)
  - [components/ui/radiogroup.js](#componentsuiradiogroupjs)
  - [components/constants.js](#componentsconstantsjs)
  - [components/NuvoraApp.jsx](#componentsnuvoraappjsx)
- [Part 2: lib/ — Core Logic & Data Modules](#part-2-lib--core-logic--data-modules)
  - [lib/authErrors.js](#libautherrorsjs)
  - [lib/dates.js](#libdatesjs)
  - [lib/explain.js](#libexplainjs)
  - [lib/firebase.js](#libfirebasejs)
  - [lib/greeting.js](#libgreetingjs)
  - [lib/modules.js](#libmodulesjs)
  - [lib/patterns.js](#libpatternsjs)
  - [lib/pressure.js](#libpressurejs)
  - [lib/pressureConfig.js](#libpressureconfigjs)
  - [lib/recommendation.js](#librecommendationjs)
  - [lib/risk.js](#libriskjs)
  - [lib/steps.js](#libstepsjs)
  - [lib/store.js](#libstorejs)
  - [lib/timer.js](#libtimerjs)
  - [Module relationships](#module-relationships)
- [Part 3: Screen Components (components/screens/)](#part-3-screen-components-componentsscreens)
  - [components/screens/Splash.jsx](#componentsscreenssplashjsx)
  - [components/screens/Onboarding.jsx](#componentsscreensonboardingjsx)
  - [components/screens/Auth.jsx](#componentsscreensauthjsx)
  - [components/screens/Privacy.jsx](#componentsscreensprivacyjsx)
  - [components/screens/Today.jsx](#componentsscreenstodayjsx)
  - [components/screens/Checkin.jsx](#componentsscreenscheckinjsx)
  - [components/screens/Tasks.jsx](#componentsscreenstasksjsx)
  - [components/screens/Learn.jsx](#componentsscreenslearnjsx)
  - [components/screens/Overwhelmed.jsx](#componentsscreensoverwhelmedjsx)
  - [components/screens/Reflection.jsx](#componentsscreensreflectionjsx)
  - [components/screens/Progress.jsx](#componentsscreensprogressjsx)
  - [components/screens/Support.jsx](#componentsscreenssupportjsx)
  - [components/screens/SettingsPage.jsx](#componentsscreenssettingspagejsx)
  - [components/screens/LoadError.jsx](#componentsscreensloaderrorjsx)
- [Part 4: lib/ Tests & Firestore Rules Tests](#part-4-lib-tests--firestore-rules-tests)
  - [lib/authErrors.test.js](#libautherrorstestjs)
  - [lib/dates.test.js](#libdatestestjs)
  - [lib/explain.test.js](#libexplaintestjs)
  - [lib/greeting.test.js](#libgreetingtestjs)
  - [lib/modules.test.js](#libmodulestestjs)
  - [lib/patterns.test.js](#libpatternstestjs)
  - [lib/pressure.test.js](#libpressuretestjs)
  - [lib/pressureConfig.test.js](#libpressureconfigtestjs)
  - [lib/recommendation.test.js](#librecommendationtestjs)
  - [lib/risk.test.js](#librisktestjs)
  - [lib/steps.test.js](#libstepstestjs)
  - [lib/store.test.js](#libstoretestjs)
  - [lib/timer.test.js](#libtimertestjs)
  - [firestore-rules.emulator-test.js](#firestore-rulesemulator-testjs)
  - [firestore.rules.test.js](#firestorerulestestjs)
- [Part 5: NuvoraApp Component Tests](#part-5-nuvoraapp-component-tests)
  - [components/NuvoraApp.ui.test.jsx](#componentsnuvoraappuitestjsx)
  - [components/NuvoraApp.firebase.test.jsx](#componentsnuvoraappfirebasetestjsx)
  - [components/NuvoraApp.journeys.test.jsx](#componentsnuvoraappjourneystestjsx)
  - [components/NuvoraApp.learn-difficult.test.jsx](#componentsnuvoraapplearn-difficulttestjsx)
  - [components/NuvoraApp.a11y.test.jsx](#componentsnuvoraappa11ytestjsx)


This document walks through the entire Nuvora codebase, file by file, explaining what each file is for and how its code works. It's meant to let a developer who has never seen this project before understand it end to end without reading the source first.

## What Nuvora is

Nuvora is a Next.js + React web app — described in its own metadata as "a calm academic workload companion" — built to help neurodivergent students (ADHD, autism, and similar) manage academic workload without the shame, pressure, or gamification common in productivity apps. It ships to the web and, via Capacitor, as native Android and iOS apps.

Its core features:

- **Task management** with tasks broken into small, non-overwhelming "micro-steps" using fixed, deterministic templates per task type (never AI-generated).
- **Daily check-ins** that turn five simple self-report questions into a "workload pressure" score (Low/Moderate/Higher), combined with how many real deadlines are looming.
- **Calm Mode** — an opt-in, dramatically simplified single-task view with its own temporary, session-only settings (hide deadlines, hide progress numbers, reduce visual detail, reduce motion).
- **Overwhelmed Mode** — a crisis-support screen offering one of five very small responses to "what's making this hard right now," ordered by what has actually helped the student before.
- **Learn** — a library of concrete coping tools (focus timers, body-doubling message templates, if-then planning, etc.) tied to the student's real current task.
- **Progress** — non-judgmental stats and pattern insights (no streaks, no targets), with an opt-out for students who find tracking itself stressful.
- **Support** — a self-controlled, copy-to-clipboard summary a student can choose to share with a tutor or support person; Nuvora never sends anything automatically.
- **Privacy & data controls** — full data export, scoped deletion (check-in history only / completed tasks only / everything), and full account deletion, all locally reasoned about and disclosed on-screen.

Recurring design principles you'll see enforced throughout the code (and its tests): no shaming or alarm-colored UI, no gamification (streaks/targets), no content that pretends to be AI-personalized when it's really a fixed template, careful accessibility (focus management, ARIA live regions, contrast, reduced motion, keyboard navigation), explicit non-diagnostic disclaimers, and privacy-conscious defaults (e.g. no persistent Firestore cache on the web).

## Architecture at a glance

- **Framework**: Next.js 16 (App Router) + React 19, but used as a **single-route, statically-exported** app — `app/page.js` renders one component, `NuvoraApp`, and *all* navigation between "screens" (Today, Tasks, Learn, Progress, Support, Settings, etc.) happens via plain React state inside that one component, not Next.js file-based routing. This is what makes static export + Capacitor packaging work cleanly.
- **Mobile**: Capacitor wraps the static `out/` export into native Android/iOS shells (`capacitor.config.ts`).
- **Backend**: Firebase Auth + Firestore, but entirely optional — a `firebaseEnabled` flag (based on whether Firebase env vars are configured) lets the whole app run against `localStorage` instead, in a full-featured local "demo mode." Nearly every function in `lib/store.js` has both code paths.
- **Testing**: Vitest + Testing Library + `axe-core` for accessibility auditing, plus a Firestore security-rules test suite (one version that runs against a real local emulator, one that statically checks the rules file's text).
- **Directory layout**:
  - `app/` — the Next.js App Router shell: root layout, the single page, and the split-up global stylesheet.
  - `components/screens/` — one file per app "screen" (Today, Tasks, Checkin, Learn, Overwhelmed, Progress, Reflection, Support, SettingsPage, Privacy, plus pre-auth screens Splash, Onboarding, Auth, LoadError).
  - `components/ui/` — small reusable primitives (accessible dialogs/drawers, the mascot/logo, form controls, status messages).
  - `components/NuvoraApp.jsx` — the top-level shell that owns almost all cross-screen state and acts as the app's router.
  - `lib/` — framework-agnostic business logic: date/urgency math, the pressure-scoring engine, deadline-aware adjustment, plain-language explanations, pattern detection, task-step templates, the Firebase bootstrap, and the central data-access/persistence layer (`store.js`).
  - Root config files — `package.json`, `capacitor.config.ts`, `firebase.json`, `jsconfig.json`, `vitest.config.js`/`vitest.setup.js`, and a gitignored `serviceAccountKey.json`.

## How to read this document

The rest of this document is organized in five parts, roughly following the dependency order of the app: configuration and app shell first, then the core business logic (`lib/`), then the screens that use it, then the two test suites that verify all of it. Each file gets its own subsection with a **Purpose** paragraph followed by a **Walkthrough** of its logic.

## Part 1: Config, App Shell & UI Components

### package.json

**Purpose:** The project manifest for Nuvora — a Next.js 16 + React 19 wellness/support app that ships to the web and, via Capacitor, to Android and iOS. It declares the dependency set, the npm scripts that drive every workflow (dev server, static export, mobile sync, testing), and the minimum Node engine.

**Walkthrough:**
- `"engines": {"node": ">=18.18.0"}` pins the minimum Node version, matching what Next.js 16 requires.
- **Scripts**:
  - `dev` — runs `next dev` for local development.
  - `build` — runs `next build`, which (per `next.config`/static export setup implied by `webDir: 'out'` in Capacitor config) produces the static `out/` directory consumed by Capacitor.
  - `start` — serves the exported static site with `npx serve@latest out`, i.e. the app is not run through a Node server in production; it's fully static.
  - `lint` — runs ESLint across the repo.
  - `test` / `test:coverage` — run the Vitest suite, optionally with V8 coverage.
  - `test:rules` — spins up the Firebase emulator (Firestore only) and runs `firestore-rules.emulator-test.js` inside it, so Firestore security rules can be tested against a real emulator rather than mocked.
  - `android:sync` / `ios:sync` — build the static export, then run `npx cap sync <platform>` to copy the web assets and plugin configuration into the native projects.
  - `android:open` / `ios:open` — open the native IDE projects (Android Studio / Xcode) via Capacitor CLI.
- **Dependencies**: Capacitor core plus the specific native plugins actually used elsewhere in the app (`@capacitor/android`, `@capacitor/ios`, `@capacitor/browser` for `ExternalLink`, `@capacitor/keyboard` and `@capacitor/status-bar` for native shell tweaks in `NuvoraApp.jsx`). `firebase` (client SDK) and `firebase-admin` (server/admin SDK, used by scripts and rules testing) are both present. `@fontsource/nunito` self-hosts the Nunito font (imported in `app/layout.js`) instead of depending on Google Fonts at runtime. `lucide-react` supplies icons throughout the UI. `zod` is available for schema validation (likely used in `lib/` for data validation, covered by other files).
- **devDependencies**: Next's ESLint config, Vitest plus its React plugin and jsdom environment, Testing Library (`@testing-library/react`, `@testing-library/jest-dom`) for component tests, `axe-core` for accessibility auditing, `@firebase/rules-unit-testing` for the emulator-based rules tests, and the Capacitor CLI for the `cap` commands.

This file makes clear the project is architected as: **static-exported Next.js app, wrapped by Capacitor for native shells, backed by Firebase, tested with Vitest** — every other config file in this walkthrough exists to serve one of those four concerns.

### capacitor.config.ts

**Purpose:** Configures Capacitor, the framework that wraps Nuvora's static web build in native Android/iOS shells so it can be distributed as a mobile app.

**Walkthrough:**
- `appId: 'com.nuvora.dissertation'` — the reverse-DNS bundle identifier used by both app stores and the native build tooling; it must stay stable across releases since it's how the OS identifies the installed app.
- `appName: 'Nuvora'` — the display name shown under the app icon on-device.
- `webDir: 'out'` — tells Capacitor where the static web assets live after `next build` runs (Next.js's static export output directory). This is the literal link between the `build` script in `package.json` and what `cap sync` copies into the native projects — if `next.config` ever stopped producing a static export into `out/`, this would silently break native builds.
- The config is typed via `CapacitorConfig` from `@capacitor/cli`, giving compile-time checking (in editors that respect `.ts` even though this isn't otherwise a TypeScript project) of the config shape.

### firebase.json

**Purpose:** Configuration for the Firebase CLI/emulator suite, specifically scoped to Firestore — it's the file that makes `npm run test:rules` possible.

**Walkthrough:**
- `"firestore": { "rules": "firestore.rules" }` — points the Firebase CLI at the project's Firestore security rules file (`firestore.rules`, covered elsewhere), so both `firebase deploy` and the emulator know which rules to apply.
- `"emulators": { "firestore": { "port": 8080 } }` — configures the local Firestore emulator to listen on port 8080. Combined with the `test:rules` script (`firebase emulators:exec --only firestore "vitest run firestore-rules.emulator-test.js"`), this spins up a real (but local, ephemeral) Firestore instance with the actual security rules enforced, runs the rules test suite against it, and tears it down — giving genuine confidence that the rules behave as intended rather than relying on hand-written assertions about rule text.

### jsconfig.json

**Purpose:** Enables the `@/*` import alias for plain JavaScript (non-TypeScript) files, which is what lets the rest of the codebase write imports like `@/components/NuvoraApp` instead of long relative paths (`../../components/NuvoraApp`).

**Walkthrough:**
- `"baseUrl": "."` sets the root for path resolution to the project root.
- `"paths": {"@/*": ["./*"]}` maps any `@/xxx` import to `./xxx` relative to the project root. Next.js's own bundler (webpack/Turbopack) reads this automatically for editor tooling and path resolution in JS projects; this is the JS equivalent of a `tsconfig.json`'s `paths` field.
- Notably, `vitest.config.js` has to manually re-declare the same alias for Vite/Vitest (see below), because Vitest doesn't read `jsconfig.json` — this file only governs Next.js/editor resolution.

### vitest.config.js

**Purpose:** Configures the Vitest test runner for the whole project — environment, path aliasing, setup files, and coverage scope.

**Walkthrough:**
- Imports `defineConfig` from `vitest/config` and the official `@vitejs/plugin-react` so JSX/React components can be compiled during tests.
- `resolve.alias`: re-implements the `@/*` alias from `jsconfig.json` using `fileURLToPath(new URL('.', import.meta.url))`, with an explicit comment explaining *why* this duplication exists — Vite/Vitest don't automatically pick up Next's `jsconfig.json` path mapping, so it has to be declared again here or every `@/...` import in test-covered code would fail to resolve under Vitest.
- `test.environment: 'jsdom'` — runs tests in a simulated browser DOM (needed for React component tests, `document`, `window`, etc.).
- `test.setupFiles: ['./vitest.setup.js']` — loads the global test setup (see next section) before any test file runs.
- `test.coverage`: uses the V8 coverage provider, reports as `text` (console) and `html` (browsable report). `include: ['lib/**', 'components/**', 'app/**']` scopes coverage to actual application code. `exclude` removes test files themselves (`*.test.{js,jsx}`), the emulator-only rules test (`*.emulator-test.js`, since it needs a live Firestore emulator and isn't run in the normal `test` script), and `lib/firebase.js` (the Firebase client bootstrap, presumably excluded because it's mostly SDK wiring/side effects that aren't meaningfully unit-testable).

### vitest.setup.js

**Purpose:** Global setup script that runs once before the Vitest suite, wiring in test-only capabilities that aren't part of the core Vitest API.

**Walkthrough:**
- Single line: `import '@testing-library/jest-dom/vitest';`. This registers Testing Library's custom DOM matchers (`toBeInTheDocument()`, `toHaveTextContent()`, `toBeVisible()`, etc.) as Vitest `expect` extensions. Without this import, any test using those matchers would fail with "not a function" errors — it's a small file, but it's a hard prerequisite for every component test in the suite (including the two accessibility/contrast tests covered below, if they used those matchers — here they use plain `expect().toContain`/`toMatch`, but other component tests elsewhere in the app likely do rely on this).

### serviceAccountKey.json

**Purpose:** A Firebase Admin SDK service-account credential file, used locally for privileged Firestore operations — for example running admin scripts or the Firestore emulator/rules test tooling that needs to authenticate as an admin rather than as an end user. It is listed in `.gitignore` (confirmed: `.gitignore:8` matches `serviceAccountKey.json`) and must never be committed to version control, pasted into chat, logs, or documentation, or otherwise exposed — it grants administrative access to the project's Firebase resources. This document does not read or reproduce its contents, and no future contributor should either; if it's ever needed for reference, request a fresh copy through the Firebase console instead of retrieving it from history.

### app/layout.js

**Purpose:** The Next.js App Router root layout — the top-level HTML shell that wraps every page in the app. It's the single place that loads global CSS and fonts and defines page-wide `<head>` metadata.

**Walkthrough:**
- Imports `./globals.css` (pulling in the entire design system, see below) and four static weights of the Nunito font from `@fontsource/nunito` (400, 600, 700, 800) — self-hosting the font rather than fetching from Google Fonts at runtime, which avoids an external network dependency and a layout-shift/privacy concern.
- `export const metadata` sets the page `<title>` ("Nuvora") and `description` ("A calm academic workload companion") — Next.js injects these into `<head>` automatically for every route.
- `RootLayout({ children })` renders the outermost `<html lang="en"><body>...</body></html>` structure, with `children` (the actual page content) placed inside `<body>`.
- `suppressHydrationWarning` on `<body>` is explained by an inline comment: browser extensions (Grammarly, password managers) inject attributes like `data-gr-ext-installed` onto `<body>` before React hydrates, which would otherwise cause a hydration mismatch warning. This is a narrowly-scoped suppression — it only silences mismatches on this one element's own attributes, not on the whole tree, so it won't mask real hydration bugs elsewhere.

### app/page.js

**Purpose:** The root route (`/`) of the Next.js app — effectively the single entry point for the entire Nuvora experience, since this is a single-page-app-style product where all "screens" are client-side state, not separate Next.js routes.

**Walkthrough:**
- Imports `NuvoraApp` from `@/components/NuvoraApp` (using the alias configured in `jsconfig.json`/`vitest.config.js`).
- `export default function Page() { return <NuvoraApp />; }` — the entire route body is just rendering the top-level app component. All real routing (Today/Tasks/Learn/Progress/Support/etc.) happens inside `NuvoraApp` via React state rather than Next.js file-based routes, which fits the static-export + Capacitor architecture (a single static `index.html` that Capacitor can load into a WebView).

### app/globals.css

**Purpose:** The single CSS entry point loaded by `app/layout.js`. Rather than containing styles itself, it acts as a manifest that `@import`s six focused stylesheets in a deliberate, meaningful order.

**Walkthrough:**
- A header comment explains the architecture: this file used to be one long stylesheet and was split into the files it was "actually built in," in the same order — later imports intentionally override selectors from earlier ones, so **import order is load-bearing** and must be preserved.
- Import order: `tokens.css` → `base.css` → `layout-refinement.css` → `visual-polish.css` → `auth.css` → `calm-mode.css`. This means, for example, `layout-refinement.css` can redefine the same `:root` custom properties declared in `tokens.css` and win (which it does — see below), and `calm-mode.css` styles are the final word on anything calm-mode-related.
- Both test files in this batch (`accessibility.final.test.js`, `globals.contrast.test.js`) read this file and manually resolve its `@import` statements via regex + `fs.readFileSync`, specifically because Node/Vitest doesn't execute CSS `@import` the way a browser does — the tests need the *effective* concatenated stylesheet to check for real rules.

### app/styles/tokens.css

**Purpose:** The design token layer — the single source of truth for Nuvora's color palette, radii, and shadows, expressed as CSS custom properties on `:root`. Every other stylesheet consumes these tokens rather than hardcoding colors (mostly — later files do sometimes locally override, see `layout-refinement.css`).

**Walkthrough:**
- A long header comment documents the *contrast rationale* behind the palette, which is unusually explicit and worth preserving: `--nuvora-purple` (#6E62E5) is safe as a background with white text (~4.6:1, WCAG AA) or for large/decorative elements, but is **not** safe as small/bold text on a light surface — for that, the darker `--nuvora-purple-dark` (#5B4FD1, ~6:1) must be used instead. Similarly `--nuvora-text-muted` (~3.4:1 on white) is reserved for non-text/decorative use only, while all genuinely readable secondary/metadata text should use `--nuvora-text-secondary` (~5.3:1). This comment is effectively the project's informal accessibility contract for color usage, and the two test files in this batch exist specifically to enforce parts of it in code.
- **Surfaces**: `--nuvora-bg` (warm off-white page background, not pure white), `--nuvora-bg-soft` (Calm Mode's background), `--nuvora-surface` (white card surface).
- **Purple** (primary accent): base, `-dark` (text-safe), `-soft` (sparing secondary emphasis).
- **Lavender**: used for "next step"/explanatory/tab surfaces.
- **Teal**: calm/workload/completed/supportive meaning — deliberately the "positive" color.
- **Amber**: gentle information/moderate attention — explicitly *never* alarm-red, plus a `-higher` variant for the "Higher" workload-pressure band that stays warm rather than becoming red.
- **Blue**: one extra module accent color (for a "Web Development" module elsewhere in the app).
- **Ink & text**: `--nuvora-ink` (primary text), `--nuvora-text-secondary`, `--nuvora-text-muted` (decorative-only, per the note above), plus subtle line/border colors (`--nuvora-line`, `--nuvora-line-soft`).
- **Radius scale**: `--radius-lg` (20px), `--radius-md` (14px), `--radius-pill` (999px, for pill-shaped buttons/badges).
- **Shadow scale**: intentionally flat/subtle (`--shadow-card`, `--shadow-button`) — the comment notes borders carry most of the visual definition rather than heavy shadows.
- **Legacy aliases**: a block of older custom-property names (`--purple`, `--ink`, `--muted`, `--mint`, `--amber`, `--bg`, `--calm-bg`, etc.) that map onto the new `--nuvora-*` tokens. This lets the rest of the stylesheet (in `base.css` and other files) keep referring to short legacy names while the entire color system can be re-themed by editing only this one token block.

### app/styles/base.css

**Purpose:** The bulk of Nuvora's actual component/layout styling — resets, the phone-frame shell, typography defaults, and nearly every named UI pattern used across screens (cards, tasks, nav, drawer, tabs, forms, badges, etc.). This is the largest and most foundational stylesheet; later files (`layout-refinement.css`, `visual-polish.css`, `auth.css`, `calm-mode.css`) layer refinements on top of what's defined here.

**Walkthrough:**
- **Reset & base**: `* { box-sizing: border-box }`, body font/color/background from tokens, `button/input/select { font: inherit }`, `button { cursor: pointer }`.
- **Phone shell**: `main` centers content full-viewport; `.phone` is the literal simulated-phone frame (fixed max width 430px, rounded corners, shadow) that the whole app renders inside, even on desktop web — this is a deliberate design choice to always present Nuvora as a phone-shaped experience. `.content` is the scrollable body area with bottom padding reserved for the nav bar (110px).
- **Header**: `.logo`, `.icon` (circular icon buttons), `.calm-toggle` (the Calm Mode pill button, with an `.on` state that switches it to the teal "calm" palette).
- **Typography**: `h1`–`h3`, `p`, `small` all pull from the ink/muted tokens.
- **Cards and CTAs**: `.checkin-card` (the daily check-in call-to-action, styled with the lavender "take action" treatment since it's usually the most important thing on screen), `.overwhelmed` (the "I'm feeling overwhelmed" exit button — explicitly styled as a *calm, findable exit* rather than a loud emergency-red alert, per its comment), `.task`/`.panel`/`.support-card` (generic white cards), `.task.focus` (the recommended "one small next step" task, given the lavender surface to stand out).
- **Module badges**: `.module` and its `data-color` variants (purple/teal/amber/blue) — color-coded by `lib/modules.js#moduleColor` (referenced in a comment), so each academic module/subject gets a consistent accent color across the app.
- **Buttons**: `.primary` (full-width pill CTA button with purple background and button shadow), disabled state at 45% opacity.
- **Checklists**: `.mini` and `.check`/`.check-dot` — two different checkbox-like patterns (a static list item with a checked circle vs. an interactive toggle button using `aria-pressed`).
- **Drawer & backdrop**: `.drawer-backdrop`, `.drawer` (the slide-in side menu opened from the header, styled elsewhere in JS by the `Drawer` component).
- **Workload/risk card**: `.risk` and its `.low`/`.higher` variants (teal for low pressure, amber/amber-higher for elevated), `.score`/`.big-score` (the circular numeric badge).
- **Bottom nav**: `nav` (absolute-positioned bottom bar), `nav button.active` (purple-dark active state).
- **Tabs**: `.tabs`/`.tabs button.active` (segmented control pattern, e.g. for switching between task categories).
- **Task rows**: `.row-task` and its `data-color` left-border variants; `.row-task.done` strikes through the title and greys the border.
- **Forms**: `.panel input/select/textarea`, `.auth input` — consistent rounded bordered inputs; `.back` (back-navigation link, `min-height: 44px` for touch-target size); `.progressbar`; `.scale`/`.scale-label` (a 1–N picker used in check-ins).
- **Result screens**: `.result`, `.big-score.low`/`.higher` variants.
- **Learn section**: `.pick-card`, `.activity` and its color variants, `.activity-step` (expandable activity detail).
- **Progress stats**: `.stats` (3-column grid), `.trend` (a labeled horizontal bar).
- **Notices**: `.notice` (amber informational banner).
- **Settings**: `.setting` (label + control row) and `.switch` — a real custom toggle switch built from a native checkbox styled with `-webkit-appearance: none`, using `::before` for the thumb and a `:checked` state — explicitly a "real switch control, not a checkbox" per the comment, meaning it's semantically a checkbox but visually/behaviorally a switch (and elsewhere given `role="switch"` in `components/ui/Setting.jsx`).
- **Overwhelmed Mode**: `.content.overwhelmed-bg` and `.overwhelmed-page` — deliberately styled with a *different* lavender background from Calm Mode's warm neutral, per an explicit comment: Calm Mode is a standing accessibility preference, Overwhelmed Mode is a temporary intervention, and they're kept visually distinct so users don't confuse the two states.
- **Misc patterns**: `.empty` (empty-state), `.splash`/`.auth` (full-page centered layouts), `.calm` (`--bg: var(--calm-bg)` override — this is the actual mechanism by which Calm Mode changes the background color app-wide), `.reduced * { animation: none !important; transition: none !important; }` (the in-app "Reduced Motion" setting's enforcement, distinct from the OS-level `prefers-reduced-motion` handled at the bottom of this file).
- **Responsive**: `@media (max-width: 500px)` removes the phone-frame chrome (full-bleed, no radius/border) so small real phone screens don't see a smaller phone-within-a-phone.
- **Accessibility-specific rules** (important, and covered by the test files):
  - `.sr-only` — the standard visually-hidden-but-screen-reader-accessible utility class.
  - `.status-msg` / `.status-msg.status` / `.status-msg.error` — status/error banners, paired with `components/ui/StatusMessage.jsx`'s `role="status"`/`role="alert"`.
  - `:focus-visible { outline: 3px solid var(--nuvora-purple); outline-offset: 2px; }` — the global keyboard-focus indicator, directly asserted on by `accessibility.final.test.js`.
  - `.option`, `.option.selected` — large tappable choice buttons (44px+ min-height) used in check-in/onboarding-style pickers.
  - `@media (prefers-reduced-motion: reduce)` at the very end — forces near-zero animation/transition durations and disables smooth scrolling for any user whose **operating system** has reduced-motion enabled, independent of and prior to Nuvora's own in-app `.reduced` setting. This is also directly asserted on by `accessibility.final.test.js`.
- Remaining rules (`.calm-focus`, `.module-chips`, `.danger-btn`, `.trend-entry`, `.sheet`/`.sheet-backdrop`, etc.) round out specific screen patterns: a centered single-step Calm focus view, module filter chips, a destructive-action button, expandable trend history rows, and the slide-up "add/edit" sheet overlay (paired with `components/ui/AccessibleSheet.jsx`).

### app/styles/calm-mode.css

**Purpose:** Styling specifically for Calm Mode's "Today" focus view — the reduced-stimulation single-task screen shown when a student has Calm Mode enabled. Because it's the *last* import in `globals.css`, its rules win over anything with the same specificity defined earlier (base.css, layout-refinement.css, visual-polish.css).

**Walkthrough:**
- `.calm-layout` — a constrained-width (356px) vertical flex column that centers the calm content.
- `.calm-hero` — the header card of Calm Mode: a two-column grid (text + mascot illustration) with a soft gradient background (lavender-to-teal radial/linear gradient) and a decorative white radial highlight in the corner.
- `.calm-hero-cloud` — the rounded container around the `Mascot` illustration, with a drop-shadow filter applied to the mascot itself for depth.
- `.calm-task-card` — the single-task card, using an absolutely-positioned `::before` pseudo-element (a soft lavender circle bleeding off the bottom-right corner) purely as decoration (`pointer-events: none`), plus `.calm-task-label`/`.calm-step` for the task title and one-step instruction text.
- `.calm-actions` — a two-column grid (roughly 1.35:1) holding the primary action button and a `.calm-stop` secondary button; both forced to `min-height: 48px` for touch-target comfort.
- `.calm-settings-card` / `.calm-settings-toggle` / `.calm-settings-panel` — an expandable settings disclosure specific to Calm Mode (e.g. toggling which details are hidden), with a `min-height: 68px` toggle row satisfying touch-target sizing and a `grid-template-columns: 38px 1fr auto` layout (icon, label, disclosure arrow).
- `.calm-footer-note` / `.calm-footer-cloud` — a small reassurance note at the bottom of the Calm Mode screen, paired with a smaller decorative cloud icon.
- `.calm-leave` — the "leave Calm Mode" exit control.
- `.calm .content { align-content: start }` and `.calm .calm-focus { justify-content: flex-start }` — override the more general centered layout so Calm Mode's content sits toward the top rather than vertically centered, reducing "big empty middle" awkwardness while keeping the bottom nav area clear.
- `@media (max-width: 380px)` — shrinks the hero illustration and switches `.calm-actions` to a single column on very narrow phones, since the two-button grid would otherwise feel cramped.

### app/styles/layout-refinement.css

**Purpose:** A later design pass (labeled in its header comment as "STEP 8.9b — stronger whole-app visual refinement") that re-tunes color tokens, spacing, and component treatments across nearly every screen — explicitly described as building on Nuvora's existing accessible tokens while making visual hierarchy "more clearly" different. Because of import order, its `:root` block **overrides** several tokens originally set in `tokens.css`.

**Walkthrough:**
- **Root token overrides**: redefines `--nuvora-bg`, `--nuvora-bg-soft`, `--nuvora-surface`, `--nuvora-purple` (and `-dark`), `--nuvora-lavender` (and `-soft`), `--nuvora-teal` (and `-text`/`-soft`), `--nuvora-amber` (and `-text`/`-soft`), `--nuvora-ink`, `--nuvora-text-secondary`, `--shadow-card`, `--shadow-button` — all with slightly adjusted hex values from the originals, i.e. this file is a deliberate, later re-skin of the palette rather than a bug. Because CSS custom properties cascade by source order for equal specificity, and this file imports after `tokens.css`, these values win everywhere token vars are referenced.
- **Shell**: darker `body` background, a subtle gradient on `main`, refined `.phone` shadow/border, and a distinct `header` background.
- **Typography**: tighter letter-spacing on `h1`/`h2` for a more "designed" feel.
- **Today screen**: refined `.avatar`, `.risk`/`.risk.low`/`.risk.higher` (flatter, no shadow), softened `.overwhelmed`, and a gradient background + shadow on `.task.focus`.
- **Generic panels**: larger border radius (18px) and refined shadow/border on `.panel`/`.task`/`.support-card`.
- **Tasks**: reworked `.tabs` (bigger radius, `min-height: 44px` touch targets on tab buttons), `.row-task` (thicker left color border, larger radius, its own shadow) with per-color left-border overrides for purple/teal/amber/blue.
- **Progress**: `.stats article` given explicit per-child background colors and a fixed min-height; `.content > .panel:nth-of-type(1/2)` get colored top borders as subtle section markers.
- **Learn**: refined `.pick-card` and `.activity-step` backgrounds.
- **Buttons/inputs**: `.primary` gets a larger radius/min-height and an explicit `:hover` state (darkens to `--nuvora-purple-dark`); `.option.selected` gets a lavender fill; form inputs (`.panel input/select/textarea`, `.auth input`) get a visible `:focus` state — no default outline, replaced with a purple border plus a soft `box-shadow` ring, a common accessible-focus pattern that avoids the browser's default outline while still being clearly visible.
- **Auth**: significantly more structure than the base version — the whole form gets its own semi-transparent card (`.auth form`) with border/shadow, distinct tab styling (`.auth .tabs`), and spacing tweaks.
- **Bottom nav**: taller (74px), refined shadow, and a new active-state treatment — `nav button.active` gets a light purple background plus a small pill indicator drawn with `nav button.active::after` (a 3px-tall rounded bar), a stronger visual cue than color alone.
- **Settings, sheet overlay**: `.sheet-backdrop` adds a `backdrop-filter: blur(2px)` (with `-webkit-` prefix for Safari); `.sheet` becomes an inset floating panel (10px margin on all sides, rounded 24px) rather than covering the full screen edge-to-edge.
- **Calm mode**: a scoped `--bg` override plus flattened shadows on cards.
- **Focus rings**: redefines `:focus-visible` here too, with a slightly different purple (`rgba(108,92,231,.70)`) and larger offset (3px) than the one in `base.css` — since this file loads later, this version is what's actually rendered; the accessibility test (`accessibility.final.test.js`) checks for the `base.css` phrasing (`outline: 3px solid var(--nuvora-purple)`) so it's worth noting both selectors exist and only one wins visually, though both satisfy "a visible focus outline exists."
- **Mobile**: extra bottom padding on `.content` (104px) to clear the taller nav bar, and adjusted `.auth` side padding.

### app/styles/visual-polish.css

**Purpose:** Adds richer, more "designed" visual identity to page headers and a handful of cards — described in its header comment as "richer page identity without adding noise." This is largely about decorative gradients, the mascot-in-a-card pattern, and per-section color theming, layered after `layout-refinement.css`.

**Walkthrough:**
- **Page title cards**: `.page-title-card` — a rounded card (24px radius) with two decorative pseudo-element circles (`::before`/`::after`, semi-transparent white, `pointer-events: none`) that create a soft bokeh-like highlight in the corner. `data-tone` variants (`lavender`/`teal`/`amber`/`blue`) each apply a different gradient background, so different sections of the app (set via the `PageTitle` component's `tone` prop) get a distinct but consistent color identity.
- `.page-title-cloud` / `.page-title-icon` — the mascot illustration container plus a small circular badge overlapping its corner that carries a section-specific functional icon (e.g. a checklist icon for Tasks), combining the constant "brand" mascot with a per-screen identifier, per the file's opening comment.
- `.page-title-action` — styling for an optional action button that can appear in the page title row.
- **Today's welcome hero**: `.welcome-card` — replaces a plain heading + initial with a gradient card (lavender-to-teal) plus a decorative circle, and `.welcome-cloud` for its mascot.
- **Tinted panel variants**: `.panel-lavender`, `.panel-teal`, `.panel-amber`, `.panel-blue` — reusable gradient/border treatments any panel can opt into for a specific meaning-color, layered on top of the plain `.panel` base.
- **Learn choice list**: `.scale-vertical .option:nth-child(n)` — assigns a different pastel background to each of the first six options in a vertical picker purely by position, described as helping scanning without turning the screen into a rainbow; `.selected` still uses strong purple for contrast so the selected state is never lost among the pastel variety.
- **Action surfaces**: refined gradients on `.checkin-card`, `.task.focus`, `.support-card`.
- **Nav**: `nav button:nth-child(n).active` gives each of the five nav tabs (Today/Tasks/Learn/Progress/Support) a slightly different active-state tint so each section "feels" distinct without adding new labels or icons.
- **Responsive**: `@media (max-width: 380px)` shrinks the page-title card and mascot on very small phones.

### app/styles/auth.css

**Purpose:** Dedicated styling for the authentication/entry experience (sign in / sign up / password reset) — the visual treatment users see before they're inside the main app shell.

**Walkthrough:**
- `.auth-shell` — the outer full-page background, built from two soft radial gradients (lavender top-left, teal bottom-right) layered over the base `--nuvora-bg` token.
- `.auth-phone` — the phone-frame content area specific to auth, with its own subtle top-to-bottom white gradient over the base background and vertical scroll enabled (`overflow-y: auto`) for when the form + hero doesn't fit a short viewport.
- `.auth-brand-row` — the logo row at the top of the auth screen.
- `.auth-hero` — a two-column grid (fixed 92px illustration column + flexible text column) with a lavender-to-teal gradient card, a decorative oversized circle bleeding off the top-right (`::after`, `pointer-events: none`), and an alternate `.auth-hero-reset` gradient variant presumably used for the password-reset flow specifically.
- `.auth-cloud-wrap` — the rounded container for the mascot on the auth hero, with the same drop-shadow-on-mascot pattern seen elsewhere.
- `.auth-card` — the semi-transparent white card (76% opacity) holding the actual sign-in/sign-up form, with its own border/shadow/radius.
- `.auth-tabs` — the sign-in/sign-up segmented toggle, with `min-height: 44px` on each tab button for touch-target accessibility and a white active-tab treatment.
- **Inputs**: `.auth input` gets a warm off-white background and a transition on border-color/box-shadow/background; `.auth input:focus` removes the default outline and replaces it with a purple border plus a soft box-shadow ring (the same accessible custom-focus pattern used in `layout-refinement.css`) and switches the background to solid white — giving clear, deliberate focus feedback.
- `.auth-forgot-link` / `.auth-back-link` — secondary navigation links within the auth flow, both held to `min-height: 44px` for tap-target size.
- `.auth-submit` — spacing for the primary submit button.
- `.auth-note` — a small reassurance/info banner (teal-toned) shown somewhere in the auth flow, e.g. explaining data handling.
- A closing rule reasserts that `.phone`/`header` back to the plain `--nuvora-bg` token color, keeping the app's internal (non-auth) surfaces consistent even though `auth.css` loads after `layout-refinement.css`.
- `@media (max-width: 380px)` — shrinks padding, the hero grid columns (92px → 72px), the mascot wrapper, and heading size for very small phones.

### app/accessibility.final.test.js

**Purpose:** A focused regression test that guards two specific, easy-to-accidentally-break accessibility guarantees at the CSS level: respecting the OS-level reduced-motion preference, and always having a visible keyboard focus indicator. It's a "final safeguard" test — cheap, fast, and meant to fail loudly if a future edit to any of the six split stylesheets accidentally removes either guarantee.

**Walkthrough:**
- Reads `app/globals.css` from disk and manually inlines its `@import` statements via a regex replace, reconstructing the same effective stylesheet a browser would build — necessary because Node doesn't resolve CSS `@import` the way a browser or bundler does, and because the actual rules live in the split files (`tokens.css`, `base.css`, etc.), not in `globals.css` itself.
- **Test 1** ("respects the operating-system reduced-motion preference"): asserts the resolved CSS contains the `@media (prefers-reduced-motion: reduce)` block along with its three key declarations (`animation-duration: 0.01ms !important;`, `transition-duration: 0.01ms !important;`, `scroll-behavior: auto !important;`) — verifying that users with the OS-level "reduce motion" setting get near-instant, non-animated transitions regardless of Nuvora's own in-app Reduced Motion toggle.
- **Test 2** ("keeps a visible keyboard focus indicator"): uses a regex to find a `:focus-visible { ... }` block anywhere in the resolved CSS and asserts it contains `outline: 3px solid var(--nuvora-purple)` — guarding against a future refactor accidentally removing or weakening the focus ring, which would make keyboard navigation unusable for sighted keyboard users. (Note: `layout-refinement.css` also defines its own `:focus-visible` rule with a different color/offset that wins visually since it loads later; this test specifically checks for the `base.css` version's exact text existing somewhere in the cascade, not which one is rendered — both satisfy "a focus outline exists" in spirit.)

### app/globals.contrast.test.js

**Purpose:** Verifies that Nuvora's core color tokens actually meet WCAG AA contrast requirements, and that CSS rules route text through the correct ("text-safe") token variants rather than the merely-decorative ones — i.e., it turns the contrast rationale documented in `tokens.css`'s header comment into an enforced, machine-checked guarantee.

**Walkthrough:**
- Reads and resolves `app/globals.css` the same way as the other test file (manual `@import` inlining).
- Implements the actual WCAG relative-luminance/contrast-ratio algorithm from scratch: `hexToRgb` parses a hex color into RGB channels; `channelToLinear` applies the sRGB-to-linear conversion (the piecewise formula with the 0.03928 threshold from the WCAG spec); `luminance` combines the three linearized channels with the standard 0.2126/0.7152/0.0722 weights; `contrastRatio` computes `(lighter + 0.05) / (darker + 0.05)` between two colors' luminances, per the WCAG 2.x formula.
- **Contrast assertions** (each requiring ratio ≥ 4.5, the WCAG AA threshold for normal text):
  - `--nuvora-text-secondary` (#6B6B76) on white — the "text-safe" secondary color.
  - `--nuvora-purple-dark` (#5B4FD1) on white — the "text-safe" purple variant used for links/labels.
  - White text on `--nuvora-purple` (#6E62E5) — verifying the primary button's white-on-purple combination is also compliant.
- **Usage-routing assertions** (regex-based, not numeric): confirms the global `small { ... }` rule's `color` uses `var(--nuvora-text-secondary)` (the readable, high-contrast token), and separately confirms that same `small` rule block does **not** contain `var(--nuvora-text-muted)` (the lower-contrast, decorative-only token) — directly enforcing the rule from `tokens.css`'s header comment that `--nuvora-text-muted` must never be used for actual readable text.
- Together with `accessibility.final.test.js`, this gives the project automated proof that its documented color-contrast policy is actually followed in the shipped CSS, not just described in a comment that could silently drift out of sync with the rules.

### components/ui/AccessibleSheet.jsx

**Purpose:** A reusable, fully accessible modal "sheet" (bottom/overlay panel) primitive used for focused tasks like adding/editing an item — for example the add-task sheet referenced by `.sheet`/`.sheet-backdrop` in the CSS. It implements the WAI-ARIA dialog focus-management pattern from scratch.

**Walkthrough:**
- `'use client'` directive — required since this component uses browser-only APIs (`document`, refs, event listeners) and can't run as a React Server Component.
- Props: `label` (accessible name for the dialog), `onClose` (callback to close it), `triggerRef` (a ref to the button that opened the sheet, so focus can return there on close), and `children` (the sheet's content).
- On mount (`useEffect`), it captures the trigger element and the sheet DOM node, then:
  - Defines `focusableSelector`, a CSS selector matching all realistically-focusable elements (buttons, links with `href`, non-disabled form controls, and explicit `tabindex`).
  - Moves focus into the sheet immediately: to an element marked `[autofocus]` if present, otherwise the first focusable element — satisfying the dialog pattern's requirement that focus move into the dialog when it opens.
  - Registers a `keydown` listener that:
    - Closes the sheet on `Escape` (calling `onClose()` and preventing default).
    - Implements a **focus trap** on `Tab`: if focus is on the first focusable element and the user shift-tabs, focus wraps to the last one; if focus is on the last element and the user tabs forward, it wraps to the first — so keyboard focus can never escape the open sheet into the page behind it.
  - On cleanup (sheet closes or unmounts), removes the listener and — critically — returns focus to the original trigger button (`triggerEl.focus()`, guarded by `triggerEl?.isConnected` in case that button no longer exists in the DOM), completing the accessible dialog lifecycle.
- Render: a backdrop `<div className="sheet-backdrop" aria-hidden="true" onClick={onClose}>` (clicking outside closes it) and the actual `<div className="sheet" role="dialog" aria-modal="true" aria-label={label}>` wrapping `children`. The backdrop is `aria-hidden` since it's purely visual/interactive chrome, not content.

### components/ui/Drawer.jsx

**Purpose:** The accessible slide-in side menu (opened from the hamburger icon in the header) — architecturally almost identical to `AccessibleSheet`, implementing the same focus-trap/return-focus/Escape-to-close pattern, but for a different UI shape (a persistent open/closed drawer rather than a sheet that's only ever mounted while open) and with a visible close button.

**Walkthrough:**
- `'use client'` directive, same reasoning as `AccessibleSheet`.
- Props: `open` (boolean controlling visibility), `onClose`, `triggerRef` (the menu button that opened it), `children` (drawer content — in `NuvoraApp.jsx`, the settings/privacy/sign-out links).
- Its header comment explicitly frames this as a fix versus "the previous version," which did none of this: focus-in-on-open, focus-trap, Escape-to-close, backdrop-click-to-close, and focus-return-to-trigger.
- The `useEffect` only does anything when `open` is true (`if (!open) return undefined`), and depends on `[open, onClose, triggerRef]` — meaning the trap is (re-)installed each time the drawer opens.
- `firstFocusableRef` is attached specifically to the close (`X`) button, so opening the drawer always focuses that button first, giving keyboard users an immediate, predictable way to close it.
- Same Tab-trap and Escape-to-close logic as `AccessibleSheet`, and the same cleanup pattern that returns focus to the trigger button.
- Because the component conditionally returns `null` when `!open` (`if (!open) return null`, after the hook), it fully unmounts its DOM when closed rather than hiding it with CSS — this is why the effect can safely run its setup/teardown only in response to `open` changing.
- Render: backdrop `<div className="drawer-backdrop">`, then `<div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">` containing an explicit close button (`aria-label="Close menu"`, an `X` icon) followed by `children`.

### components/ui/Empty.jsx

**Purpose:** A tiny, generic empty-state component — shown wherever a list or section has nothing to display yet (e.g. no tasks, no reflections).

**Walkthrough:**
- `'use client'` directive (likely required transitively/by convention across `components/ui`, though this component has no interactivity itself).
- Takes `title` and `text` props and renders a `Leaf` icon (from lucide-react, tying into the calm/nature visual language used elsewhere, e.g. the Calm Mode toggle also uses `Leaf`) above a heading and a paragraph, all wrapped in `.empty` (styled in `base.css` with muted text and a teal-tinted icon).

### components/ui/ExternalLink.jsx

**Purpose:** A drop-in replacement for a plain `<a target="_blank">` that works correctly inside the Capacitor Android WebView, where a normal link click's `window.open()` behavior is not reliable for handing off to an external browser.

**Walkthrough:**
- `'use client'` directive — needed for the click handler and the `Capacitor`/`Browser` native bridge calls.
- Imports `Capacitor` (to detect whether the app is running as a native build vs. a plain web page) and `Browser` from `@capacitor/browser` (the plugin that opens a system/in-app browser tab, e.g. a Chrome Custom Tab on Android).
- `handleClick`: if not running on a native platform (`!Capacitor.isNativePlatform()`), it does nothing and lets the browser handle the click normally (`return` early, no `preventDefault`). If it *is* native, it prevents the default anchor navigation and instead calls `Browser.open({ url: href })`, which hands the URL to the native system browser component.
- The rendered element is still a real `<a href={href} target="_blank" rel="noopener noreferrer">` — so screen readers, "open in new tab" context-menu actions, and any environment where JS doesn't run all still get a functioning link; the native-specific behavior is purely an enhancement layered via `onClick`.
- The comment block explains the underlying problem precisely: a WKWebView/Android WebView doesn't guarantee `window.open()`-driven handoff the way a normal desktop/mobile browser tab does, so without this component, external links (e.g. to support resources) could silently fail to open on native builds.

### components/ui/FocusTimer.jsx

**Purpose:** A real, working countdown timer component used in at least two places per its comment: Overwhelmed Mode's "low energy" path and Learn's "two-minute task starter." The comment notes these previously just *described* a timer in text without an actual working one — this component fixes that gap.

**Walkthrough:**
- `'use client'` directive — uses `useState`, `useEffect`, `useRef`, timers, and the Web Audio API, all client-only.
- Imports `formatSeconds` from `@/lib/timer` (a shared formatting helper, covered by whichever agent documents `lib/`).
- Props: `seconds` (default 120, i.e. two minutes) and `showTone` (default `true`, whether to offer the optional audio cue).
- State: `remaining` (countdown value), `running` (is it currently ticking), `finished` (has it hit zero), `toneOn` (is the audio tone currently playing); `audioRef` holds the live Web Audio nodes so they can be torn down later.
- **Countdown effect**: only runs `setInterval` while `running` is true; each tick decrements `remaining`, and when it would go to zero or below, it stops the timer (`setRunning(false)`), marks it `finished`, and clamps to exactly 0. The interval is cleaned up whenever `running` changes or the component unmounts.
- **Tone handling**: `stopTone` tears down any active oscillator/audio context, wrapped in try/catch since calling `.stop()` on an already-stopped oscillator throws. A second `useEffect` with an empty dependency array calls `stopTone` only as a cleanup function (i.e., on unmount) — ensuring the tone can never keep playing after the component disappears.
- `toggleTone`: if the tone is already on, stop it. Otherwise, it lazily constructs a `AudioContext` (with the `webkitAudioContext` fallback for older Safari), creates a sine-wave oscillator at 220Hz through a low-gain (`0.03`) node into the destination, starts it, and stores the nodes in `audioRef` for later cleanup. Wrapped in try/catch so that if Web Audio is unavailable in a given environment, the timer itself still functions — only the optional tone silently fails to start.
- The header comment stresses this tone is a plainly generated sine wave, started only by an explicit user tap — deliberately never bundled audio and never autoplay, consistent with a broader "nothing plays itself" design rule for a neurodivergent-support app (unexpected audio can be especially distressing/overstimulating for this audience).
- Render: a `role="status" aria-live="polite"` display showing either "Time's up — well done." or the formatted remaining time (so screen reader users get an announcement when the timer finishes or updates); Start/Resume, Pause, and Reset buttons (Reset is disabled when the timer is already at its initial value and not running); and, if `showTone` is true, a link-styled button to toggle the optional tone.

### components/ui/Logo.jsx

**Purpose:** The small brand lockup (mascot + wordmark) shown in the header and drawer.

**Walkthrough:**
- `'use client'` directive.
- Renders `<div className="logo"><Mascot size={26} /> Nuvora</div>` — a thin wrapper composing the `Mascot` SVG component with the literal text "Nuvora," styled by `.logo` in `base.css`.

### components/ui/Mascot.jsx

**Purpose:** The hand-drawn-style cloud character that serves as Nuvora's visual brand mark, reused across the logo, page-title cards, calm-mode hero, and auth hero.

**Walkthrough:**
- `'use client'` directive (though this component is a pure, side-effect-free SVG renderer — likely marked client purely by convention/co-location with other client components).
- Props: `size` (default 64, controls width; height is derived as `size * 0.75` to preserve the SVG's aspect ratio) and `mood` (default `'calm'`).
- `mouth` is selected from a lookup object keyed by `mood` (`calm`, `worried`, `neutral`), each a different SVG path string for the mouth curve. The accompanying comment stresses that `mood` **only** changes the mouth/eyes, never the body color — a deliberate constraint so the mascot never becomes a de facto alarm/warning indicator (e.g. never turns red or otherwise visually escalates), keeping it calm regardless of what it's communicating.
- Renders an SVG built from layered ellipses/circles (the cloud body, made of five overlapping shapes at `opacity="0.85"` using the `--mascot` token color) plus two small dark circles for eyes and a `<path>` for the mouth. `aria-hidden="true"` marks it as purely decorative, so screen readers skip it (any meaningful adjacent text carries the actual information).

### components/ui/PageTitle.jsx

**Purpose:** The reusable page-header component used at the top of most screens — combines a section title, the brand mascot, an optional small functional icon badge, and an optional action button, styled by `.page-title-card` and friends in `visual-polish.css`.

**Walkthrough:**
- `'use client'` directive.
- Props: `title` (heading text), `tone` (default `'lavender'`, one of the four color themes defined in `visual-polish.css`'s `data-tone` variants), `icon` (an optional small icon element to badge onto the mascot), `action` (an optional extra control, e.g. a button, rendered alongside the mascot).
- Renders `<div className="page-title page-title-card" data-tone={tone}>` — note it carries both the plain `.page-title` class (used for basic flex layout defined in `base.css`, shared with `.section-title`/`.row`) and the richer `.page-title-card` class (the decorative gradient/pseudo-element treatment from `visual-polish.css`) simultaneously.
- Left side: `<small>NUVORA SPACE</small>` (an eyebrow label) above the `<h1>{title}</h1>`.
- Right side: the mascot wrapped in `.page-title-cloud` (`aria-hidden`, since it's decorative), with the optional `icon` overlaid as `.page-title-icon` in the corner, and the optional `action` element rendered after it.

### components/ui/Setting.jsx

**Purpose:** A single labeled toggle row used throughout the Settings screen (and Calm Mode's settings panel) — pairs a label/description with a switch-style checkbox.

**Walkthrough:**
- `'use client'` directive.
- Props: `label`, `text` (description), `checked`, `disabled`, `onChange` (called with the new boolean value).
- Renders a `<label className="setting">` wrapping a `<div>` with the bold `label` and descriptive `text`, plus an `<input type="checkbox" role="switch" className="switch">`. The `role="switch"` is what tells assistive technology to announce this as an on/off switch rather than a generic checkbox, matching its `.switch` visual styling (the custom-drawn toggle track/thumb defined in `base.css`). The `onChange` handler unwraps the native event to pass just the boolean `e.target.checked` up to the caller, simplifying the parent's code.

### components/ui/StatusMessage.jsx

**Purpose:** A small, consistently-styled status/confirmation/error banner used across forms and screens — ensures assistive technology is notified appropriately based on the message's severity.

**Walkthrough:**
- `'use client'` directive.
- Props: `text` (the message; if falsy, the component renders nothing at all — `if (!text) return null`), `tone` (default `'status'`, or `'error'`).
- The accompanying comment explains the accessibility reasoning directly: error messages use `role="alert"` (assistive tech interrupts and announces immediately) since the user needs to know right away that something failed, while confirmations use the gentler `role="status"` (announced without interrupting) since they're not urgent.
- This is implemented by deriving both `role` and `aria-live` from the `tone` prop: `role={tone === 'error' ? 'alert' : 'status'}` and `aria-live={tone === 'error' ? 'assertive' : 'polite'}` — `alert`/`assertive` for errors, `status`/`polite` for everything else. The rendered `<p>` also gets a `status-msg ${tone}` class for the color styling defined in `base.css` (`.status-msg.status` teal, `.status-msg.error` red-toned).

### components/ui/radiogroup.js

**Purpose:** A shared keyboard-interaction helper implementing the WAI-ARIA "radiogroup" pattern for any custom (non-native) set of `role="radio"` options in the app — e.g. the scale/option pickers used in check-ins. It's pure logic (not a component), meant to be wired into an `onKeyDown` handler by whatever screen renders a radio-like button group.

**Walkthrough:**
- Exports a single function, `handleRadiogroupKeyDown(e, containerRef, values, current, onSelect)`.
- Finds the index of the currently-selected `current` value within the `values` array (`values.indexOf(current)`), defaulting to `0` if not found (e.g. nothing selected yet).
- Maps arrow keys to the next index per the standard radiogroup pattern: `ArrowRight`/`ArrowDown` moves forward (wrapping via modulo), `ArrowLeft`/`ArrowUp` moves backward (wrapping), `Home` jumps to the first value, `End` jumps to the last. Any other key causes an early `return` (no-op).
- For a handled key, it calls `e.preventDefault()` (stopping the browser's default scroll-on-arrow-key behavior), computes `nextValue`, and calls `onSelect(nextValue)` to update the caller's selection state.
- It then uses `requestAnimationFrame` to defer a DOM query until after the re-render: it searches `containerRef.current` for an element whose `data-value` attribute matches the new value (`el.dataset.value === String(nextValue)`) and calls `.focus()` on it. This is the mechanism that makes "focus follows selection" work — after state updates and React re-renders the now-selected button, this callback finds that specific button in the DOM and moves keyboard focus onto it, so a keyboard user always sees focus on the option that's actually selected, matching native `<input type="radio">` group behavior exactly.

### components/constants.js

**Purpose:** A tiny shared-constants module holding two small values that are used by `NuvoraApp.jsx` (and potentially other screens): the default Calm Mode session preferences, and a single generic user-facing error string.

**Walkthrough:**
- `CALM_SESSION_DEFAULTS`: an object with four booleans (`hideDeadlines`, `hideProgressNumbers`, `reduceVisualDetail`, `reduceMotion`), all defaulting to `true`. The comment clarifies these are *session-only* Calm preferences — deliberately kept out of Firebase and reset every time Calm Mode is (re-)started, letting a student reduce demand in the moment without permanently changing their normal (non-Calm) settings. This is distinct from `settings.calmMode` itself (which *is* persisted) and from `settings.reducedMotion` (also persisted) — there's a three-layer distinction between "Calm Mode on/off" (persisted), "reduced motion in general" (persisted), and "this Calm session's temporary extra reductions" (ephemeral, reset each time).
- `GENERIC_ERROR`: the string `'That did not save. Please try again in a moment.'` — a single shared, deliberately vague-but-reassuring error message used whenever a save operation fails (e.g. `updateSettings` in `NuvoraApp.jsx` catches a failed `saveSettings` call and sets this as the error text), keeping error messaging consistent and calm-toned across the app rather than surfacing raw technical errors.

### components/NuvoraApp.jsx

**Purpose:** The top-level application shell and de-facto router/state machine for all of Nuvora. Since the app has only one real Next.js route (`app/page.js` renders just this component), `NuvoraApp` is responsible for: authentication state, loading the user's Firestore data, holding almost all cross-screen state (settings, Calm session state, check-in draft, navigation), rendering the phone-frame chrome (header, drawer, bottom nav), and deciding which of the many screen components (`Today`, `Tasks`, `Checkin`, `Learn`, `Progress`, `Reflection`, `Support`, `SettingsPage`, `Privacy`, `Overwhelmed`, plus pre-auth screens `Splash`, `LoadError`, `Onboarding`, `Auth`) to render based on a simple `screen` string in state. The individual screen components themselves are documented elsewhere; this entry focuses on how `NuvoraApp` wires them together.

**Walkthrough:**

- **Imports**: React hooks (`useEffect`, `useRef`, `useState`); icons from `lucide-react` used in the bottom nav and drawer; `onAuthStateChanged`/`signOut` from the Firebase Auth SDK; `Capacitor`, `StatusBar`/`Style`, and `Keyboard`/`KeyboardResize` from Capacitor plugins for native-shell tweaks; `auth`/`firebaseEnabled` from `@/lib/firebase` (a flag that lets the app run in a Firebase-less "demo" mode); `defaultSettings`/`loadData`/`saveSettings` from `@/lib/store` (the Firestore data-access layer); the constants and small UI primitives covered above; and every screen component.

- **Navigation tables**: `nav` is the full five-tab bottom navigation (Today/Tasks/Learn/Progress/Support, each `[id, Icon, label]`); `calmNav` is a reduced two-tab version (Today relabeled "My step", plus Support) shown instead when Calm Mode is active — directly implementing the "fewer choices while calm" design goal at the navigation level, not just within a screen.

- **Top-level state**:
  - `user`: `undefined` (still checking auth) initially if Firebase is enabled, or a synthetic `{ uid: 'demo', email: 'demo@nuvora.local' }` user immediately if Firebase is disabled — letting the whole app run in a local demo mode without any backend.
  - `screen`: the current "route" string (`'today'`, `'tasks'`, etc.) — this single piece of state *is* the router.
  - `data`: the user's loaded app data (tasks, settings, history) from Firestore, `null` until loaded.
  - `menu`: whether the side drawer is open; `menuButtonRef` is passed to `Drawer` so it can return focus to this button on close.
  - `settings` / `settingsBusy` / `settingsError`: the persisted user settings object, a save-in-flight flag, and any save error — used to drive `updateSettings` (below).
  - `calmSession`, `pausedThisSession`, `restartAcknowledged`, `showCalmExit`: the ephemeral, non-persisted Calm Mode session state described in `constants.js`, plus a few Calm-flow-specific flags passed down to `Today`.
  - `checkinDraft`: `{ step: 0, answers: {} }`, the in-progress daily check-in state, deliberately hoisted up to `NuvoraApp` (rather than living inside the `Checkin` screen) specifically so that navigating away from and back to the check-in mid-flow doesn't lose already-entered answers.
  - `previousCalmModeRef`: a ref tracking the previous value of `settings.calmMode`, used to detect the precise moment Calm Mode transitions from off to on (see the Calm-mode effect below), as opposed to it merely being true on every render.

- **Online/offline tracking** (`isOnline` state + effect): listens for the browser's `online`/`offline` events to show a subtle offline notice. The accompanying comment explains a deliberate privacy/data-retention tradeoff: Nuvora intentionally does *not* enable Firestore's persistent IndexedDB cache on the web, so that check-in data doesn't linger on a shared device after the browser session ends — the tradeoff is that an offline reload isn't guaranteed to recover in-flight session state, which is why this banner exists to set expectations.

- **Native shell setup effect**: runs once (`[]` deps), no-ops entirely if not `Capacitor.isNativePlatform()`. On native, it sets the status bar to `Style.Dark` (dark icons/text) — necessary because the app's background is a light warm cream, and the platform default status bar style would otherwise risk being invisible against it. On iOS specifically, it also sets the Keyboard plugin's resize mode to `Native`, because a WKWebView (unlike a normal Safari tab) doesn't automatically resize or scroll the page when the on-screen keyboard appears, which could otherwise hide fixed-position inputs. Both calls are defensively wrapped with `.catch(() => {})` since plugin calls can fail on unsupported configurations and shouldn't crash the app.

- **Calm Mode "just enabled" effect**: computes `justEnabled = settings.calmMode && !previousCalmModeRef.current`, then immediately updates the ref for next time. If Calm Mode was *just* turned on (not merely still on from a previous render), it resets all the ephemeral Calm session state to defaults and, if the user happens to be on a "choice-heavy" screen (`tasks`, `learn`, or `progress`), forcibly navigates them back to `today` and closes the menu. The comment is explicit about the design intent: this bounce-back only happens at the *moment* Calm Mode turns on — deliberate navigation to those screens afterward is not repeatedly bounced back, since that would fight the user rather than support them.

- **Auth listener effect**: if `firebaseEnabled`, subscribes to `onAuthStateChanged(auth, setUser)` (Firebase pushes the current user, or `null`, directly into `user` state); if Firebase is disabled, this is a no-op (`undefined` returned, matching the synthetic demo user set at initialization).

- **Data loading** (`loadStatus` state: `idle | loading | success | error`, plus `retryTick` used purely as a dependency-trigger to force a re-fetch): the effect depends on `[user, retryTick]`, does nothing if there's no `user` yet, and otherwise calls `loadData(user.uid)`. On success, it stores the data, **first** syncs `previousCalmModeRef` to the loaded settings' `calmMode` value (so the "just enabled" effect above doesn't misfire on the very first render once real settings arrive — it needs to treat the initial load as a baseline, not a transition), then sets `settings` and marks `loadStatus` as `'success'`. On failure, it sets `loadStatus` to `'error'` rather than leaving the app stuck — the accompanying comment notes this used to have no failure path at all, silently leaving `data` as `null` forever with the user stranded on the splash screen with no explanation or recovery option. A `cancelled` flag guards against setting state after the effect's own cleanup (e.g. if `user` changes again before the fetch resolves).

- **Onboarding tracking**: uses a plain `localStorage` flag (`'nuvora-onboarding-seen'`) read lazily in `useState`'s initializer, guarded for SSR (`typeof window !== 'undefined'`) since this component can run during Next.js's static export/build.

- **Render gating (the actual "router")**, evaluated as an ordered sequence of early returns before the main UI:
  1. `user === undefined` → `<Splash />` (auth state not yet known).
  2. `!user` (explicitly logged out / never logged in) → if Firebase is enabled and onboarding hasn't been seen yet, show `<Onboarding>` (marking it done in `localStorage` and state once finished); otherwise show `<Auth />`.
  3. `loadStatus === 'error'` → `<LoadError>` with `onRetry` (bumps `retryTick` to re-trigger the load effect) and `onSignOut` (signs out via Firebase, or just reloads the page in demo mode).
  4. `!data` (still loading) → `<Splash />` again.
  5. Otherwise, the full app shell renders.

- **`go(s)` helper**: the actual navigation function passed to every screen — sets `screen` and closes the menu in one call, so screens never have to remember to close the drawer themselves.

- **`visibleNav`**: picks `calmNav` or the full `nav` array based on `settings.calmMode`, directly driving what the bottom nav bar renders.

- **`updateSettings(next)`**: the single write-path for settings changes, used by the Calm toggle in the header and passed down to several screens. Guards against overlapping saves (`if (settingsBusy) return`), optimistically updates local `settings` state immediately (so the UI feels instant), then persists via `saveSettings(user.uid, next)`, catching failures into `settingsError` (using the shared `GENERIC_ERROR` string from `constants.js`) and always clearing `settingsBusy` in a `finally` block regardless of outcome.

- **`calmReducedMotion`**: derived flag combining `settings.calmMode` with the *ephemeral* `calmSession.reduceMotion` preference — i.e., reduced motion during a Calm session can come from either the persistent app-wide `settings.reducedMotion` toggle or this session-only Calm preference; both feed into the `.reduced` class applied to `<main>` (which `base.css` uses to hard-disable animations/transitions).

- **Main render**: the outer `<main>` element's `className` is built dynamically from three conditions — `'calm'` (if Calm Mode on, driving the `--bg` token swap), `'reduced'` (if either reduced-motion source is active), and `'calm-low-detail'` (if Calm Mode is on *and* the session's `reduceVisualDetail` preference is set). Its inline `style={{ '--scale': settings.textScale }}` sets a CSS custom property consumed by `base.css`'s `main { font-size: calc(16px * var(--scale, 1)) }` rule — this is how the user's text-size preference scales the entire app's base font size from one place.
  - Inside `.phone`: a `<header>` with the menu-open icon button, the `Logo`, and the Calm Mode toggle button (`aria-pressed`, dynamic label/icon, disabled while a settings save is in flight to prevent double-submits).
  - Conditionally rendered banners: a `StatusMessage` for `settingsError`, and a plain offline notice paragraph when `!isOnline`.
  - The `Drawer` (menu), containing links to Accessibility settings, Privacy & data, Sign out, and a fixed disclaimer line ("Nuvora provides academic support, not medical advice or diagnosis") — an explicit scope-of-care boundary shown on every visit to the menu.
  - The main `.content` div, which gets an extra `overwhelmed-bg` class specifically when `screen === 'overwhelmed'` (tying back to the deliberate visual distinction from Calm Mode discussed in `base.css`). Inside it, a chain of `screen === 'x' && <X ... />` expressions renders exactly one screen component at a time based on the `screen` state string — this conditional-chain *is* the router; there's no separate routing library or Next.js route per screen. Each screen receives whatever slice of state and callbacks it needs as props (e.g. `Today` alone receives essentially all of the Calm-session state and setters, since it's the screen most affected by Calm Mode).
  - The bottom `<nav>` is hidden entirely on screens where it wouldn't make sense (`checkin`, `overwhelmed`, `settings`, `reflection`, `privacy` — all "focused task" or "sub-page" screens rather than top-level destinations), and otherwise maps over `visibleNav` to render one button per tab, marking the current `screen` as `.active` and calling `go(id)` on click.

- **Overall architecture note**: this file demonstrates a common but noteworthy pattern for a Capacitor-wrapped static export — rather than using Next.js's file-based router (which doesn't play well with `output: 'export'` + client-side native shells), the *entire* app is one route, and all navigation is plain React state (`screen`) with manual conditional rendering. This keeps the mental model simple (one big switchboard) at the cost of this file knowing about literally every screen in the app.
## Part 2: lib/ — Core Logic & Data Modules

### lib/authErrors.js

**Purpose.** A single translation layer between Firebase Authentication's raw error codes and the calm, supportive copy Nuvora shows students. It exists so no screen ever has to embed Firebase's developer-facing error strings directly, and so the "don't reveal whether an email has an account" security decision lives in exactly one place.

**Walkthrough.**
- `MESSAGES` is a plain lookup object keyed by Firebase Auth error codes (`auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found`, `auth/invalid-email`, `auth/email-already-in-use`, `auth/weak-password`, `auth/too-many-requests`, `auth/network-request-failed`, `auth/requires-recent-login`, `auth/user-mismatch`, `auth/user-disabled`). The header comment documents a deliberate security choice: login and signup share the *same* vague "email or password doesn't match" message for invalid-credential/wrong-password/user-not-found, specifically to avoid account-enumeration (an attacker probing whether an email is registered). The one exception is "email already in use," which is kept specific because Firebase's own signup flow already reveals that fact regardless of wording — hiding it here would add no privacy benefit while making the message less useful to a legitimate user who mistyped a login attempt as a signup.
- `DEFAULT_MESSAGE` is the generic fallback ("Something went wrong...") for any error code not in the table.
- `authErrorMessage(error, fallback = DEFAULT_MESSAGE)` is the only export: it looks up `error?.code` in `MESSAGES` and returns the mapped string, or `fallback` if there's no match. The optional-chaining on `error?.code` means it tolerates being called with `null`/`undefined` rather than throwing, which matters in a catch-block context where the shape of the caught value isn't always guaranteed.

This module has no dependencies on other `lib/` files and is a leaf consumed by auth-related UI (login/signup screens, account deletion flow).

### lib/dates.js

**Purpose.** Centralizes all "how urgent is this due date" logic in one place, described in its header comment as "supportive date handling for time-blindness" — a deliberate accessibility feature for neurodivergent users who may struggle to intuitively judge how much time is left. Every other module that needs to reason about deadlines (recommendation.js, pressure.js) goes through this file rather than doing its own date math, keeping the urgency semantics consistent app-wide.

**Walkthrough.**
- `startOfDay(d)` (private) truncates a `Date` to midnight local time, used so all comparisons happen at day resolution rather than exact-time resolution — the header comment explains this is because tasks only store a due *date*, not a due time.
- `parseDate(due)` turns a `YYYY-MM-DD` string into a `Date` (anchored at local midnight via the `T00:00:00` suffix), returning `null` for a falsy input or an unparseable string (guarded via `Number.isNaN(d.getTime())`).
- `daysUntil(due, now = new Date())` returns the whole number of calendar days between `now` and `due` (negative if overdue), computed by diffing two `startOfDay()`-normalized timestamps and dividing by the milliseconds-per-day constant. Returns `null` if `due` doesn't parse.
- `relativeDueLabel(due, now)` converts `daysUntil` into a human string: "No due date", "Overdue by N days", "Due today", "Due tomorrow", or "N days left". The comment stresses this wording is deliberately factual and non-shaming — never "you're late" or flashing UI treatment.
- `isOverdue`, `isDueWithin48h`, `isDueWithinDays(due, days, now)` are boolean predicates built on `daysUntil`. Notably `isDueWithin48h` is implemented as "due today or tomorrow" (0 or 1 days away), not a literal 48-hour clock calculation — the header comment flags this equivalence explicitly since it could otherwise look like a bug.
- `URGENCY_ORDER` is a fixed array `['overdue', 'today', 'tomorrow', 'week', 'later', 'none']` defining a canonical severity ordering, used both for grouping tasks visually and for ranking which task to recommend — keeping the two concerns from disagreeing with each other.
- `urgencyCategory(due, now)` buckets a date into one of those six categories.
- `urgencyRank(due, now)` returns the category's index in `URGENCY_ORDER`, i.e., a sortable integer — this is what `recommendation.js` imports to sort tasks by urgency.
- `effectiveBucket(task, now)` computes which UI bucket ("today"/"week"/"later") a task should currently display under, based on its due date rather than trusting the tab it was originally created in — so a task doesn't get "stuck" showing as "later" once its date arrives. Tasks with no due date fall back to `task.bucket` (or `'later'`) since there's no date to compute from.

No imports from other `lib/` files; this is a foundational, dependency-free module that `pressure.js` and `recommendation.js` both build on.

### lib/explain.js

**Purpose.** Generates the plain-language "Why this result?" bullet list shown alongside a pressure/check-in score — translating the numeric factor weights into sentences a student can actually read, without inventing an explanation that could drift out of sync with the underlying scoring math.

**Walkthrough.**
- Imports `countDeadlines` and `deadlineAdjustment` from `./pressure`, and `PRESSURE_LABELS`/`PRESSURE_WEIGHTS` from `./pressureConfig`.
- `rankFactorContributions(factors)`: for each key in `PRESSURE_WEIGHTS` (workload, taskInitiation, focus, rest, confidence), builds `{ key, label, value, contribution }` where `contribution = factors[key] * weight`, then sorts descending by contribution. The comment explains this reuses the *same* weights `calculatePressure()` (in risk.js) uses, guaranteeing the explanation can never claim a different factor was "biggest" than what actually drove the score.
- `resolveDeadlineInfo(risk, tasks, now)` (private): if the check-in already stored `risk.deadline` (current data shape from `pressure.js`'s `combineWorkloadPressure`), reuse it as-is; otherwise recompute it from the live task list via `countDeadlines` + `deadlineAdjustment`. This is a soft-migration strategy — older saved check-ins predating the deadline-adjustment feature don't have `risk.deadline`, and this function backfills it on read rather than requiring a data migration script.
- `explainPressure(risk, tasks = [], now = new Date())` is the main export. It builds a `bullets` array:
  1. Ranks factors via `rankFactorContributions(risk.factors)`. If the top contributor's `contribution > 0`, adds a sentence naming it as "the largest contributor today."
  2. For every other factor, adds "increased the result" if its raw `value >= 60`, or "had a smaller effect" if `value <= 20` — values in between get no comment, avoiding noise for mid-range factors.
  3. Resolves deadline info and appends singular/plural-aware sentences about overdue counts and due-within-48h counts, and — if `deadlineInfo.points > 0` — a sentence quantifying how many points deadlines added to the score.
  4. If no bullets were generated at all, falls back to "No single factor stood out today." so the UI is never left with an empty explanation section.

Depends on `pressure.js` and `pressureConfig.js`; is itself depended on by `patterns.js`.

### lib/firebase.js

**Purpose.** Initializes and exports the Firebase SDK singletons (`auth`, `db`) that the rest of the app's data layer (`store.js`) uses, and centralizes the two security-sensitive account-deletion primitives: re-authentication and account deletion. It also defines `firebaseEnabled`, the single flag that determines whether Nuvora runs against real Firebase or a local-only demo mode.

**Walkthrough.**
- Imports `getApp`/`getApps`/`initializeApp` from `firebase/app`; `EmailAuthProvider`, `getAuth`, `reauthenticateWithCredential`, and `deleteUser` (aliased `firebaseDeleteUser`) from `firebase/auth`; `getFirestore` from `firebase/firestore`.
- `config` reads six `NEXT_PUBLIC_FIREBASE_*` environment variables (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) — the `NEXT_PUBLIC_` prefix is required by Next.js to expose them to client-side code.
- `firebaseEnabled` is `true` only if both `apiKey` and `projectId` are present. This is the flag `store.js` checks everywhere to decide between Firestore calls and `localStorage`.
- `app` is conditionally created: if `firebaseEnabled`, either reuses an already-initialized app (`getApps().length ? getApp() : initializeApp(config)` — guards against Next.js hot-reload/double-initialization errors) or is `null` if Firebase isn't configured.
- `auth` and `db` are likewise `null` when Firebase isn't configured, or the real Auth/Firestore instances otherwise. Every consumer must therefore treat `auth`/`db` as possibly-null.
- A long comment explains a specific architectural choice: Firestore Web's default in-memory cache is used, but persistent IndexedDB caching is *deliberately not* enabled, because check-ins and workload data may be sensitive on a shared computer. It explicitly notes this means "closing the browser" should not be described as guaranteed offline persistence, and floats a possible future "trusted device" opt-in.
- `reauthenticate(password)`: re-authenticates the current user by building an `EmailAuthProvider` credential from `auth.currentUser.email` + the given password, then calling `reauthenticateWithCredential`. Throws `'Not signed in.'` if there's no current user, or a message about missing email if the account has none (e.g., a hypothetical non-email auth provider). The comment explains *why* this exists as a separate exported step: account deletion must re-authenticate *before* deleting Firestore data, so the well-known `auth/requires-recent-login` failure is caught before any destructive Firestore work happens — not after.
- `deleteAccount()`: throws if not signed in, otherwise calls `firebaseDeleteUser(user)`. The comment is explicit that the surrounding three-step sequence (reauthenticate → delete Firestore data → deleteAccount) is owned by the Privacy screen, not this module, and that the overall operation is *not* transactional across the two separate services (Auth and Firestore) — a later failure could theoretically leave things partially deleted, which the comment flags as a documented risk-reduction rather than a guarantee.

No `lib/` imports; `store.js` imports `db` and `firebaseEnabled` from here, and the account-deletion UI presumably imports `reauthenticate`/`deleteAccount` directly.

### lib/greeting.js

**Purpose.** Small pure helpers for the home-screen greeting header — replacing what the comment says used to be a hardcoded "GOOD MORNING" and fixed "J" initial with values computed from the real clock and the signed-in user's own display name.

**Walkthrough.**
- `timeOfDayGreeting(now = new Date())`: returns "Good morning" (hour < 12), "Good afternoon" (hour < 18), or "Good evening" otherwise, using the local hour (`now.getHours()`).
- `displayNameOrFallback(displayName)`: trims the given name and returns it, or the neutral fallback `'there'` if it's empty/whitespace-only — the comment notes this deliberately avoids "inventing or guessing a name."
- `avatarInitial(displayName)`: returns the first character of the trimmed name, uppercased, or a middle-dot `'·'` placeholder if there's no name to draw from.

No `lib/` dependencies; purely presentational logic consumed directly by a header/home component.

### lib/modules.js

**Purpose.** Derives the list of selectable "module" (course/subject) chips and their display colours directly from the student's own task data, rather than maintaining a separate hardcoded list that could fall out of sync with what a student has actually typed.

**Walkthrough.**
- `STARTER_MODULES = ['Dissertation', 'Other']`: the baseline set shown to a brand-new account with no tasks yet.
- `availableModules(tasks = [])`: collects every non-empty `t.module` value actually used across `tasks`, unions it with `STARTER_MODULES` via a `Set` (dedupes), then re-sorts so `'Other'` — if present — is always moved to the end, so it visually reads as a catch-all option rather than a real subject a student named.
- `NAMED_MODULE_COLORS`: a fixed map giving specific named modules from "the original prototype" (Dissertation, Database Systems, HCI Group Project, Web Development) a stable colour, preserved for continuity with earlier design work.
- `FALLBACK_PALETTE = ['purple', 'teal', 'amber', 'blue']`.
- `moduleColor(name)`: returns the named colour if `name` is in `NAMED_MODULE_COLORS`; otherwise computes a simple deterministic hash of the module name's characters (`hash = (hash * 31 + charCode) >>> 0` — a classic polynomial rolling hash, `>>> 0` keeps it an unsigned 32-bit int) and picks `FALLBACK_PALETTE[hash % 4]`. This means any module name a student types themselves gets a *consistent* colour across renders/sessions without Nuvora ever having to persist a colour assignment for it.

No `lib/` dependencies; consumed by the Tasks screen and the add/edit-task form wherever module chips are rendered.

### lib/patterns.js

**Purpose.** Looks for genuine multi-check-in trends (as opposed to reading meaning into a single day's data) to power the "Progress" screen's plain-language insights, and also powers a small UX optimization for Overwhelmed Mode (reordering barrier options by what's actually helped before).

**Walkthrough.**
- Imports `rankFactorContributions` from `./explain`.
- `DAY_NAMES` and `LABELS` are display-string lookup tables (day-of-week names; factor key → human label, duplicating `PRESSURE_LABELS` from pressureConfig.js locally rather than importing it — worth noting as a small duplication, though harmless since the same five keys are used).
- `checkinDate(c)` (private): normalizes a check-in's `createdAt`, which may be a Firestore Timestamp-like object (`{ seconds }`) or a plain value, into a JS `Date`.
- `mostFrequentContributor(checkins, sampleSize = 8)`: takes the most recent `sampleSize` scored check-ins (i.e., those with `c.risk.factors`), and for each finds its single top contributing factor via `rankFactorContributions`. Tallies how often each factor "wins." Requires at least 3 scored check-ins to say anything (`scored.length < 3` → `null`), and requires the winning factor to have won in a genuine majority (`count >= Math.ceil(scored.length / 2)`) — the comment stresses that winning 2-of-5 isn't a real pattern, "it's just the most common of five roughly-even options." Returns `{ factor, label, count, of }` or `null`.
- `dayOfWeekPattern(checkins)`: groups scored check-ins by day-of-week and averages their pressure scores, requiring at least 6 total scored check-ins, at least two distinct weekdays each with ≥2 samples, and a gap of at least 15 points between the highest- and lowest-averaging day — again explicitly to avoid "describing noise as if it meant something." Returns `{ highestDay, highestAvg, lowestDay, lowestAvg }` or `null`.
- `buildPatternInsights(checkins)`: combines both functions above into an array of ready-to-display sentences. Deliberately returns an *empty array* (not a "not enough data yet" placeholder message) when nothing qualifies — the comment explains this avoids the section feeling like a demand to check in more often.
- `orderByUsage(items, usageCounts, idKey = 'id')`: a generic stable-sort helper — copies `items` and sorts descending by `usageCounts[item[idKey]] || 0`. Used to reorder Overwhelmed Mode's barrier/strategy options so previously-helpful ones surface first, reducing decision friction exactly when decision-making is hardest. Being a stable sort matters: items tied at zero usage (e.g., a new user's first time) keep their original authored order rather than shuffling arbitrarily.

Depends on `explain.js` (and transitively on `pressure.js`/`pressureConfig.js`/`risk.js`/`dates.js`).

### lib/pressure.js

**Purpose.** Layers a small, capped, rule-based deadline adjustment on top of the self-reported pressure score from `risk.js`, without ever altering the self-report weights/thresholds themselves. This is the module that connects "how a student says they feel" with "how many things are actually overdue."

**Walkthrough.**
- Imports `isDueWithin48h`, `isDueWithinDays`, `isOverdue` from `./dates`, and `bandFromScore` from `./risk`.
- `LEVELS`: an ordered array of adjustment tiers, each `{ level, points, test }`, checked top-to-bottom and the *first* match wins (levels are never summed):
  - `'high'` (+20 points) if `overdueCount >= 2`
  - `'moderate'` (+12) if exactly 1 overdue task OR ≥2 due-soon tasks
  - `'mild'` (+5) if exactly 1 due-soon task OR ≥3 due-this-week tasks
  - `'none'` (+0) fallback (`test: () => true`)
- `countDeadlines(tasks, now = new Date())`: filters to open (`!t.done`) tasks, then buckets each into exactly one of three mutually-exclusive tiers so nothing double-counts: `overdueCount` (via `isOverdue`), `dueSoonCount` (not overdue AND `isDueWithin48h`), `dueWeekCount` (not overdue, not due-soon, AND `isDueWithinDays(..., 7, ...)`). Returns `{ overdueCount, dueSoonCount, dueWeekCount }`.
- `deadlineAdjustment(counts)`: finds the first matching `LEVELS` entry for the given counts and returns `{ level, points }`.
- `combineWorkloadPressure(baseRisk, tasks, now = new Date())`: the main integration point. Computes `countDeadlines` + `deadlineAdjustment`, adds `points` to `baseRisk.score` (capped at 100 via `Math.min`), re-bands the *adjusted* score using `bandFromScore` from risk.js (so the same Low/Moderate/Higher thresholds apply to both the raw and adjusted score), and returns a new object spreading `baseRisk` but overriding `score`/`band`/`message`, adding `baseScore` (preserving the original self-report figure so it's never lost) and `deadline: { ...counts, level, points }` (this is the shape `explain.js`'s `resolveDeadlineInfo` looks for first).

Depends on `dates.js` and `risk.js`; depended on by `explain.js`.

### lib/pressureConfig.js

**Purpose.** The single source of truth for the self-report scoring model's factor weights and display labels — deliberately extracted into its own tiny module so the scoring engine (`risk.js`) and the explanation layer (`explain.js`) can never drift apart by each hardcoding their own copy of the weights.

**Walkthrough.**
- `PRESSURE_WEIGHTS` (frozen via `Object.freeze`): `{ workload: 0.30, taskInitiation: 0.25, focus: 0.20, rest: 0.15, confidence: 0.10 }` — sums to 1.0, a standard weighted-average setup. Freezing prevents accidental mutation by any consumer.
- `PRESSURE_LABELS` (frozen): human-readable label per factor key, e.g. `workload → 'Workload feeling'`. The comment notes any future dissertation-backed change to the model belongs here, and should be covered by the scoring tests.

No dependencies; imported by `risk.js` and `explain.js`.

### lib/recommendation.js

**Purpose.** Deterministically picks the single "one small next action" Nuvora surfaces to a student — the core of the app's task-prioritization feature — and adjusts how *small* the suggested step sounds based on the student's current pressure band, without ever changing which task gets picked.

**Walkthrough.**
- Imports `parseDate`, `urgencyRank` from `./dates`.
- The header comment spells out a fixed, five-level tie-breaking rule so the same input always yields the same recommendation: (1) only open (`!done`) tasks are considered; (2) primary sort is urgency rank (overdue → today → tomorrow → week → later → none, from `dates.js`); (3) ties broken by the user's own `priority` (high/normal/low); (4) further ties broken by earlier due date; (5) any remaining tie preserves original array order (stable sort).
- `PRIORITY_RANK = { high: 0, normal: 1, low: 2 }` — lower number sorts first.
- `priorityRank(task)` (private): looks up the task's priority, defaulting to `'normal'` via `??` if `task.priority` is missing/unrecognized.
- `dueTimestamp(task)` (private): parses `task.due` via `parseDate` and returns its epoch ms, or `Infinity` if there's no valid due date (so undated tasks always sort last within a tie).
- `pickPriorityTask(tasks, now = new Date())`: filters to open tasks, returns `null` if none remain, otherwise sorts a *copy* of the array (`[...open]`, preserving the input) by urgency, then priority, then due timestamp, and returns the first element.
- `recommendAction(tasks, band, now = new Date())`: calls `pickPriorityTask`, returns `null` if nothing's open. Otherwise builds `stepText` from the task's `currentStep.text` (falling back to a generic "Open this task and note one small first action." if there's no current step). If `band === 'Higher'` (i.e., the student's current pressure is high), overrides the action text with a deliberately tiny instruction — "Just open '{title}'. Nothing else is needed right now." — rather than the normal step text. The comment is explicit that this only shrinks the *size* of the suggested action; it never changes which task was picked and never hides an urgent deadline by, say, silently recommending a less-overdue task instead.

Depends on `dates.js`; the `band` parameter it receives originates from `risk.js`'s `bandFromScore` (or `pressure.js`'s adjusted band), tying this module indirectly to the scoring pipeline.

### lib/risk.js

**Purpose.** The self-report pressure-scoring engine itself: validates a check-in's raw answers, converts them into per-factor 0–100 scores, computes the weighted overall score, and bands it into Low/Moderate/Higher with supportive messaging. This is the most "clinical" module in `lib/` and the one the dissertation's scoring model centers on.

**Walkthrough.**
- Imports `z` from `zod` and `PRESSURE_WEIGHTS` from `./pressureConfig`.
- `checkInSchema`: a Zod object schema validating five integer fields with specific ranges: `mood` (1–4), `sleep` (1–5), `focus` (1–5), `initiation` (1–5), `confidence` (1–5). This is the single point where raw check-in form input is validated before any scoring math touches it.
- `bandFromScore(score)`: pure banding function — `score > 66` → `{ band: 'Higher', message: "...Let's shrink today to one small step." }`; `score > 33` → `{ band: 'Moderate', message: "...Let's choose one manageable next step." }`; else → `{ band: 'Low', message: 'Your workload feels manageable...' }`. Exported separately (not inlined into `calculatePressure`) specifically so other code — notably `pressure.js`'s `combineWorkloadPressure` — can re-band an already-adjusted score using identical thresholds and wording, rather than duplicating the band logic.
- `calculatePressure(input)`: the main scoring function.
  1. Parses/validates `input` through `checkInSchema.parse` — throws a Zod validation error on bad input (fail-fast rather than silently coercing).
  2. `invert(value)` (local helper): maps a 1–5 scale where *higher input = better* into a 0–100 scale where *higher output = more pressure*, via `((5 - value) / 4) * 100`. This is used for sleep, focus, initiation, and confidence — all of which are asked as "how good/rested/focused/confident do you feel," so a high self-report of wellbeing should *lower* the pressure factor.
  3. `mood` is handled differently: `((c.mood - 1) / 3) * 100` scales the 1–4 mood field *without* inverting — implying mood is likely asked in a "how stressed do you feel" direction (1 = least, 4 = most) rather than a wellbeing direction, opposite to the other four fields. This asymmetry is worth flagging for anyone modifying the check-in form: swapping the mood question's polarity without updating this formula would silently invert the workload factor.
  4. Builds `factors = { workload, taskInitiation, focus, rest, confidence }`, each rounded to an integer 0–100.
  5. `score` is the weighted sum of all five factors against `PRESSURE_WEIGHTS`, rounded.
  6. Returns `{ score, factors, ...bandFromScore(score) }` — i.e., `{ score, factors, band, message }`.

Depends only on `pressureConfig.js` (plus the external `zod` package); depended on by `pressure.js` and `store.js` (which uses `bandFromScore` to generate its demo-seed check-ins consistently with the real scoring engine).

### lib/steps.js

**Purpose.** Provides the fixed, rule-based "micro-step" templates that break an academic task into small, non-overwhelming next actions — one progression per task type. The header comment is emphatic that these are *not* AI-generated or personalized text, and the UI must never claim they are; a task's own title/content never influences which text is shown, only its `taskType` does.

**Walkthrough.**
- `TASK_TYPES`: the six selectable task categories with `{ id, label }` — general, essay, presentation, exam, lab, group.
- `ALTERNATIVE_STEPS`: three generic "if the suggested step doesn't fit" fallback options, always the same three regardless of task type.
- `PROGRESSIONS`: an object mapping each task-type id to a fixed ordered array of 4–5 step strings that task type moves through as steps are completed (e.g. essay: title → thesis sentence → three points → one paragraph's topic sentence → review). Every progression is designed around "small, safe first actions" (open the file, write only a title, etc.) reflecting the app's task-initiation-friction focus.
- `progressionFor(taskType)` (private): looks up `PROGRESSIONS[taskType]`, defaulting to `PROGRESSIONS.general` for unrecognized/missing types.
- `initialStepText(taskType)`: returns the first entry of that type's progression — used when a task is first created.
- `counter` + `stepId(taskId)` (private, module-level mutable state): a simple incrementing counter used to build unique-ish step ids like `${taskId}-step-${counter}`. Because `counter` is module-level (not per-task), ids are unique within a single running session, though this means ids aren't stable/deterministic across reloads — fine since steps are keyed by their own id only transiently in the UI, not relied upon for cross-session identity.
- `suggestAlternativeSteps(task)`: maps `ALTERNATIVE_STEPS` into full step objects `{ id, text, done: false, completedAt: null }` for the given task, using `stepId(task.id)` for each.
- `makeCustomStep(task, text)`: builds a step object from arbitrary user-typed text (trimmed), for when a student writes their own step instead of picking a suggested one.
- `nextStepAfter(task)`: finds the task's current step's text within its type's progression array (`seq.indexOf(task.currentStep?.text)`), and returns the *next* entry, or — if the progression is exhausted (index not found or at the end) — a supportive closing message: "Take a short break — you have made real progress today." This is how a task's step chain advances automatically once the current step is marked done.

No `lib/` imports; consumed by `store.js` callers (task-creation and step-completion flows) and the Tasks UI.

### lib/store.js

**Purpose.** This is Nuvora's central data-access layer — the single place that knows how to read and write every piece of app state (tasks, check-ins, reflections, settings, and non-comparative usage stats), and the one module that decides, per call, whether that data lives in Firestore or in browser `localStorage`. Every screen that needs persisted data goes through this module rather than talking to Firebase or `localStorage` directly, which is what lets the whole app work identically in a demo/offline mode and in a real signed-in Firebase mode.

**Walkthrough — imports and mode switch.**
- Imports Firestore functions (`addDoc`, `collection`, `deleteDoc`, `doc`, `getDoc`, `getDocs`, `increment`, `orderBy`, `query`, `serverTimestamp`, `setDoc`, `updateDoc`) from `firebase/firestore`; `db` and `firebaseEnabled` from `./firebase`; `bandFromScore` from `./risk`.
- Nearly every exported function in this file starts with `if (!firebaseEnabled) { ...localStorage path... } ... else { ...Firestore path... }` — `firebaseEnabled` (from `firebase.js`) is the single switch that routes every read/write to one backend or the other. This dual-path design means the whole app can run fully client-side/offline (no Firebase project configured) using a `localStorage` blob, or against real per-user Firestore data, using the *same* function signatures either way.

**Shape of the data held.**
- `key = 'nuvora-demo-data-v1'`: the `localStorage` key holding the entire local-mode dataset as one JSON blob: `{ tasks, checkins, reflections, settings, stats }`.
- `defaultSettings`: `{ calmMode, reducedMotion, textScale, displayName, hideProgress, supportPersonName, supportPersonNote, restartMemory }` — accessibility/personalization preferences plus a "support person" contact and a `restartMemory` slot (see below).
- `defaultStats = { stepsCompleted: 0, strategyUses: { start, big, energy, reset, support: 0 } }`. The comment is explicit that this is deliberately *not* "tasks completed" or "average pressure" — those would read as a productivity score. Instead it's a small, non-comparative count of small steps taken and which support strategies were used, with **no streaks, targets, or missed-day tracking** — a direct reflection of the app's neurodivergent-support design philosophy of avoiding shame/pressure-inducing gamification.
- In Firestore mode, each user's data lives under `users/{uid}` (the doc itself holds `settings` and `stats`) with subcollections `tasks`, `checkins`, `reflections`.

**Demo seed generation.**
- `dayOffset(offset)` / `timeAgo(daysAgo)` (private): produce ISO date/datetime strings relative to *now*, not hardcoded dates — the comment notes an earlier version used fixed 2026-08 dates that eventually became stale (looked like "old" data by the time anyone revisited it).
- `buildSeed()` (private): constructs the demo dataset shown to a fresh no-Firebase session. `trendScores = [78, 65, 60, 52, 45, 30, 28]` (oldest→newest) is fed through `bandFromScore` (imported from `risk.js`) to generate seed check-ins with internally-consistent `{ score, band, message, factors }` — the comment stresses this reuses the *real* scoring engine's banding logic rather than hand-typing numbers that could silently drift from actual app behavior. Six sample tasks are built spanning overdue/today/this-week due dates across a few modules, each with a `currentStep`. Two sample `reflections` and a starter `stats` object round it out.

**Migration.**
- `migrateTask(t)`: upgrades an older task shape (which stored a flat `step` string) to the current shape (a full `currentStep` object), so that completing a micro-step is structurally distinct from completing a whole task. Applied on every task read (both local and Firestore paths) so no explicit migration/batch-update step is ever needed — old data self-upgrades the moment it's loaded. Also backfills `priority: 'normal'` and `taskType: 'general'` defaults for tasks created before those fields existed, using `{ priority: 'normal', taskType: 'general', ...t }` (spread order means `t`'s own values win if present).

**Local read/write plumbing.**
- `localRead()` (private): SSR-safe (`typeof window === 'undefined'` → returns `buildSeed()` since there's no `localStorage` on the server); otherwise reads the `key` from `localStorage`, parses it as JSON, and falls back to `buildSeed()` if the value is missing, unparseable, or not a plain non-array object — treating any unexpected shape the same as corrupted data, on the principle (per the comment) that starting fresh beats crashing on missing fields.
- `localWrite(data)` (private): serializes and writes the whole blob back to `localStorage`, returning it for convenience.

**Sanitization helpers.**
- `sanitizeRestartMemory(raw)` (private): validates a `restartMemory` object field-by-field (string types, length caps — 200 chars for title, 500 for step text — and a parseable date for `stoppedAt`), returning `null` if any required field (`taskId`, `stepText`, `stoppedAt`) is missing/invalid. This looks like it backs a "resume where a student left off" feature (a step they stopped mid-way).
- `sanitizeSettings(raw)` (private): coerces every settings field to its expected type, falling back to `defaultSettings`'s value *individually* per field — so one corrupted/wrong-typed field never invalidates the rest of a student's saved preferences. Delegates `restartMemory` to `sanitizeRestartMemory`.
- `sanitizeStats(raw)` (private): same per-field defensive pattern for `stepsCompleted` and each key inside `strategyUses`.

**Public data-access functions** (each with a `localStorage` branch and a Firestore branch):
- `loadData(uid = 'demo')`: local branch reads the blob, maps tasks through `migrateTask`, defensively `Array.isArray`-checks each collection, and sanitizes settings/stats. Firestore branch runs three ordered (`orderBy('createdAt', 'desc')`) queries for tasks/checkins/reflections plus a `getDoc` on the user document, applying the same migration/sanitization to the results — so callers get an identical shape either way.
- `addTask(uid, task)`: local branch generates a `crypto.randomUUID()` id and ISO timestamps, unshifts onto the local array; Firestore branch uses `addDoc` with `serverTimestamp()`. Both run the new task through `migrateTask` before returning it.
- `toggleTask(uid, id, done)`: flips only the `done` flag on the whole task (distinct from step completion below).
- `removeTask(uid, id)`: deletes a task entirely.
- `updateTask(uid, id, patch)`: patches a task's own fields (title/module/due/priority) — the comment notes this is deliberately kept separate from anything touching `currentStep` or `done`, i.e. three narrow, non-overlapping update functions rather than one do-everything updater.
- `setCurrentStep(uid, id, step)`: replaces a task's current micro-step object outright (used when editing step text or picking a different suggested step).
- `completeCurrentStep(uid, id, done = true)`: marks *only* the current step done/undone (with a `completedAt` timestamp), explicitly never touching the parent task's own `done` flag — enforcing the app's core distinction between "finished this tiny step" and "finished the whole assignment."
- `saveCheckin(uid, data)`: appends a new check-in (local: unshift with generated id/timestamp; Firestore: `addDoc` with `serverTimestamp`).
- `saveReflection(uid, data)`: same pattern for free-text weekly reflections — the comment notes these are entirely the student's own words, never summarized/generated on their behalf, and are covered by the same Phase 4 deletion sweep as other data.
- `saveSettings(uid, settings)`: merges incoming settings over `defaultSettings`, sanitizes, then persists (`localWrite` or Firestore `setDoc` with `{ merge: true }`).
- `recordStepCompleted(uid)`: increments `stats.stepsCompleted` by 1 (local: manual `+1`; Firestore: atomic `increment(1)`) — framed in the comment as feeding a gentle "small steps taken" count, never a streak/target.
- `recordStrategyUse(uid, barrierId)`: increments `stats.strategyUses[barrierId]` by 1, tracking which Overwhelmed Mode strategies were actually *used* (not merely viewed) — this is what `patterns.js`'s `orderByUsage` consumes to reorder strategy options.

**Data deletion (Phase 4).**
A block of narrowly-scoped deletion functions, each documented as deleting *exactly* its named category and nothing else, so the Privacy screen's plain-language claims ("delete check-in history leaves tasks alone") are actually true of the implementation:
- `deleteAllDocsIn(uid, subcollection)` (private): fetches every doc in a Firestore subcollection and deletes them all in parallel via `Promise.all`.
- `deleteCheckinHistory(uid)`: clears `checkins` and `reflections` only.
- `deleteCompletedTasks(uid)`: removes only tasks where `done` is true.
- `deleteAllData(uid)`: the full reset — all tasks (not just completed), all check-ins/reflections, settings, and stats. In local mode, it explicitly writes a fresh empty-but-structured object rather than deleting the `localStorage` key outright — deleting the key would make `localRead()` fall back to `buildSeed()`'s demo data, silently *undoing* the deletion the student just requested. In Firestore mode it also deletes the `users/{uid}` document itself (not just its subcollections), since settings/stats live there.
- `exportAllData(uid)`: builds a JSON-exportable snapshot by calling `loadData(uid)` (rather than re-reading storage independently) and adding an `exportedAt` timestamp — reusing `loadData` guarantees the export always matches exactly what the app itself currently shows.

**Cross-module role.** `store.js` is the busiest hub in `lib/`: it depends on `firebase.js` (for `db`/`firebaseEnabled`) and `risk.js` (for `bandFromScore`, used only in demo-seed generation), and it is almost certainly the module that screens/components import most heavily for all task/check-in/settings/stats CRUD. It does not import `pressure.js`, `recommendation.js`, `steps.js`, or `dates.js` directly — those are consumed by UI code (or by each other) working *with* the data `store.js` loads and saves, rather than by `store.js` itself.

### lib/timer.js

**Purpose.** A tiny, isolated pure function supporting a countdown display (e.g. for a focus/break timer feature), pulled out specifically so its formatting logic can be unit-tested without needing to drive React state/timers in a test environment.

**Walkthrough.**
- `formatSeconds(totalSeconds)`: clamps the input to a non-negative, rounded integer via `Math.max(0, Math.round(totalSeconds))` (defends against a timer that's drifted slightly negative or fractional due to floating-point interval timing), then splits it into minutes (`Math.floor(safe / 60)`) and remaining seconds (`safe % 60`), returning a `"M:SS"` string with the seconds portion zero-padded to two digits via `String(s).padStart(2, '0')`.

No dependencies; a leaf utility used by whatever timer/focus-session component renders the countdown.

### Module relationships

Dependency edges observed among the assigned `lib/` files (A → B means "A imports from B"):

- `lib/explain.js` → `lib/pressure.js`, `lib/pressureConfig.js`
- `lib/patterns.js` → `lib/explain.js` (and transitively → `pressure.js` → `dates.js`, `risk.js` → `pressureConfig.js`)
- `lib/pressure.js` → `lib/dates.js`, `lib/risk.js`
- `lib/recommendation.js` → `lib/dates.js`
- `lib/risk.js` → `lib/pressureConfig.js` (plus external `zod`)
- `lib/store.js` → `lib/firebase.js`, `lib/risk.js` (plus external `firebase/firestore`)
- `lib/firebase.js` → external Firebase SDK only (no internal `lib/` deps)

Leaf modules with no internal `lib/` dependencies (consumed by others but depending on nothing in this set): `lib/authErrors.js`, `lib/dates.js`, `lib/greeting.js`, `lib/modules.js`, `lib/pressureConfig.js`, `lib/steps.js`, `lib/timer.js`.

Practical read of the graph: `pressureConfig.js` is the shared constant at the bottom of the scoring stack; `risk.js` builds the self-report score on top of it; `pressure.js` adds deadline-aware adjustment on top of `risk.js` + `dates.js`; `explain.js` turns either score into plain-language bullets using `pressure.js` + `pressureConfig.js`; and `patterns.js` looks for trends across many scored check-ins using `explain.js`. `store.js` sits apart as the persistence hub — it only reaches into `risk.js` (for consistent demo-seed banding) and `firebase.js` (for the actual backend), while `steps.js`, `recommendation.js`, `modules.js`, `greeting.js`, `authErrors.js`, and `timer.js` are consumed directly by UI components alongside whatever `store.js` loads, rather than being imported by `store.js` itself.
## Part 3: Screen Components (components/screens/)

### components/screens/Splash.jsx

**Purpose:** The very first thing a user sees when Nuvora loads — a static branded loading screen shown while the app determines auth state (and, in Firebase mode, while the user's data is being fetched). It has no logic of its own; it exists purely to avoid a blank white screen during the initial JS/auth bootstrap.

**Walkthrough:**
- Imports `Mascot` and `Logo` from `components/ui/` — the two recurring brand elements used across most "calm/interstitial" screens in the app (Auth, Onboarding, LoadError all reuse them too).
- The component takes no props and holds no state. It renders a `<main>` containing a `<section className="phone splash">` with the mascot (size 110), the logo, and a single reassuring tagline ("A calmer way to move forward.").
- No conditional rendering, no accessibility-specific handling beyond relying on the shared `.splash` layout styling — this screen is purely cosmetic/transitional, swapped out by the top-level app shell once auth/data resolves.

### components/screens/Onboarding.jsx

**Purpose:** A short, three-slide introduction shown once to genuinely new users in Firebase (signed-in) mode, before they reach Auth/first use. It sets expectations up front: the app helps with workload, check-ins are support tools rather than clinical assessments, and the student's data stays private. Local/demo mode skips this screen entirely (noted directly in the source comment) since there's no "first-time visitor" concept there.

**Walkthrough:**
- Imports `useState` and `Mascot`. Defines a local constant array `ONBOARDING_SCREENS` with three `{ title, text }` objects covering: (1) the core value prop (turning overload into one manageable step), (2) the important disclaimer that check-ins are not medical diagnoses, (3) a privacy reassurance that tasks/check-ins aren't automatically shared with the university.
- State: a single `step` index (`useState(0)`) tracking which of the three slides is showing.
- Props: `onDone` — a callback invoked either when the user finishes all three slides or explicitly skips.
- Derived values: `screen` (current slide object) and `last` (boolean, whether this is the final slide).
- Renders the mascot, the current slide's title/text, and a row of three small dot indicators (`aria-hidden="true"` since they're purely decorative — the numbered "step X of Y" semantics aren't announced to screen readers here, relying instead on the heading text changing).
- A single primary button reads "Continue" on non-final slides (advances `step`) and "Get started" on the last slide (calls `onDone`). A "Skip" link button (hidden on the final slide, since "Get started" already serves that purpose) lets the user bail out early by calling `onDone` directly — deliberately not gating access to the app behind finishing the tour.

### components/screens/Auth.jsx

**Purpose:** The sign-in / sign-up / password-reset screen — the gatekeeper before a user's data-driven experience begins in Firebase mode. It directly wraps Firebase's email/password auth SDK calls and is written with deliberate privacy care around the password-reset flow (see below).

**Walkthrough:**
- Imports: `firebase/auth` functions (`createUserWithEmailAndPassword`, `sendPasswordResetEmail`, `signInWithEmailAndPassword`), the app's `auth` instance from `lib/firebase`, `authErrorMessage` from `lib/authErrors` (translates Firebase auth error codes into calm, human-readable copy), and `saveSettings` from `lib/store` (used only to persist an optional display name at signup). UI primitives: `Mascot`, `Logo`, `StatusMessage`.
- State: `mode` (`'login' | 'signup' | 'reset'`), `email`/`password`/`displayName` form fields, `error` and `busy` for the main form, and a separate `resetEmail`/`resetStatus` pair for the password-reset sub-flow (kept separate so switching between login/reset doesn't cross-contaminate status messages).
- `submit(e)`: handles both login and signup depending on `mode`. Guards against double-submit via `busy`. On signup, after account creation it optionally calls `saveSettings` with a trimmed `displayName` — the code comment stresses this is optional/skippable and never asks for identifying info like a surname or student ID. Errors are funneled through `authErrorMessage` for consistent, non-technical messaging.
- `submitReset(e)`: sends a Firebase password-reset email. Notably, it shows the **same** reassuring message (`REASSURING_MESSAGE`) whether or not the account actually exists — including explicitly catching `auth/user-not-found` and treating it identically to success. This is a deliberate anti-enumeration privacy measure (a comment explains Firebase's reset flow could otherwise be used to probe which emails are registered).
- Conditional rendering: when `mode === 'reset'`, an entirely separate card UI is shown (email field + submit + "Back to log in"). Otherwise the main card shows a login/signup tab toggle, email/password fields, an optional display-name field (signup only), a "Forgot password?" link (login only, which pre-fills `resetEmail` from the current email field before switching modes), and a submit button whose label changes with `busy`/`mode`. A closing note with a `Leaf` icon reinforces the "no judgement" tone appearing throughout the app.

### components/screens/Privacy.jsx

**Purpose:** The privacy/data-management settings screen, reachable from Support or Settings. This is where a user reads exactly what Nuvora stores and why, exports their data, or deletes it (partially or fully) — including full account deletion when Firebase mode is active. It is one of the more consequential/destructive screens in the app, so the UI leans heavily on typed confirmations and explicit `window.confirm` dialogs.

**Walkthrough:**
- Imports from `lib/firebase` (`deleteAccount`, `firebaseEnabled`, `reauthenticate`), `lib/authErrors` (`authErrorMessage`), and several destructive/export helpers from `lib/store`: `defaultSettings`, `deleteAllData`, `deleteCheckinHistory`, `deleteCompletedTasks`, `exportAllData`. `GENERIC_ERROR` comes from `components/constants`.
- A module-level helper `downloadJson(obj, filename)` builds a `Blob`, creates an object URL, and triggers a synthetic anchor-click download — the mechanism behind the "export my data" button.
- Props: `uid`, `data`, `setData`, `updateSettings`, `go` (navigation).
- State: `busy` (tracks which specific destructive action is in flight, so buttons can independently disable/show "Deleting…"), `status` (message/tone), `confirmAll`/`confirmAccount` (must literally type "DELETE" to unlock the corresponding button), `password` (required to reauthenticate before account deletion).
- `run(name, action, successText)`: a small generic helper wrapping an async action with busy/status bookkeeping — reused by the check-in-history and completed-task deletion handlers.
- `handleExport`: calls `exportAllData(uid)`, then downloads it as `nuvora-data-export-<date>.json`.
- `handleDeleteCheckins` / `handleDeleteCompleted`: each requires a native `window.confirm` before calling `run(...)`, which deletes server-side then patches local `data` state to match (removing checkins/reflections or completed tasks respectively).
- `handleDeleteAll`: requires the literal string "DELETE" typed into `confirmAll`, then a `window.confirm`, then deletes all tasks/checkins/reflections/settings server-side and resets local state plus settings to `defaultSettings`.
- `handleDeleteAccount`: the most guarded action — requires typed "DELETE" **and** a password **and** a `window.confirm`. Critically, it calls `reauthenticate(password)` **before** touching any data (a code comment explains this ordering was specifically fixed: previously Firestore data could be wiped before discovering the account deletion itself would fail on a stale session, leaving a user with data gone but account still present). Only after successful reauthentication does it delete all data and then the account itself; a successful account deletion signs the user out, which the top-level app's `onAuthStateChanged` listener picks up automatically (no manual nav needed here).
- Rendering: a stack of `<details>`/`<summary>` disclosure panels — "Offline storage", "What Nuvora stores", "How your information is used", "Who can see your information" (content branches on `firebaseEnabled` to describe either Firestore-backed cloud storage or fully local demo-mode storage), "About the workload-pressure result" (explicitly disclaims it is not a diagnosis), "Export your data", and "Delete your data" (itself containing three nested sub-panels for check-ins, completed tasks, and everything). The "Delete your account" panel only renders `{firebaseEnabled && ...}` since account deletion is meaningless in local demo mode.

### components/screens/Today.jsx

**Purpose:** The main daily dashboard/home screen and the most complex screen in the app. It greets the user, surfaces the day's single most important recommended next step (task focus), shows the latest workload-pressure check-in result, and — critically — implements "Calm Mode," a dramatically simplified alternate view of the entire screen that collapses everything to one action when the user has opted into reduced stimulation. It also manages a cross-session "restart memory" feature letting a user resume exactly where they paused.

**Walkthrough — imports and business logic layer:**
- `lib/store`: `completeCurrentStep`, `recordStepCompleted`, `setCurrentStep` — persistence calls for task-step mutations.
- `lib/dates`: `effectiveBucket` (resolves whether a task belongs to today/week/later, accounting for overdue rollover) and `relativeDueLabel` (human date labels like "Due tomorrow").
- `lib/recommendation`: `recommendAction(tasks, riskBand)` — the core decision engine that picks which task/action to foreground on Today, taking the latest workload-pressure band into account.
- `lib/steps`: `makeCustomStep`, `nextStepAfter`, `suggestAlternativeSteps` — generate/rotate the small-step text shown under the focused task.
- `lib/explain`: `explainPressure(risk, tasks)` — turns the numeric pressure score into a bullet list of "why" reasons shown in a details/summary.
- `lib/greeting`: `displayNameOrFallback`, `timeOfDayGreeting` — personalization for the welcome heading.
- `lib/modules`: `moduleColor` — assigns a consistent color per course/module tag.
- UI: `Mascot`, `StatusMessage`, `Setting` (toggle row), `Empty` (empty-state placeholder).

**Props:** a large set reflecting how much cross-cutting state Today coordinates — `data`, `go`, `uid`, `setData`, `settings`, `updateSettings`, `settingsBusy`, plus five pieces of session-only Calm Mode state lifted to the parent app shell: `calmSession`/`setCalmSession`, `pausedThisSession`/`setPausedThisSession`, `restartAcknowledged`/`setRestartAcknowledged`, `showCalmExit`/`setShowCalmExit`.

**Derived state at the top:** `risk` (latest check-in's risk object, if any), `recommendation` (from `recommendAction`), and the "restart memory" logic: `settings.restartMemory` holds a saved `{taskId, taskTitle, stepText, stoppedAt}` snapshot from a previous "Stop for now" action; `restartTask` looks up whether that task still exists, is undone, and its current step isn't already done; `hasValidRestart` gates whether the restart banner/flow is shown at all (protects against showing a stale restart point for a task that's since been completed or deleted).

**Calm task title/instruction logic:** `calmTaskTitle`/`calmInstruction` compute what to show inside Calm Mode's single focus card — preferring the saved restart point over the fresh recommendation when one is valid. Notably, when `calmSession.hideDeadlines` is on, the instruction text is replaced with a deliberately timeless phrase ("Make one small update. You can stop whenever you need.") rather than the normal deadline-flavored `actionText`, so the UI doesn't contradict the user's own "hide time pressure" preference.

**Key handlers:**
- `stopForNow()`: persists the current recommendation as a new `restartMemory` via `updateSettings`, resets `restartAcknowledged`, and sets `pausedThisSession` — driving the "You can stop here" interstitial.
- `clearRestartMemory()`: clears `restartMemory` from settings, effectively dismissing the restart banner in favor of today's fresh suggestion.
- `leaveCalmMode(destination)`: turns off `calmMode` in settings, resets the Calm-related session flags, and navigates to either 'today' or 'tasks'.

**Conditional rendering — a cascade of early returns, in priority order:**
1. `settings.calmMode && showCalmExit` → a "Leaving Calm Mode" confirmation screen offering to return to Today, go to Tasks, or stay in Calm Mode.
2. `pausedThisSession` → the "You can stop here" screen (shown right after `stopForNow`), displaying the saved restart point and a "Continue from here" button that flips `restartAcknowledged`.
3. `settings.calmMode && hasValidRestart && !restartAcknowledged` → a "Welcome back" screen presenting the valid restart point, letting the user continue from it, discard it for today's fresh suggestion, or leave Calm Mode.
4. `settings.calmMode && recommendation` → the full Calm Mode dashboard: a single hero + one focus card (title + instruction + "Open my plan"/"Stop for now" buttons) plus a collapsible "Adjust calm settings" panel exposing four **session-only** toggles (`hideDeadlines`, `hideProgressNumbers`, `reduceVisualDetail`, `reduceMotion`) via the shared `Setting` component — explicitly noted as resetting next time Calm Mode starts, i.e. not persisted to `settings`.
5. Default (non-Calm) dashboard: optionally a restart-point banner ("Pick up where you left off") with a "Continue gently" button that actually **turns on** Calm Mode and acknowledges the restart in one action; a welcome header with time-of-day greeting and display name; either a check-in prompt card (if no `risk` yet) or a `RiskCard`; an "I'm feeling overwhelmed" button routing to the Overwhelmed screen; a "One small next step" section rendering `FocusTask` for the recommendation (or an empty-state prompting to add a task/take a check-in); and a "Today's plan" preview listing up to three undone tasks whose `effectiveBucket` is 'today', rendered as `MiniTask`.

**Sub-components:**
- `RiskCard({ risk, tasks, onUpdate })`: shows the pressure score/band/message, an "Update workload pressure" button routing back to check-in, and a `<details>` "Why this result?" panel populated via `explainPressure`.
- `FocusTask({ task, actionText, uid, setData })`: the interactive card for the recommended task. Local `mode` state (`view | editing | choosing`) switches between showing the suggested action text, an inline textarea to write a custom step (`setCurrentStep` + `makeCustomStep`), or a list of alternative suggested steps (`suggestAlternativeSteps`). When the current step isn't done, shows "Mark this step done" (calls `completeCurrentStep` + `recordStepCompleted`), "Edit", and "Try a different step"; once done, shows a completion badge and a "Generate next step" button (`nextStepAfter`). A code comment stresses none of this suggested text is AI-generated — it's deterministic, rule-based templates.
- `MiniTask({ task })`: a compact read-only row (checkbox glyph, title, due label + current step text) for the "Today's plan" preview list.

### components/screens/Checkin.jsx

**Purpose:** The mood/workload check-in flow — a short multi-question wizard that produces the "workload pressure" score/band driving Today's `RiskCard` and the app's overall recommendation logic. It is explicitly and repeatedly framed as a supportive estimate, never a diagnosis.

**Walkthrough:**
- Imports: `saveCheckin` (lib/store), `explainPressure` (lib/explain), `calculatePressure` (lib/risk) — the core deterministic scoring function run entirely client-side, `combineWorkloadPressure` (lib/pressure) — merges the self-report score with the student's actual task deadlines into a final combined risk object, and `handleRadiogroupKeyDown` (components/ui/radiogroup) for keyboard-accessible custom radio groups.
- `questions` array: five items, each `{id, title, max, low, high}` plus optional `options` for the first ("mood") question, which uses descriptive labels ("Calm & in control" → "Very overwhelming") instead of a bare numeric scale — a comment clarifies this is presentational only; the underlying 1–4 values feeding `lib/risk.js` are unchanged.
- Props: `uid`, `data`, `setData`, `go`, and `draft`/`setDraft` — the in-progress answers are lifted to the parent so navigating away and back (or backgrounding the app) doesn't lose progress mid check-in.
- State: `risk` (final combined result once submitted), `incomplete` (true if the user answered "not sure" to anything), `error`, `submitting`. Refs: `scaleRef` (for keyboard nav within the current question's option group) and `resultHeadingRef`.
- Accessibility: a `useEffect` moves focus to the result heading whenever the check-in resolves to either the `incomplete` state or a final `risk` result — the comment explains this is necessary because an SPA view swap gives no automatic cue to screen-reader users that the whole screen's content changed.
- `setAnswer(value)` records the answer for the current question and clears any error; `resetDraft()` clears the draft back to step 0 for a fresh check-in.
- `next()`: validates an answer was chosen for the current question; advances `step` if not on the last question. On the last question: if **any** answer across all questions was "unsure," it deliberately does **not** compute a score — it saves the check-in with `risk: null, incomplete: true` and shows the "That's okay" incomplete screen, rather than silently substituting a neutral/default value for missing data (explicit design comment). Otherwise it calls `calculatePressure(answers)` (local synchronous scoring, chosen over hitting an API route specifically so the core scoring works offline/PWA/Capacitor and has no network failure point), combines it with current tasks via `combineWorkloadPressure`, persists via `saveCheckin` **before** updating UI state (so a Firestore failure can't present a false "saved" result), and sets `risk` to trigger the result screen. Errors are logged and shown via `error`.
- Conditional rendering: `incomplete` → a calm "That's okay" screen with a mascot and a "Back to Today" button. `risk` → the result screen showing band/message, an explicit "not a diagnosis" disclaimer, a `<details>` breakdown via `explainPressure`, and a "Choose my next step" button that routes to `overwhelmed` if the band is "Higher" or back to `today` otherwise. Otherwise → the active question wizard: a progress bar (`role="progressbar"` with proper `aria-valuenow/min/max/valuetext`), and either a vertical list of descriptive option buttons (for the "mood" question) or a numeric 1–N scale with low/high labels — both wired as a single `role="radiogroup"` supporting arrow-key navigation via `handleRadiogroupKeyDown`, plus a standalone "Not sure / prefer not to answer" option always available.

### components/screens/Tasks.jsx

**Purpose:** The full task/assignment management screen ("My plan") — where users add, edit, complete, and delete tasks, organized into Today/Week/Later tabs. It also respects Calm Mode preferences by hiding non-essential controls and collapsing tab choices.

**Walkthrough:**
- Imports: `addTask`, `removeTask`, `toggleTask`, `updateTask` (lib/store); `effectiveBucket`, `relativeDueLabel` (lib/dates); `initialStepText`, `TASK_TYPES` (lib/steps) — used to seed a sensible first small-step template based on task type when a task is created; `availableModules`, `moduleColor` (lib/modules); `CALM_SESSION_DEFAULTS`, `GENERIC_ERROR` (components/constants); UI: `StatusMessage`, `AccessibleSheet` (a focus-trapping modal/sheet wrapper), `PageTitle`, `Empty`.
- `TaskForm` (local sub-component): a controlled form for both creating and editing a task. Local state: `module` (defaults to the task's existing module or "Dissertation"), `addingModule`/`customModule` for defining a brand-new module tag on the fly. `chips` computes the set of module chips to display via `availableModules(tasks)`, filtering out the generic "Other" bucket so it doesn't clutter the chip row. On submit, reads the native form via `FormData` for title/due/priority/taskType (uncontrolled) but keeps `module` controlled separately, then calls the parent-supplied `onSave`. Shows a hint about auto-suggested first steps only when creating (`!initial`).
- `Tasks` component props: `data`, `uid`, `setData`, `calmMode`, `calmSession` (defaulted to `CALM_SESSION_DEFAULTS`).
- State: `tab` (today/week/later), `adding`/`editingId` (which sheet is open), `saving`, `busyIds` (a `Set` tracking per-task in-flight operations so multiple tasks can be manipulated independently without one blocking another), `error`, `undo` (`{id, title}` after marking complete, to support an undo affordance), `showAllTabs` (Calm Mode initially hides the week/later tabs behind a "Show week & later" link). Refs `addTaskTriggerRef`/`editTaskTriggerRef` capture the button that opened a given sheet, so `AccessibleSheet` can restore focus there on close — an accessibility requirement for modal dialogs.
- `filtered`: tasks whose `effectiveBucket(t)` matches the active tab.
- `create(fields)`: builds a new task object (including a freshly generated `currentStep` seeded via `initialStepText(fields.taskType)`), persists via `addTask`, and prepends it to local state.
- `saveEdit(id, fields)`: persists via `updateTask` and replaces the matching task in state.
- `runOnTask(id, action)`: a generic wrapper marking a specific task id busy, running an async action, and clearing busy — used by toggle/remove so unrelated tasks stay interactive.
- `toggle(t)`: flips `done`, and if newly completed, sets `undo` to allow reverting; `undoComplete()` reverses a completion.
- `remove(t)`: gated behind a native `window.confirm`, then deletes and filters the task out of state.
- Rendering: `PageTitle` with an "Add task" action button; tab switcher (or, in Calm Mode with `!showAllTabs`, just a "Show week & later" link, keeping the default view to only "today"); an undo status banner when applicable; the filtered task list as `.row-task` articles with a check button (`aria-pressed`, disabled while busy), title/module/due/priority text (deadline and priority info is hidden entirely when `calmMode && calmSession.hideDeadlines`), the current step text (hidden when `calmMode && calmSession.reduceVisualDetail`), and edit/delete icon buttons (also hidden under `reduceVisualDetail` to declutter Calm Mode further); an `Empty` state when nothing matches; and the add/edit forms rendered inside `AccessibleSheet` overlays rather than inline, so the list itself never re-renders into a form (explicit code comment).

### components/screens/Learn.jsx

**Purpose:** A library of concrete, opt-in coping/support tools for difficult study moments — separate from the crisis-oriented Overwhelmed screen. It's structured as "pick the problem that feels closest" followed by a tailored mini-tool, plus a secondary "More study tools" section of additional standalone techniques (focus timer, distraction parking lot, if-then planning, visual step map) and a set of external wellbeing resource links.

**Walkthrough:**
- Imports: `completeCurrentStep`, `recordStepCompleted`, `recordStrategyUse`, `setCurrentStep` (lib/store); `pickPriorityTask` (lib/recommendation) — selects the single most relevant task to reference throughout this screen's tools; `makeCustomStep` (lib/steps); UI: `PageTitle`, `StatusMessage`, `FocusTimer`, `ExternalLink` (a wrapper presumably adding `target="_blank" rel="noopener"` and visual "opens externally" affordance).
- Extensive local state: `showMoreTools` (expand/collapse the secondary tools section), `busy`, per-tool status objects (`shrinkStatus`, `lowEnergyStatus`, `supportStatus`), `supportChoice` (which of the six "what would help right now" cards is selected), a three-question `helperAnswers` object (brain/environment/task) powering a mini recommendation quiz, `sensoryChoice`, `focusSprintMinutes` (2/5/10/15), `parkingInput`/`parkingLot` (session-only scratch list, explicitly **not** persisted to the task list), `ifThenCue`/`ifThenAction`.
- `task = pickPriorityTask(data.tasks)`: the task most of the tools reference by name when available, falling back to generic phrasing when there are no tasks.
- `persistSuggestedStep(text, statusSetter)`: shared helper that builds a custom step via `makeCustomStep`, persists it with `setCurrentStep`, and updates local task state — reused by several of the tool panels below to let a user "adopt" a suggested micro-action as their actual next step on Today.
- `useShrunkStep()`, `markLowEnergyDone()` (calls `completeCurrentStep` + `recordStepCompleted`), `copyBodyDoubleMessage()` (clipboard-copies a pre-written message asking someone to co-work, and calls `recordStrategyUse(uid, 'support')` to track strategy usage feeding Progress screen stats).
- `helperRecommendation()`: a small deterministic decision tree over the three-question helper (`brain`/`environment`/`task`) that returns one of `sensory | energy | big | start` — prioritizing environment overwhelm first, then tiredness, then task complexity, defaulting to "start."
- `supportChoices`: six cards (`start`, `big`, `energy`, `sensory`, `company`, `unsure`), each with an emoji icon, title, and one-line description.
- `renderSupportPanel()`: a large conditional returning the appropriate tool UI for whichever `supportChoice` is active:
  - `start` — an "if-then" launch-step card with a fixed cue/response template and a button to jump straight into the referenced task.
  - `big` — three sequential buttons ("Find the place" / "Add one point" / "Choose what follows"), each calling `persistSuggestedStep` with different phrasing, implementing a "see only three actions" pattern.
  - `energy` — Tiny/Enough/Full effort-level buttons, plus (if the current step isn't done) an "I did the current step" shortcut calling `markLowEnergyDone`.
  - `sensory` — a list of five environment-adjustment options (quiet/screen/notifications/headphones/phone) as a selectable button group; picking one shows a confirmation message and a "Back to Today" button — deliberately requires no task work.
  - `company` — the body-doubling message copy button plus an optional external "Study With Me" YouTube link.
  - default (`unsure`) — the three-question helper quiz described above, surfacing a dynamically-labeled recommendation button once all three selects are answered.
- Below the support-picker: a "Reset Space" panel with a `<details>` list of external wellbeing links (NHS Every Mind Matters, ADHD Foundation, National Autistic Society sensory-processing page) explicitly marked optional and not a replacement for professional support.
- "More study tools" section: a toggle button reveals four additional tools defined in `allActivities` — Focus Sprint (adjustable-length `FocusTimer`), Distraction Parking Lot (session-only capture list for unrelated thoughts, explicitly not saved to tasks), If-Then Plan (freeform cue/response builder), and Visual Step Map (three fixed steps derived from the priority task, with a button to adopt step 1 via `persistSuggestedStep`). The first activity (`pick`) is displayed as a larger featured "pick card"; the remaining three render as collapsed `<details>` "activity" cards color-coded via a fixed `ACTIVITY_COLORS` rotation.

### components/screens/Overwhelmed.jsx

**Purpose:** The crisis/support screen reached either from Today's "I'm feeling overwhelmed" button or automatically suggested after a "Higher" pressure check-in result. It asks what specifically is making things hard right now and offers one of five very small, low-effort responses tailored to that specific barrier — explicitly designed to require minimal decision-making at the moment decisions are hardest.

**Walkthrough:**
- Imports: `completeCurrentStep`, `recordStrategyUse`, `setCurrentStep` (lib/store); `pickPriorityTask` (lib/recommendation); `suggestAlternativeSteps` (lib/steps); `orderByUsage` (lib/patterns) — reorders the barrier list based on which strategies the user has actually found useful before, via `data.stats.strategyUses`; UI: `Mascot`, `StatusMessage`, `FocusTimer`, `handleRadiogroupKeyDown`.
- `BARRIERS`: five fixed options (`start`, `big`, `energy`, `reset`, `support`) each with a plain-language label. `QUICK_RESET`: a fixed 2-minute breathing-reset copy block used by the `reset` barrier.
- Props: `data`, `uid`, `setData`, `go`, `settings`.
- State: `barrier` (selected barrier id), `done` (final "one step down" screen), `chosenAlt` (for the "big" barrier's step selection), `supportMessage` (editable text for the "support" barrier), `copyStatus`, `busy`, `error`. Refs: `barrierRef` (keyboard nav scope) and `doneHeadingRef` (focus target on completion, mirroring Checkin's pattern).
- `task = pickPriorityTask(data.tasks)`. `orderedBarriers = orderByUsage(BARRIERS, data.stats.strategyUses)` — puts whichever barrier the user has historically found helpful first, reducing choice friction; a comment notes the sort is stable so a first-time user with no history sees the fixed default order rather than something arbitrary.
- `useEffect` moves focus to the "done" heading once `done` becomes true (accessibility, same pattern as Checkin). A second `useEffect` auto-populates `supportMessage` whenever `barrier === 'support'` and a task exists, personalizing with `settings.supportPersonName` if set.
- `markDone(action)`: runs an async action (if any), applies its returned updated task to state, records strategy usage via `recordStrategyUse(uid, barrier)`, and flips `done` — the single completion path shared across multiple barriers. If there's no task at all, it just sets `done` directly without attempting an action.
- `continueAfterReset()`: records the 'reset' strategy and navigates back to Today.
- `copySupportMessage()`: clipboard-copies the editable message and records the 'support' strategy.
- Conditional rendering: `done` → mascot + "One step down. That is genuinely enough for right now." + back-to-Today button. Otherwise: a `role="radiogroup"` list of `orderedBarriers` (keyboard-navigable via `handleRadiogroupKeyDown`), followed by a barrier-specific panel:
  - `start` — "Just open [task]. Nothing else needed." with an "I opened it" button calling `markDone(() => completeCurrentStep(...))`.
  - `big` — shows `suggestAlternativeSteps(task)` as pickable options; once one is chosen (`chosenAlt`), shows a confirm button that marks that specific step done via `setCurrentStep` with `done: true`.
  - `energy` — a 120-second `FocusTimer` plus "I tried for two minutes" button.
  - `reset` — the fixed `QUICK_RESET` breathing text with a "I'm ready to continue" button.
  - `support` — an editable textarea pre-filled with a personalized ask-for-help message, a "Copy message" button, and (if no support person is configured) a hint pointing to Settings.
  - A closing "Not now" button and a fixed reassuring line ("No shame. You've got this.") are always present regardless of barrier.

### components/screens/Reflection.jsx

**Purpose:** A lightweight weekly free-text journaling screen reached from Progress. Deliberately unscored and unstructured beyond two open prompts — explicitly not AI-summarized, not streak-tracked, and kept entirely in the student's own words (stated directly in a code comment).

**Walkthrough:**
- Imports: `saveReflection` (lib/store), `GENERIC_ERROR` (components/constants), `StatusMessage`.
- `REFLECTION_PROMPTS`: two fixed prompts — "What felt manageable this week?" and "What would help make next week a little easier?"
- Props: `uid`, `data`, `setData`, `go`. State: `answers` ({manageable, hard}), `saving`, `status`.
- `save()`: requires at least one of the two answers to be non-empty (otherwise shows a gentle validation message rather than a generic error); persists via `saveReflection`, prepends the new entry (with a fresh `createdAt`) to local `data.reflections`, clears the form, and shows a thank-you confirmation.
- Rendering: a back button to Progress, heading/intro copy reinforcing that nothing here is scored or shared, two labeled textareas bound to `answers`, a save button, and — if any reflections exist — a "Past reflections" list showing up to the 5 most recent entries with a formatted date (handling both Firestore `Timestamp`-like `{seconds}` objects and plain ISO strings/`Date.now()` fallback) and whichever of the two answer fields were filled in.

### components/screens/Progress.jsx

**Purpose:** A non-judgmental stats/trends screen — check-in counts, steps completed, strategies used, workload-pressure history, and pattern insights over time. Explicitly framed as "just for your own reflection," with no targets, and with an explicit opt-out ("Hide these details") for users who find progress-tracking itself stressful.

**Walkthrough:**
- Imports: `buildPatternInsights` (lib/patterns) — derives higher-level trend observations from check-in history (e.g., recurring low-energy days); `explainPressure` (lib/explain); `CALM_SESSION_DEFAULTS` (components/constants); UI: `PageTitle`, `Empty`.
- Props: `data`, `settings`, `updateSettings`, `settingsBusy`, `go`, `calmSession` (defaulted).
- Derived values: `totalStrategyUses` (sum of `data.stats.strategyUses` values), `usedStrategies` (only strategies with count > 0), `showTrends` (local state, Calm Mode gates the trends section behind a "Show trends & strategies" link by default), `showProgressNumbers` — computed as `!(settings.calmMode && calmSession.hideProgressNumbers)`, controlling whether raw numbers or vaguer labels (e.g., "Used" instead of a count, band name instead of numeric score) are shown throughout.
- Early return: if `settings.hideProgress` is true, the entire screen is replaced with an `Empty` "Progress is hidden" state and a single button to re-enable it — this is a persisted (not session-only) preference, distinct from Calm Mode's numeric-hiding.
- `patternInsights = buildPatternInsights(data.checkins)`.
- `trendsAndStrategies`: a JSX fragment (not a component) built once and reused — contains the "Patterns" panel (rendered only if insights exist), the "Helpful strategies" panel mapping each used strategy to its `STRATEGY_LABELS` (start/big/energy/reset/support), and "Recent pressure patterns" — the last 7 check-ins, each either a plain "Incomplete" row (for check-ins with no `risk`, i.e. the "unsure" path from Checkin) or an expandable `<details>` row (progressive disclosure, explicitly commented as intentional — showing seven full breakdowns by default would be too much to scan) showing the score/band and, once opened, the `explainPressure` bullet list.
- Main render: `PageTitle`, reassuring intro copy, a stats row (check-ins/steps/strategies counts) shown only if `showProgressNumbers`, otherwise a status message noting numbers are hidden for the Calm session; then either the "Show trends & strategies" link (Calm Mode default) or `trendsAndStrategies` directly; a "Weekly reflection" button routing to Reflection; and the "Hide these details" opt-out button.

### components/screens/Support.jsx

**Purpose:** A screen for preparing a self-controlled, copy-to-clipboard summary of the student's current situation (workload pressure + specific difficulties) that they can choose to send to a tutor, disability service, or support person themselves — Nuvora never transmits it automatically. It also serves as a secondary navigation hub to Settings and Privacy, and carries an explicit non-emergency-service disclaimer.

**Walkthrough:**
- Imports: `explainPressure` (lib/explain); UI: `PageTitle`, `StatusMessage`.
- Props: `data`, `settings`, `go`. State: `status` (clipboard copy feedback).
- `risk = data.checkins[0]?.risk` (most recent check-in's result, if any). `explanation = explainPressure(risk, data.tasks)` when a risk exists.
- `summary`: a plain-text template built via array `.join('\n')` combining the pressure band, the explanation bullets (prefixed with `-`), and a fixed list of three generic "what could help" suggestions (clarifying the nearest deadline, help identifying one priority, breaking the first action down) — entirely deterministic, no AI generation.
- `copy()`: clipboard-writes `summary`, showing success/failure status text; the button is disabled entirely when there's no `risk` yet.
- Rendering: `PageTitle`; a "support-card" showing the summary text (or a prompt to complete a check-in first, if no risk) and the copy button; a secondary panel of three navigation rows — "Calm accessibility settings" and "Privacy & data" (both routing elsewhere via `go`), and a "Support person" row whose secondary text conditionally shows the configured `settings.supportPersonName` or "Not set", both variants still routing to Settings; and a closing `.notice` block with a `CircleHelp` icon making explicit that Nuvora is not an emergency or healthcare service, directing users to university support, NHS 111, or emergency services as appropriate.

### components/screens/SettingsPage.jsx

**Purpose:** The accessibility/personalization settings screen — display name, Calm Mode, reduced motion, text size, and an optional "support person" note. A relatively simple, mostly-presentational form screen compared to the rest of the app.

**Walkthrough:**
- Imports: `PageTitle`, `StatusMessage`, `Setting` (the reusable labeled-toggle row component used throughout the app).
- Props: `value` (the current settings object), `busy`, `error`, `onChange` (callback invoked with a full updated settings object on each change — this screen has no local state of its own; every field is either fully controlled from `value` or uncontrolled with `onBlur` commit), `go`.
- The display-name and support-person fields use `defaultValue` + `onBlur` rather than `value` + `onChange` — meaning updates are only committed to parent state (and presumably persisted) when the field loses focus, not on every keystroke. This avoids firing a settings-save round-trip on every character typed.
- `Setting` toggle rows are used for "Calm mode" and "Reduced motion," each directly patching the corresponding boolean into a spread copy of `value` and calling `onChange`.
- Text size is rendered as a three-way tab selector (Standard/Medium/Large mapping to scale factors 1/1.15/1.3), highlighting the active option via `value.textScale === v`.
- The whole form is disabled (`disabled={busy}`) while a settings save is in flight, and any error surfaces via `StatusMessage`.

### components/screens/LoadError.jsx

**Purpose:** A calm, honest fallback/error-boundary-style screen shown specifically when the initial fetch of the student's data fails outright (not merely slow-loading) — e.g., a Firestore read error at app startup. Its whole design intent, stated directly in a code comment, is to reassure the user that nothing has been lost, since a failed read can never have touched anything already saved.

**Walkthrough:**
- Imports: `useEffect`, `useRef`, `Mascot`.
- Props: `onRetry`, `onSignOut` — both supplied by the top-level app shell.
- `useEffect` on mount moves keyboard/screen-reader focus to the heading (`headingRef`), the same accessibility pattern used elsewhere in the app for screens that appear as a full-context swap rather than a normal navigation.
- Rendering: the shared `.splash` layout (same class as Splash.jsx) with a neutral-mood mascot, a focus-targeted `<h1>` ("We couldn't load your study space."), a reassuring line ("Your data hasn't been changed."), a primary "Try again" button wired to `onRetry`, and a "Sign out" link wired to `onSignOut` as an escape hatch if retrying keeps failing.
## Part 4: lib/ Tests & Firestore Rules Tests

### lib/authErrors.test.js

This file tests `authErrorMessage`, the function that translates raw Firebase Authentication error codes into user-facing copy. This matters a lot for a neurodivergent-support app: Firebase's default error strings are technical and, worse, can leak security-sensitive signals (e.g. whether an email is registered), so this module — and its tests — guard both usability and account-enumeration safety.

- **`authErrorMessage`** (single `describe` block, no nested groups): each `it` checks one Firebase error code maps to a specific, supportive, human-readable message:
  - `auth/invalid-credential` produces a message that doesn't reveal whether the account exists.
  - `auth/wrong-password` and `auth/user-not-found` are asserted to produce the **exact same** message — the key security guarantee that prevents account enumeration via error text.
  - `auth/email-already-in-use` gives a distinct, helpful message pointing the user to log in instead.
  - `auth/invalid-email` and `auth/weak-password` are checked against expected phrasing (`written correctly`, `6 characters`).
  - `auth/network-request-failed` reassures the user nothing was changed.
  - `auth/too-many-requests` tells the user to try again shortly.
  - An unrecognized/future Firebase code (`auth/some-new-error-firebase-just-added`) must never leak the raw `auth/...` code string back to the user — this is a safety-net test for forward compatibility with new Firebase error codes.
  - A non-Firebase `Error` object falls back to a generic supportive message.
  - A custom fallback string can be supplied as a second argument and is honored.

Together these tests guarantee: every known Firebase auth error is translated to calm, non-technical language, unknown codes never leak internals, and there is no way to distinguish "wrong password" from "no such account" through the UI text.

### lib/dates.test.js

Tests the date/urgency utilities (`daysUntil`, `relativeDueLabel`, `isOverdue`, `isDueWithin48h`, `isDueWithinDays`, `urgencyCategory`, `urgencyRank`, `effectiveBucket`) that power due-date display and sorting throughout the app. These are foundational for reducing overwhelm — getting "overdue" vs "today" vs "this week" wrong would directly mislead an anxious user about what's urgent, so precise boundary behavior matters.

- **`daysUntil`**: confirms it returns `null` when there's no due date, `0` for today, negative counts for overdue dates, and positive counts for future dates.
- **`relativeDueLabel`**: checks the exact human phrasing for each case — "No due date", singular vs plural "Overdue by N day(s)", "Due today", "Due tomorrow", and "N days left" for anything further out.
- **`isOverdue / isDueWithin48h / isDueWithinDays`**: verifies overdue is strictly "due date in the past" (today doesn't count), that "within 48h" includes today and tomorrow but excludes yesterday and 2+ days out, and that `isDueWithinDays` treats its day limit as an inclusive boundary (day 7 of a 7-day window counts, day 8 doesn't, and negative/overdue days don't count as "within").
- **`urgencyCategory / urgencyRank` boundaries**: one test walks through every category boundary (`none`, `overdue`, `today`, `tomorrow`, `week`, `later`) to confirm correct classification at each cutoff; a second test confirms the numeric rank ordering is monotonically increasing in urgency (more urgent = lower rank number), ending with "no due date" ranked least urgent of all.
- **`effectiveBucket`**: verifies the grouping logic used for the Today/This Week/Later UI buckets — overdue, today, and tomorrow all collapse into the "today" bucket; 2–7 days out become "week"; 8+ days become "later"; and when there's no due date at all, it falls back to whatever bucket the user manually chose (defaulting to "later" if that's unset too).

Guarantee: date-driven urgency classification and bucketing is exhaustively boundary-tested, so the UI's "what's due when" logic is trustworthy at every edge.

### lib/explain.test.js

Tests `rankFactorContributions` and `explainPressure` from the explainability layer built on top of the pressure/risk model (`calculatePressure` from `./risk`). This module is what turns a single pressure score into human-readable bullet points telling the user *why* their score is what it is — critical for transparency and trust in a mental-load-tracking feature.

- **`rankFactorContributions`**: one test confirms ranking is by *weighted* contribution, not raw factor value — a factor with a lower raw score but a higher weight (task initiation at 25%) can and should outrank a higher raw-value but lower-weight factor (rest at 15%).
- **`explainPressure`** (the larger group):
  - Confirms the single largest weighted contributor is named correctly in the output bullets (e.g. "Task initiation was the largest contributor").
  - Confirms low-rest scenarios produce a bullet mentioning rest.
  - Confirms overdue/due-soon task counts reported in bullets are the *actual* counts from the task list (not a generic statement), and that completed tasks are excluded from those counts.
  - Confirms correct singular/plural phrasing when there are multiple overdue or due-soon tasks.
  - Confirms the explanation is never empty, for any valid input.
  - Confirms that when a pre-combined risk result already carries a `.deadline` adjustment object, the explanation surfaces the exact point value added (e.g. "Upcoming deadlines added 12 points to today's result").
  - Confirms that for **older check-ins with no `.deadline` field** (a back-compat scenario), the function recomputes deadline info from the task list itself and still produces the same deadline-related bullets.
  - Confirms that when there is no deadline adjustment at all, no "points to" bullet appears — the explanation doesn't fabricate a deadline story when none applies.

Guarantee: the natural-language explanation of a pressure score always names the true dominant factor, accurately reflects real task counts (respecting completion status), and correctly handles both new and legacy check-in data shapes without ever being empty or misleading.

### lib/greeting.test.js

Tests small UI personalization helpers: `timeOfDayGreeting`, `displayNameOrFallback`, and `avatarInitial`. These are low-risk but user-facing "first impression" details — small wording/fallback bugs here would be visible on every app open.

- **`timeOfDayGreeting`**: verifies the three time bands — "Good morning" before midday, "Good afternoon" from noon up to (but not including) 6pm, and "Good evening" from 6pm onward — with boundary-adjacent hours checked in each band (8/11, 12/17, 18/23).
- **`displayNameOrFallback`**: confirms a set display name is trimmed of whitespace and returned as-is, while an empty string, `undefined`, or a whitespace-only string all fall back to the neutral word "there" rather than inventing or displaying a blank name.
- **`avatarInitial`**: confirms the avatar shows the first letter of the name, uppercased, and falls back to a neutral "·" mark (rather than blank or an error) when no name is set.

Guarantee: greeting and avatar rendering never shows blank/undefined text and always degrades gracefully when the user hasn't set a display name.

### lib/modules.test.js

Tests `availableModules` and `moduleColor`, which drive the module/subject picker and its color-coding used to visually group tasks by course/module.

- **`availableModules`**:
  - A brand-new account with no tasks gets a fixed starter list: `['Dissertation', 'Other']`.
  - Modules actually used in the user's tasks (e.g. "Database Systems", "Web Development") are included in the returned list.
  - A module name repeated across multiple tasks is de-duplicated — appears only once.
  - "Other" is always kept at the very end of the list, functioning as a catch-all rather than a real module name.
  - Tasks with an empty or missing `module` field are ignored (they don't pollute the list with blank entries).
- **`moduleColor`**:
  - The four modules present in the original design (Dissertation, Database Systems, HCI Group Project, Web Development) map to their specific intended colors (amber, purple, teal, blue respectively).
  - An arbitrary custom module name (e.g. "Marine Biology") still gets *a* color from the same four-color palette, and that mapping is stable/deterministic — calling it twice with the same name returns the same color both times.

Guarantee: the module list always has a predictable shape (starter defaults, no duplicates, "Other" pinned last) and every module — named or custom — gets a consistent, repeatable color.

### lib/patterns.test.js

Tests the pattern-detection helpers used for the "insights" feature: `mostFrequentContributor`, `dayOfWeekPattern`, `buildPatternInsights`, and `orderByUsage`. This module looks across historical check-ins to surface recurring stress patterns (e.g. "task initiation is usually your biggest factor" or "Mondays tend to be harder") — a feature whose main risk is overclaiming a pattern from too little or too noisy data, so many tests specifically target that restraint.

- **`mostFrequentContributor`**:
  - Returns `null` when fewer than 3 scored check-ins exist — not enough data to claim a pattern.
  - Correctly identifies a factor (e.g. "taskInitiation") as the recurring largest contributor when it dominates 3 of 4 check-ins, reporting both the winning count and the total sample size.
  - Returns `null` when no single factor reaches a genuine majority across a mixed set — explicitly avoiding overclaiming from noisy/varied data.
  - Ignores incomplete check-ins (missing `risk`/`factors`) when counting samples.
  - Respects a `sampleSize` parameter, only considering the most recent N check-ins rather than the entire history.
- **`dayOfWeekPattern`**:
  - Returns `null` with fewer than 6 scored check-ins.
  - Correctly finds the highest- and lowest-scoring weekdays when there's a genuine, consistent gap (test data deliberately uses real Mondays vs. Fridays).
  - Returns `null` when the score gap between the best/worst days is too small to be meaningful.
  - Returns `null` when only one weekday actually has enough samples to compare (can't detect a day-of-week pattern from a single day).
- **`buildPatternInsights`**:
  - Returns an empty array (not a placeholder message) when there isn't enough data for any insight.
  - When both a contributor pattern and a day-of-week pattern are independently detectable, both insight strings are included together and match expected phrasing ("Task initiation has been your largest contributor…", "…tends to be higher on Monday…").
- **`orderByUsage`**: (used for ordering strategy/tool suggestions by how often the user has used them)
  - Sorts items so the most-used one comes first.
  - Preserves original array order when there is no usage history at all (stable sort, not random).
  - Does not mutate the original input array.
  - Treats an item with no usage-count entry the same as a usage count of zero.

Guarantee: pattern insights are only ever surfaced when there's a statistically meaningful signal (minimum sample sizes, genuine majorities/gaps), never fabricated from sparse or noisy data, and usage-based ordering is stable and non-destructive.

### lib/pressure.test.js

Tests the deadline-aware pressure combination logic: `countDeadlines`, `deadlineAdjustment`, and `combineWorkloadPressure` from `lib/pressure.js`. This is the module that blends a student's self-reported pressure score with objective deadline pressure from their task list into one combined score/band — a core piece of the app's "workload awareness" feature.

- **`countDeadlines`**: confirms each open (non-done) task is counted into exactly one tier — overdue, due-soon (within 48h), or due-this-week — that completed tasks are ignored entirely, and that tasks with no due date don't count anywhere.
- **`deadlineAdjustment` (tier boundaries)**: a thorough boundary test of the point/level system:
  - No overdue/soon/week tasks → `none`, 0 points.
  - Exactly 1 due-soon task → `mild`, 5 points; exactly 2 due-this-week tasks does *not* qualify for mild, but exactly 3 does.
  - Exactly 1 overdue task, or exactly 2 due-soon tasks, both reach `moderate` (12 points).
  - 2+ overdue tasks reaches `high` (20 points), and adding more overdue/soon/week counts beyond that doesn't push it higher (points cap at the `high` tier).
  - Confirms a "most-severe-wins" rule: when multiple tiers would independently qualify (e.g. 1 overdue + 2 due-soon + 3 due-week), the single overdue counts as `moderate` and does not get overridden or added to by the lesser tiers.
- **`combineWorkloadPressure` — approved scenario table**: an `it.each`-driven table of 11 named scenarios (traceable to an actual approved product proposal, "Phase 2 item 5") that each specify a base self-report score plus overdue/soon/week task counts, and assert the exact resulting adjusted score and pressure band (Low/Moderate/Higher). This is a regression-anchor: any behavior change to the score-combination formula that shifts even one of these 11 expected outputs will fail loudly, keeping the implementation traceable to the signed-off design.
- **`combineWorkloadPressure` — general behaviour**:
  - The original self-report score is preserved as `baseScore` alongside the new combined `score`.
  - The combined score never exceeds 100, even when both the base score and the deadline adjustment are maxed out (caps/clamps correctly).
  - The result records which deadline level and point value were applied (`result.deadline`), so the combination is transparent/auditable rather than a black box.

Guarantee: deadline pressure is folded into the overall score using a fixed, tested formula with capped output, most-severe-tier-wins semantics, and full traceability back to an approved scenario table — protecting against silent regressions in a health-adjacent scoring feature.

### lib/pressureConfig.test.js

Tests the shared configuration constants `PRESSURE_WEIGHTS` and `PRESSURE_LABELS` from `lib/pressureConfig.js` — the single source of truth for how much each of the five pressure factors (workload, taskInitiation, focus, rest, confidence) counts toward the overall score. Because other modules (`risk.js`, `explain.js`) depend on these weights, this file is essentially a contract test that guarantees that contract doesn't silently drift.

- **"shared pressure-model configuration"** (one `describe`, formatted with unusual multi-line spacing but straightforward assertions):
  - Confirms `PRESSURE_WEIGHTS` and `PRESSURE_LABELS` both contain exactly the five documented factor keys, in the documented order (`workload`, `taskInitiation`, `focus`, `rest`, `confidence`) — no extra or missing factors.
  - Confirms the five weights sum to exactly 1 (100% of the self-report score), using a tolerant floating-point comparison.
  - Confirms the exact documented weight values: workload 30%, taskInitiation 25%, focus 20%, rest 15%, confidence 10%.
  - Confirms both `PRESSURE_WEIGHTS` and `PRESSURE_LABELS` are frozen objects (`Object.isFrozen`), preventing accidental mutation of shared config at runtime.

Guarantee: the weighting scheme that all pressure/risk calculations depend on is complete, sums to 100%, matches the documented values exactly, and is immutable — any accidental edit to the weights would be caught immediately by this file rather than silently skewing every user's score.

### lib/recommendation.test.js

Tests `pickPriorityTask` and `recommendAction` from `lib/recommendation.js` — the logic that decides which single task to spotlight as "what to do next" and how to phrase that recommendation. This is arguably the most user-facing "decision" the app makes on a student's behalf, so its tie-breaking rules are tested in detail.

- **`pickPriorityTask`**:
  - Returns `null` when the task list is empty or every task is already done.
  - **Rule 1**: completed tasks are ignored entirely, even if they'd otherwise "win" on urgency.
  - **Rule 2**: urgency ordering is strictly overdue > due-today > due-tomorrow > due-this-week > later/no-date, tested pairwise across all adjacent levels.
  - **Rule 3**: within the same urgency tier, a task explicitly marked `priority: 'high'` beats one marked `'normal'`.
  - A task with no `priority` field set is treated as `'normal'` (so it beats an explicit `'low'`).
  - **Rule 4**: within the same urgency and priority, the task due earlier wins over one due later in the same window.
  - **Rule 5**: a genuine tie (identical urgency, priority, and due date) is broken by original array order — the algorithm is stable, not random, confirmed by swapping the order of two tied tasks and seeing the pick swap accordingly.
  - Confirms overall determinism: given the same input tasks, repeated calls (even against a shallow-copied array) always return the same winning task.
- **`recommendAction`**:
  - Returns `null` when there's nothing to recommend (empty list).
  - Under non-"Higher" pressure bands, the recommended action text is simply the task's current micro-step text as-is.
  - Under a "Higher" pressure band, the action text is deliberately shrunk/simplified (containing phrasing like "Just open...") while still naming the specific urgent task — a "reduce cognitive load when overwhelmed" behavior.
  - Confirms an overdue task is never hidden from the recommendation regardless of pressure band — both Low and Higher bands still surface the same overdue task as top priority.

Guarantee: task prioritization follows a fully deterministic, documented tie-break chain (done-status → urgency → priority → due date → original order), and the recommended phrasing adapts to reduce overwhelm under high pressure without ever hiding what's actually overdue.

### lib/risk.test.js

Tests `calculatePressure` and `bandFromScore` from `lib/risk.js` — the core self-report-to-score calculation underlying the whole pressure/workload feature. Because this score can influence how "overwhelmed" a user is told they are, correctness at every boundary and rejection of invalid input are both safety-relevant.

- **"transparent pressure score"** (top describe, no nested name):
  - Fully supportive answers (mood good, sleep/focus/initiation/confidence all high) produce a "Low" band.
  - Fully overloaded answers produce exactly score 100 and band "Higher".
  - A specific mixed input (`mood:2, sleep:3, focus:3, initiation:3, confidence:3`) is checked against the exact documented weighted result of 45 — an anchor test tying the implementation to the documented formula.
  - Incomplete input (missing required fields) throws rather than silently computing a wrong score.
- **"minimum and maximum values"**: confirms the most supportive possible answer set scores exactly 0, and the most overloaded possible set scores exactly 100 — the two extremes of the scale.
- **"Low/Moderate and Moderate/Higher boundaries"**: confirms `bandFromScore` treats 33 as Low but 34 as Moderate, and 66 as Moderate but 67 as Higher (exact boundary values), plus that 0 and 100 sit at the extremes of Low and Higher respectively.
- **"each individual factor"**: with every other answer held at its most supportive value, moving just one factor to its worst value in turn confirms each factor's isolated weighted contribution matches its documented percentage — workload 30, taskInitiation 25, focus 20, rest(sleep) 15, confidence 10 — a factor-by-factor cross-check against `pressureConfig`'s weights.
- **"invalid input (distinct from merely incomplete input)"**: confirms the function throws for a value below the valid range, above the valid range, a non-integer value, a non-numeric "sentinel" value (guarding against an "unsure" placeholder reaching this function unconverted), and for `null`/`undefined` input entirely.

Guarantee: the pressure score calculation is exhaustively verified at every boundary (0, 33/34, 66/67, 100), each factor's weighted contribution independently matches the documented weights, and the function is strict about input validity — rejecting out-of-range, non-integer, non-numeric, or missing input rather than silently producing a misleading score.

### lib/steps.test.js

Tests the micro-step generation and progression logic in `lib/steps.js`: `suggestAlternativeSteps`, `makeCustomStep`, `nextStepAfter`, `initialStepText`, and `TASK_TYPES`. This is central to the app's core therapeutic mechanic — breaking a task into small, doable next actions — for neurodivergent/executive-function-challenged users, so correctness of the step progression (and graceful fallback at its end) matters directly to the user experience.

- **`suggestAlternativeSteps`**: confirms more than one alternative step is returned, each with a unique id (no duplicates), and that every suggested alternative starts in an undone state (`done: false`, `completedAt: null`).
- **`makeCustomStep`**: confirms a user-edited step is built fresh and undone, and that the input text is trimmed (`'  Read page 3  '` → `'Read page 3'`).
- **`nextStepAfter`**:
  - Moving from one known step in the fixed progression correctly advances to the next scripted step ("Open the file..." → "Write or type just the first sentence...").
  - Once the progression is exhausted (last known step), it falls back to a supportive closing message matching `/progress/i`.
  - A step whose text is outside the known scripted progression (e.g. a fully custom user-typed step) still falls back gracefully to *some* non-empty string rather than erroring.
  - The returned next step is always undone (`done: false`, `completedAt: null`), regardless of which step preceded it.
- **"task-type-aware progressions"**:
  - `TASK_TYPES` includes a `'general'` type plus at least 5 other specific types (6+ total).
  - `initialStepText` returns different first-step text for different task types (essay vs. exam vs. general all differ).
  - An unset or unrecognized task type falls back to the same initial text as `'general'`.
  - `nextStepAfter` follows the progression specific to the task's own `taskType` rather than the general one — verified by checking the essay-type's second step differs from general's and contains essay-specific language ("argue").
  - For **every** task type in `TASK_TYPES`, repeatedly calling `nextStepAfter` (up to 10 times) is confirmed to eventually terminate in the same supportive closing message — guaranteeing no task-type-specific progression is an infinite loop or a dead end that never reaches the supportive fallback.

Guarantee: every task type has its own tailored step progression that terminates gracefully in a supportive message, unknown/custom steps never break the flow, and newly suggested/custom steps are always well-formed and undone.

### lib/store.test.js

This is the largest and most consequential test file among the assigned set: it exercises `lib/store.js`, the central persistence/state module for tasks, check-ins, reflections, settings, and stats. A code comment at the top of the file clarifies scope: these tests only exercise the **local/demo-mode** code path (no Firebase env vars are set in the test environment, so `firebaseEnabled` is false and every store function takes its `localStorage` branch) — Firestore-mode behavior itself is instead covered by the two Firestore rules test files. A `beforeEach` resets `localStorage` to a genuinely empty seeded object (rather than calling `.clear()`, which would trigger fallback to seeded demo content and make task-count assertions unreliable).

- **`addTask` (local demo mode)**:
  - Confirms the function returns *only* the newly saved task object, not the entire app-data blob (no `tasks`/`checkins` keys leaking onto the return value).
  - Confirms the saved task gets a stable non-empty string `id`, starts `done: false`, and has a well-formed `currentStep` (`done: false`, `completedAt: null`, string `text`).
  - Confirms the task is not duplicated in the persisted list (exactly one entry after one `addTask` call).
  - Confirms the new task persists and is retrievable after reloading the store via `loadData`.
- **`migrateTask`**: handles backward compatibility for an older flat-step data shape.
  - An old task with a flat `step` string field is upgraded into a `currentStep` object, and the legacy `step` property is removed.
  - A task that's already in the modern shape is left unchanged except for filling in default `priority: 'normal'` and `taskType: 'general'` when missing.
  - An explicitly set `priority` or `taskType` on an already-modern task is preserved, not overwritten by the defaults.
  - `loadData` automatically applies this migration to any legacy flat-step tasks found in storage, so old data self-heals on load.
- **"micro-step vs full-task completion"**: verifies the two completion concepts are fully independent.
  - Completing the current micro-step does *not* mark the overall task done.
  - Marking the overall task done does *not* implicitly mark the current step done.
  - A completed step can be reverted/un-completed (deferred or skipped), resetting `done`/`completedAt`.
  - Step-completion state persists correctly after a reload.
- **"settings (local demo mode)"**: a thorough defensive-programming test group.
  - Fresh accounts get sensible default settings (`defaultSettings`).
  - Settings save and reload round-trip correctly, and are merged with unset fields defaulting.
  - A valid `restartMemory` object (used for "pick up where you left off" resume state) persists correctly as part of settings.
  - **Malformed** restart memory (wrong types, invalid date) found in storage is dropped to `null` on load rather than corrupting the whole settings object or the rest of Today's view — while sibling valid fields (`calmMode`) are still respected.
  - Partial settings input is filled in with defaults for any missing fields.
  - Unknown-but-present stored fields (forward-compatible extra data) don't put the load into a broken state; existing typed fields are still read correctly.
  - **Wrong-typed** stored values are individually replaced with their defaults on a **field-by-field basis** — e.g. `calmMode: 'yes'` (a string, not boolean) falls back to its default, but a differently-shaped, correctly-typed sibling field (`reducedMotion: true`) is preserved. This proves the sanitization is granular, not "reject the whole object."
  - If the entire `settings` field is the wrong top-level shape (a string instead of an object), it falls back to full defaults rather than partially applying garbage.
- **"resilience to corrupted or invalid stored data"**: simulates various forms of storage corruption.
  - Malformed JSON in `localStorage` doesn't crash the app — it falls back to the seed data.
  - Valid JSON but the wrong top-level shape (e.g. an array instead of the expected object) also falls back to the same seeded demo content (with non-empty seeded tasks) rather than presenting a jarring blank app.
  - Non-array `tasks`/`checkins`/`reflections` values in otherwise-valid storage don't crash; each is coerced to an empty array.
  - Corrupted `stats` sub-fields are individually sanitized (numeric fields reset to 0, but valid sibling values like `strategyUses.big: 3` are kept) rather than the whole stats object being discarded.
  - After a corrupted read, the *next write* (e.g. `addTask`) recovers cleanly — the app isn't permanently stuck in a broken state once bad data has been encountered.
- **"local demo mode data separation"**: an explicitly documented limitation — passing different `uid` values (`'alice'`, `'bob'`) in local/demo mode does **not** create separate data buckets; local mode is a single shared browser-local store. The test and its comment clarify that real per-user isolation is enforced elsewhere, by Firestore's `firestore.rules` and the `users/{uid}/...` namespacing used once Firebase mode is active — this test exists so nobody mistakes local-mode `uid` params for a security boundary.
- **`updateTask`**: confirms editing a task's own fields (title, priority, due date) leaves its `currentStep` and `done` status untouched — updates are scoped to the fields actually passed.
- **"createdAt / updatedAt timestamps"**:
  - A newly created task gets matching `createdAt` and `updatedAt` string timestamps.
  - Editing a task later moves `updatedAt` forward (using a small real delay) while leaving `createdAt` unchanged.
- **`setCurrentStep`**: confirms the current step can be replaced outright (e.g. after regenerating or editing a step) and that the replacement persists across a reload.
- **"progress stats (small steps taken, strategy uses)"**:
  - New accounts start with all-zero `defaultStats`.
  - `recordStepCompleted` increments and persists a running total across multiple calls.
  - `recordStrategyUse` increments only the specific named barrier/strategy counter (e.g. `'reset'`), leaving unrelated counters (`'big'`, etc.) untouched.
  - Step-count and strategy-use stats are tracked independently and don't overwrite one another.
- **`saveReflection`**:
  - Starts with an empty reflection history.
  - Saved reflections appear in `loadData` ordered most-recent-first.
  - The student's own free-text words are stored verbatim, never rewritten or altered by the store layer.
- **`deleteCheckinHistory`**: confirms it removes check-ins and reflections but explicitly leaves tasks untouched — a scoped deletion, not a full wipe.
- **`deleteCompletedTasks`**: confirms only tasks marked `done` are removed; open tasks and check-in history are left intact.
- **`deleteAllData`**: confirms a full wipe resets tasks, check-ins, reflections, settings, and stats all the way back to their respective defaults.
- **`exportAllData`**: confirms the exported object includes all current tasks and check-ins plus `settings`, `stats`, and a string `exportedAt` timestamp, and — importantly — that export never invents or alters the underlying data, just repackages it exactly as stored (checked via a deep-equality comparison against the originally saved task).

Guarantee: `lib/store.js`'s local/demo-mode persistence layer is defensively hardened against malformed JSON, wrong-shaped data, and field-level type mismatches (always degrading gracefully rather than crashing or silently corrupting user data); task/step/settings/stats/reflection operations are scoped correctly to avoid unintended side effects on unrelated data; timestamps and legacy-data migration behave correctly; and export/delete operations do exactly what they claim, no more and no less. Multi-user data isolation is explicitly *not* covered here — that guarantee lives in the Firestore rules tests below.

### lib/timer.test.js

Tests `formatSeconds` from `lib/timer.js`, a small formatting helper (likely for a focus/break timer feature) that converts a raw seconds count into an `M:SS` display string.

- **`formatSeconds`** (single describe block, one-line tests):
  - Whole minutes format cleanly (120 → "2:00").
  - Sub-minute second counts are zero-padded (65 → "1:05").
  - Values under a minute format with a leading "0:" (9 → "0:09").
  - Negative input never produces a negative display — it clamps to "0:00".
  - Fractional seconds are rounded rather than truncated or left as decimals (59.6 → "1:00", i.e. rounds up to the next minute rather than displaying "0:59.6" or "0:59").

Guarantee: the timer display is always a clean, non-negative, zero-padded `M:SS` string regardless of fractional or negative input.

### firestore-rules.emulator-test.js

This file tests the **actual deployed `firestore.rules`** by running them against a real local Firestore emulator via `@firebase/rules-unit-testing` (`initializeTestEnvironment`, `assertSucceeds`/`assertFails`). It is an integration-style test of live rule enforcement, not a check of the rules file's text. A prominent comment block at the top of the file is important context: this file deliberately does **not** match Vitest's default test-discovery pattern (so `npm test` skips it), and it was written but **never actually executed** in the environment it was authored in, because that sandbox's network policy blocks downloading the emulator binary from `storage.googleapis.com`. The author is explicit that "written correctly" and "verified passing" are different claims here — running it for real requires the Firebase CLI, Java, and `npm run test:rules` locally.

Setup: `beforeAll` spins up a test Firestore environment loaded with the real `firestore.rules` file content; `beforeEach` clears all Firestore data between tests; a `dbAs(uid)` helper returns a Firestore client authenticated as a given user (or unauthenticated if `uid` is falsy).

- **"users/{userId} document"**:
  - A signed-in user can read and write their own top-level user document.
  - A signed-in user is blocked from reading or writing another user's document (tested as separate read and write cases).
  - An unauthenticated request is blocked entirely, even for a `get`.
- **"nested subcollections (tasks, checkins, reflections)"**: a parameterized loop over the three subcollections, for each verifying:
  - A signed-in user can read and write their own documents in that subcollection.
  - A signed-in user cannot read another user's documents in that subcollection.
  - A signed-in user cannot write into another user's subcollection.
  - An unauthenticated request cannot read the subcollection at all.
- **"task schema validation"**: exercises Firestore's schema-validation rules for task documents specifically (not just ownership).
  - A well-formed task (title, done, priority, module, due) is accepted.
  - A task missing `title`, or with a non-string `title`, is rejected.
  - A task whose `done` field isn't a boolean is rejected.
  - A `priority` value outside the allowed enum is rejected, while omitting `priority` entirely is accepted (it's optional).
  - A **partial update** (mirroring how `lib/store.js`'s `updateTask` actually writes) is validated against the full resulting merged document, not just the fields being changed — confirming the rules correctly evaluate `request.resource.data` post-merge.
- **"check-in schema validation"**:
  - A valid, fully scored check-in (answers + risk score/band/message) is accepted.
  - An intentionally incomplete check-in with `risk: null` and an `incomplete: true` flag (the "not sure" answer path) is explicitly accepted — schema validation doesn't force every check-in to have a full score.
  - A score above 100, a negative score, a band outside `Low`/`Moderate`/`Higher`, and a non-numeric score are all separately rejected.
- **"deletion (matches lib/store.js delete* functions)"**:
  - A signed-in user can delete their own documents (e.g. a task).
  - A signed-in user cannot delete another user's documents.
  - A signed-in user can delete their own top-level `users/{uid}` document, supporting a full account-data wipe.

Guarantee (once actually run against a live emulator): Firestore enforces strict per-user ownership on every collection and subcollection, blocks all cross-user and unauthenticated access, and validates task/check-in document shapes (including enum and numeric-range constraints) both on full writes and partial updates — matching the access patterns `lib/store.js` actually uses. As the file's own comment states, this coverage is currently unverified-by-execution in this environment and should be run locally via the emulator before being trusted as passing.

### firestore.rules.test.js

This file takes a different, lighter-weight approach from the emulator test above: rather than running the rules against a live Firestore emulator, it reads `firestore.rules` as a **plain text file** (via Node's `fs`) and asserts that specific expected substrings appear in the rules source. It requires no emulator, no Firebase CLI, and runs as a normal fast Vitest unit test — but as a consequence, it verifies that certain security-relevant *patterns of code exist in the file*, not that they actually behave correctly at runtime (a rules file could contain all the right substrings and still have subtly broken logic around them — that gap is exactly what the emulator test file is for).

- **"Firestore security rules"** (single describe block):
  - "requires authenticated ownership of the user branch" — checks the file text contains both `request.auth != null` and `request.auth.uid == userId`, i.e. the ownership-check pattern is present somewhere in the rules.
  - "validates task writes instead of allowing arbitrary task documents" — checks for a `validTask(data)` function definition, at least one call site (`validTask(`), and use of `request.resource.data`.
  - "restricts task priority to known Nuvora values" — checks for a `data.priority in [...]` enum pattern containing `'low'`, `'normal'`, and `'high'`.
  - "validates check-in and pressure-result writes" — checks for `validCheckin(data)` and `validRisk(data)` function definitions, and that the `Low`/`Moderate`/`Higher` band strings appear (presumably inside an enum check).
  - "has explicit owner-only rules for reflections, settings and stats" — checks the file contains `match` blocks for `/reflections/{reflectionId}`, `/settings/{settingId}`, and `/stats/{statsId}`.
  - "uses an explicit default-deny fallback" — checks for a catch-all `match /{document=**}` block paired with `allow read, write: if false;`, confirming the rules end with a deny-by-default safety net rather than an implicit allow.

Guarantee: this file is a fast, emulator-free smoke test confirming the *textual presence* of the expected security patterns (auth checks, schema-validating functions, priority/band enums, per-subcollection owner rules, and a default-deny fallback) in `firestore.rules`. It would catch someone accidentally deleting a validation function or the default-deny block, but — unlike `firestore-rules.emulator-test.js` — it cannot catch a logic bug where the right-looking code doesn't actually enforce what it appears to; that behavioral verification is the emulator test file's job.
## Part 5: NuvoraApp Component Tests

### components/NuvoraApp.ui.test.jsx

This is the largest and broadest suite in the project, exercising `NuvoraApp` (the app's top-level component/router) as a black box through `@testing-library/react`. Rather than testing implementation details, it renders the full app in local/demo mode (seeded via `localStorage['nuvora-demo-data-v1']`) and drives it the way a real student would: clicking nav buttons, filling forms, and reading back the same accessible text and roles a screen reader or keyboard user would encounter. It matters because `NuvoraApp` is the single component that owns almost all client-side state and screen transitions — regressions here would be user-facing regressions in the app's core flows (check-ins, tasks, Calm Mode, Overwhelmed Mode, Learn tools, Progress, Settings/Privacy). Each `describe` block below targets one feature area or one historical regression that was found and fixed.

**`support-summary copying`** — Verifies the "Support" screen's clipboard-copy affordance for the caregiver-facing summary. One test confirms a successful `navigator.clipboard.writeText` produces a `role="status"` confirmation containing the risk band (e.g. "moderate"). Another confirms a rejected clipboard write surfaces a `role="alert"` fallback message telling the user to copy the text manually, without throwing. A third confirms the Copy button is disabled — with an explanatory caption — until at least one check-in has been completed, since there is nothing meaningful to summarize before that.

**`error handling`** — A single test simulates a persistence failure during check-in submission (by making `Storage.prototype.setItem` throw right before the final answer is submitted). It expects a `role="alert"` error message ("We couldn't save your check-in just now"), that the check-in screen and the user's in-progress radiogroup answers remain on screen (not silently discarded), and critically that no pressure-result screen is shown, since the check-in was never actually persisted.

**`live status messages carry the correct ARIA role`** — Two focused tests double-check the ARIA semantics of the same clipboard-copy flow from the first block: a successful copy must use `role="status"` (polite, non-interrupting) and a failed copy must use `role="alert"` (assertive, interrupting) — asserting on role rather than just text content, since the distinction is what determines how assistive tech announces it.

**`offline banner`** — Confirms the offline indicator's logic is not naive. It stays hidden when `navigator.onLine` is simply undefined/unknown (the app assumes online rather than falsely warning). It correctly appears on a real `window` `'offline'` event with the message "You're offline. Some saves may wait until you reconnect." and disappears again on the matching `'online'` event.

**`privacy: offline storage is explained clearly`** — Navigates through the menu to the "Privacy & data" screen and expands the "Offline storage" disclosure, checking that it explicitly states signed-in Firebase mode does not enable persistent browser caching by default — a specific, auditable privacy claim rather than vague reassurance.

**`navigation: every screen reachable without the bottom nav must have a way back`** — A regression test (with an explanatory comment: Settings previously had no way back to Today, unlike Check-in/Overwhelmed/Reflection/Privacy which at least had some path). It parametrically checks two menu-only screens (Accessibility settings, Privacy & data) each have a working "…Today" back button that returns the user to the Today screen.

**`task modal keyboard accessibility`** — Verifies the Add/Edit Task dialog behaves like a proper modal. On open, focus moves into the "Task name" field; Tab and Shift+Tab are trapped between the first and last focusable elements inside the dialog; Escape closes it; and focus returns to whichever button triggered it. A second test repeats the open/close/focus-return check specifically for the Edit flow, confirming focus returns to the *specific* "Edit {task}" button that was clicked (not just any trigger), which matters when multiple tasks each have their own Edit button.

**`Adaptive Calm Mode — Phase A`** — Covers the foundational behavior of Calm Mode, a simplified UI state for reduced cognitive load. Tests confirm: the five-item bottom nav collapses to just "My step" and "Support" while Calm Mode is on; the full task plan remains reachable via "Open my plan" even from the single-step view; the Calm plan view hides deadline/priority/step-detail pressure cues (no "Overdue", "High priority", or step-detail preview text) while leaving the underlying task data unchanged (turning Calm Mode off immediately re-reveals the same data); and enabling Calm Mode from any of three different screens (Tasks, Learn, Progress) consistently routes back to the single-step Today view rather than leaving the user on the screen they started from.

**`Adaptive Calm Mode — Phase B temporary settings`** — Covers a secondary layer of temporary, per-session demand-reduction toggles nested inside Calm Mode ("Hide time pressure", "Hide progress numbers", "Reduce visual detail", "Reduce motion"). Tests confirm: all four start enabled by default each Calm session; toggling "Hide time pressure" off reveals deadline/priority info in the plan without leaving Calm Mode; toggling "Reduce visual detail" off restores step text and Edit/Delete buttons; "Reduce motion" independently controls a `reduced` CSS class on `<main>` regardless of the saved accessibility setting; the default Calm recommendation text stays free of time-pressure language; the four toggles live behind a collapsed "4 temporary preferences / Show +" disclosure until expanded; and toggling any of them off and then leaving/re-entering Calm Mode resets them back to their enabled defaults (i.e., they are genuinely temporary/session-scoped, not sticky).

**`Adaptive Calm Mode — Phase C stop and restart memory`** — Covers a "Stop for now" mechanism that lets a student pause mid-task without pressure. Tests confirm: clicking "Stop for now" shows a calm confirmation screen, hides further plan navigation, and persists an exact `restartMemory` object (task id/title/step text/timestamp) to storage; on a fresh render with that memory present, a "WELCOME BACK" screen surfaces the saved restart point; clicking "Continue from here" resumes directly into Calm Mode at the remembered step without inventing any new/different recovery flow; and — when Calm Mode itself is off but restart memory exists — a "Pick up where you left off" banner can be dismissed via a "Dismiss" button, which clears `restartMemory` in storage without altering the underlying task or its step text.

**`Adaptive Calm Mode — Phase D gentle exit`** — Covers what happens when a student chooses to leave Calm Mode rather than being dumped straight into the full interface. "Leave Calm Mode" surfaces an intermediate choice screen ("Return to Today" / "Show my tasks" / "Stay in Calm Mode"). Tests confirm each option behaves correctly: staying in Calm Mode leaves task data (including `done` and step text) untouched; "Show my tasks" lands on the full Tasks view and persists `calmMode: false`; and leaving Calm Mode while a restart memory exists preserves that memory intact (surfacing "Pick up where you left off" afterward) rather than discarding it.

**`task-type step templates`** — A single test confirms that creating a new task with type "essay" seeds it with the essay-specific first step ("Open a blank document and write only the title.") rather than a generic default step, verifying task-type-aware step templating.

**`pattern insights on Progress`** — Tests the "Patterns" panel on the Progress screen, which surfaces recurring check-in trends. With four check-ins skewed heavily toward one factor (task initiation), the panel appears and correctly names "Task initiation" as the largest contributor. With no check-in history at all, no Patterns panel renders — confirming the feature deliberately avoids overclaiming insight from insufficient data.

**`barrier-history-aware Overwhelmed Mode ordering`** — Tests that the barrier-selection radiogroup in Overwhelmed Mode reorders its options based on the student's `strategyUses` history: when "reset" has been used heavily, "I need a short reset" appears first instead of the fixed default order; with no usage history at all, the original default order ("I do not know where to start" first) is preserved.

**`Overwhelmed Mode priority-task consistency`** — Confirms that when Overwhelmed Mode recommends "just open X" for the "I do not know where to start" barrier, it selects the same priority task the rest of the app's shared recommendation logic would pick (the more urgent, due-tomorrow, high-priority task) rather than naively grabbing the first unfinished task in storage order (which in this test is a low-priority, due-later task).

**`Overwhelmed Mode barrier panels`** — A single smoke-style test confirms selecting "I need a short reset" renders an actual working reset panel ("A 2-minute breathing reset") instead of crashing, and that clicking "I'm ready to continue" returns the user cleanly to the Today screen.

**`Learn tools are differentiated and tied to the student's real task`** — Covers the expanded "study tools" section under Learn. Tests confirm: the four tools (Focus Sprint, Distraction Parking Lot, If–Then Plan, Visual Step Map) are each distinct rather than all repeating the same timer/soft-tone boilerplate; Focus Sprint lets the student pick a duration (e.g. "10 min" shows a "10:00" countdown); the Distraction Parking Lot lets a stray thought be jotted down ("Reply to Sam") without adding it to the real task list; the Visual Step Map references the student's actual current task by name and can save its first step as the task's next step; and a previously-redundant "Start activity" disclosure has been removed and stays removed.

**`final accessibility hardening`** — A single test confirms the header's Calm Mode toggle button exposes a real `aria-pressed` state (`"false"` when off), which correctly flips to `"true"` (with an updated accessible name, "Turn Calm Mode off") once activated — ensuring it behaves as a proper accessible toggle button, not just a relabeled button.

### components/NuvoraApp.firebase.test.jsx

This suite covers the Firebase-mode-only UI paths — login, signup, password reset, account deletion, and onboarding-into-auth — that never execute in the local/demo mode used by the rest of the test suite, since no real Firebase project is configured in the test environment. It works by mocking both the `firebase/auth` SDK and the project's own `@/lib/firebase` and `@/lib/store` wrappers (`onAuthStateChanged`, `signIn`/`signUp`, `sendPasswordResetEmail`, `signOut`, `reauthenticate`, `deleteAccount`, `loadData`, `deleteAllData`, `saveSettings`), then dynamically re-imports `NuvoraApp` per test so each test's auth-state mock takes effect before the module's top-level auth listener wiring runs. This matters because auth and account-deletion code paths carry real security and data-loss consequences if mishandled (e.g., deleting data before confirming identity), and error messages here must not leak sensitive information (e.g., whether an email is registered).

**`Firebase mode: login/signup error mapping`** — Confirms Firebase auth error codes are translated into specific, user-safe messages rather than raw Firebase error text: an `auth/invalid-credential` login failure shows "The email or password doesn't match...", and an `auth/email-already-in-use` signup failure shows a distinct "Try logging in instead" message — proving the two failure modes are not conflated.

**`Firebase mode: forgot password`** — Confirms the password-reset flow does not leak account existence: whether the target email exists (`auth/user-not-found`) or genuinely succeeds, the exact same reassuring "instructions have been sent" message is shown either way (this is checked by comparing the two message strings directly). A separate, genuine non-enumeration error (`auth/network-request-failed`) is shown distinctly, confirming the sameness above is a deliberate anti-enumeration choice, not just a bug that swallows all errors identically.

**`Firebase mode: load failure and retry`** — Confirms that a failed initial data load (e.g., a `permission-denied` or network error from `loadData`) shows a calm, recoverable error screen ("We couldn't load your study space" / "Your data hasn't been changed.") with both "Try again" and "Sign out" actions, rather than leaving the user on an indefinitely frozen splash screen. "Try again" is confirmed to actually retry `loadData` (asserted via call count) and succeed when the retry resolves; "Sign out" is confirmed to be usable directly from the error screen without requiring a successful load first.

**`Firebase mode: account deletion order`** — The most security-sensitive block: it confirms account deletion always reauthenticates the user *before* deleting anything, explicitly described as "proving the fix for the old unsafe order." One test asserts the exact call order (`reauthenticate` then `deleteAccount`) via a shared call-order array. Another confirms that if reauthentication fails (wrong password), `deleteAccount` is never called and the user sees the same non-revealing "doesn't match" message. A third confirms the delete button flow refuses to even attempt reauthentication if no password was entered at all ("Enter your password to confirm."), so `reauthenticate` is never invoked on an incomplete form.

**`Firebase mode: onboarding`** — Confirms the three-screen onboarding sequence is shown only to genuine first-time visitors (no `nuvora-onboarding-seen` flag) and gates entry to the Auth screen. Tests walk through all three onboarding screens via "Continue"/"Get started" to reach Auth; confirm "Skip" reaches Auth immediately and that the skip is remembered on a subsequent render (onboarding does not reappear); and confirm onboarding is skipped entirely when the seen-flag is already set.

**`Firebase mode: optional display name at signup`** — Confirms the optional display-name field at signup is fully optional in both directions: providing a name calls `saveSettings(uid, { displayName })` after a successful signup, while leaving it blank completes signup normally without ever calling `saveSettings`.

### components/NuvoraApp.journeys.test.jsx

This suite tests complete, realistic end-to-end user journeys through the real app in local/demo mode, rather than isolated features. It mocks only the network boundary (`/api/risk`, since there's no real Next.js server under Vitest) but has that mock delegate to the actual `calculatePressure` function the real API route uses, so the scoring logic under test is genuine, not hand-faked. This matters because unit-level and single-screen tests can each pass while the *stitched-together* flow — add a task, check in, get a recommendation, act on it, and have the change persist — still breaks; these tests catch that class of integration regression, explicitly following a "Phase 5 test matrix" of ten numbered journeys.

**`check-in first question uses descriptive options`** — Confirms the first check-in question ("How is your workload feeling today?") now renders plain-language options ("Calm & in control", "Manageable", "Heavier than usual", "Very overwhelming") instead of bare numbers, and that selecting the highest/most-severe option scores identically to the old numbered 1–4 scale's top value — verified end-to-end by completing a full check-in and confirming the resulting explanation names "Workload feeling" as the largest contributor.

**`end-to-end journeys`** — Three large, multi-step tests. The first walks through journeys 1–8 in one continuous flow: entering demo mode, adding a task with a deadline, completing a high-pressure check-in (verifying the "Higher pressure" band and its explanation), returning to Today to receive one prioritized next step, entering Overwhelmed Mode and choosing "I do not know where to start," completing one micro-step ("I opened it" → "One step down."), and finally confirming the original task is still open/incomplete afterward (not silently marked done by the micro-step flow). The second test (journey 9) confirms persistence survives a simulated page reload: a task added before an unmount/remount cycle is still present afterward, proving state round-trips through `localStorage` rather than living only in memory. The third (journey 10) walks through deleting all user data via Privacy & data (typing "DELETE" to confirm), confirms a success message, and verifies the previously-added task no longer appears anywhere in the app afterward.

### components/NuvoraApp.learn-difficult.test.jsx

This suite focuses specifically on the Learn screen's "difficult moments" support flow — a set of six barrier-specific entry points ("I can't start", "This feels too big", "I have very low energy", "I'm overstimulated", "I need company", "I don't know what I need") that sit above and separate from the general study-tools grid. It matters because this is the app's most direct, in-the-moment support surface for a student who is currently stuck, and each barrier must route to genuinely different, task-aware help rather than a generic fallback — the suite exists to prove that differentiation and to tie each panel back to the student's real, current task rather than a placeholder.

**`Learn / Difficult Moments support`** — One test confirms the difficult-moment buttons and a "Reset Space" option are shown immediately on entering Learn, ahead of and separate from the optional "More study tools" section (which starts collapsed — no "Focus Sprint" visible — and expands via "Show more study tools" to reveal all four tools plus a properly `aria-expanded="true"` toggle). A second test confirms "I can't start" surfaces a panel that references the real seeded task by name ("Draft chapter 2"), offers an "Open {task}" action, and explicitly states no timer is required. A third confirms "This feels too big" lets the student save a smaller, broken-down step ("Find the place...") as the task's actual next step, and that this correctly threads through to the Tasks screen afterward without breaking navigation or replacing the whole task object. A fourth confirms the overstimulation panel offers a "Move somewhere quieter" toggle (which becomes `aria-pressed="true"`) and explicitly does not force a 2-minute timer, since sensory reset should not itself add time pressure. A fifth confirms the "I don't know what I need" flow uses a short three-question form (brain/environment/task feel) to route the student to a low-energy-appropriate option, landing on an effort-level chooser ("Tiny"/"Enough"/"Full"). The last confirms the "I need company" body-doubling option copies an invitation message to the clipboard (verified against real `navigator.clipboard.writeText`, checking the copied text mentions working quietly together) and confirms a copy — never an automatic send — is what happens.

### components/NuvoraApp.a11y.test.jsx

This suite is the automated half of the project's accessibility auditing (explicitly noted in the file's own comments as distinct from a separate, manual Phase 3b audit). It runs `axe-core`'s automated ruleset against the rendered DOM of each main screen, which catches missing labels, insufficient contrast, and invalid ARIA usage, but — as the file itself notes — cannot confirm how a real screen reader announces content or how a keyboard-only run-through actually feels; those manual concerns are instead covered here by separate, targeted DOM/focus assertions rather than axe. This matters because it gives blanket automated coverage across screens in addition to the feature-specific accessibility checks scattered through the other test files (e.g., focus trapping in `NuvoraApp.ui.test.jsx`).

**`accessibility: main screens (axe-core)`** — Runs `axe.run()` against the rendered container for each of several core screens and asserts zero violations: the Today screen; the Tasks screen with its add-task form open; the Check-in question screen; each of Learn, Progress, and Support in turn (looped over the three labels); and Overwhelmed Mode with a barrier panel ("The task feels too big") selected. Any violation found is rendered into the assertion failure message (rule id, impact, and affected node count) for easy diagnosis.

**`accessibility: drawer focus management (manual DOM assertions, not axe)`** — Verifies the side-menu drawer's focus behavior by direct DOM assertions rather than axe: opening the menu moves focus to the drawer's "Close menu" button, and pressing Escape closes the drawer and returns focus to the original "Open menu" trigger. A second test confirms Tab is trapped within the open drawer, wrapping focus from the last button back to the first.

**`accessibility: check-in radiogroup keyboard navigation (manual DOM assertions, not axe)`** — Verifies the check-in question radiogroup supports standard roving-focus keyboard navigation: pressing ArrowRight moves both the checked selection and DOM focus to the next option, and pressing End jumps selection straight to the last option ("Not sure").
