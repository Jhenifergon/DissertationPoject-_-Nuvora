# Android test build (Capacitor)

This is a **test/demo build for a dissertation**, not a Play Store release.
It wraps the existing static export of the Next.js app in a Capacitor
Android WebView shell. It is not signed for release, not published, and does
not collect research participant data.

## What changed to make this possible

- `next.config.mjs` sets `output: 'export'`. Capacitor ships the app as
  static files inside the APK (there is no Node server on the phone), so the
  production build has to be static HTML/CSS/JS rather than a Next.js server
  build.
- `app/api/risk/route.js` (and its test) were **removed**. It was a POST
  endpoint that duplicated `calculatePressure()` from `lib/risk.js` as JSON
  over HTTP — grep confirms the UI never called it (`Checkin.jsx` always
  calls `calculatePressure()` directly, client-side). Next.js static export
  cannot contain server Route Handlers, and this one had no caller, so
  removing it is behaviour-neutral. The scoring formula and weights in
  `lib/pressureConfig.js` / `lib/risk.js` are untouched.
- `components/ui/ExternalLink.jsx` wraps the app's four outbound links
  (Learn screen: YouTube, NHS, ADHD Foundation, National Autistic Society).
  On the web it behaves like a normal `<a target="_blank">`. Inside the
  Android app (`Capacitor.isNativePlatform()`), it opens the link in a
  Chrome Custom Tab via `@capacitor/browser` instead, which is the reliable
  way to hand off external links from a Capacitor WebView.
- `@capacitor/core`, `@capacitor/android`, `@capacitor/browser` were added
  as dependencies, `@capacitor/cli` as a dev dependency.
- `capacitor.config.ts`: `appId: "com.nuvora.dissertation"`,
  `appName: "Nuvora"`, `webDir: "out"` (the static export output).
- `android/` is the generated native project (`npx cap add android`).

## What stayed exactly the same

- The scoring model (`lib/risk.js`, `lib/pressureConfig.js`) — not touched.
- Firebase Authentication and Firestore — still the Firebase **Web SDK**
  (`lib/firebase.js`), running inside the WebView exactly as it does in a
  browser. There is no native Firebase Android SDK, no
  `google-services.json`, and no native Google Services Gradle plugin
  applied (the boilerplate `google-services` classpath Capacitor's template
  always includes is a no-op unless that file exists — see
  `android/app/build.gradle`).
- Demo mode, account deletion order (reauthenticate → delete Firestore data
  → delete the Auth account), and the Firestore ownership rules
  (`firestore.rules`) — unchanged.

## Everyday workflow

```powershell
npm run android:sync   # next build (static export) + npx cap sync android
npm run android:open   # opens the android/ project in Android Studio
```

Run `android:sync` after any code change before testing on a device/emulator
— Capacitor does not watch files; it copies `out/` into
`android/app/src/main/assets/public` only when you sync.

## Building the debug APK

This environment has Node, npm, the Firebase CLI and a JDK, but **no Android
SDK / Android Studio**, so the actual APK could not be compiled here.
`gradlew assembleDebug` was run here to confirm exactly where it stops: it
gets past project configuration (see the `android.overridePathCheck` note
below) and fails only at `SDK location not found` — i.e. everything up to
the point of needing the SDK itself is confirmed working. Installing
Android Studio and pointing it at the project (step 1 below) is the one
remaining step. Do this part on your own Windows machine:

1. Install [Android Studio](https://developer.android.com/studio). Run it
   once so it installs the Android SDK (default location:
   `%LOCALAPPDATA%\Android\Sdk`) and accepts the SDK licences.
2. From the project root, in PowerShell:

   ```powershell
   npm install
   npm run android:sync
   cd android
   .\gradlew.bat assembleDebug
   ```

3. The unsigned debug APK will be at:

   ```
   android\app\build\outputs\apk\debug\app-debug.apk
   ```

4. Install it on a phone with USB debugging enabled:

   ```powershell
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```

   Or copy the `.apk` file to the phone and open it (allow "install unknown
   apps" for the file manager/browser you use to open it).

**Non-ASCII project path:** this project lives under a path containing "Área
de Trabalho". The Android Gradle Plugin refuses to build from a non-ASCII
path on Windows by default — `android/gradle.properties` already sets
`android.overridePathCheck=true` to disable that check (safe here since the
project doesn't use the NDK), so you should not need to do anything about
this yourself. If you ever move the project to a plain-ASCII path (e.g.
`C:\Dev\NuvoraApp`), that line becomes unnecessary but is harmless to leave.

If `gradlew.bat` cannot find the SDK, create `android\local.properties` with:

```
sdk.dir=C:\\Users\\<you>\\AppData\\Local\\Android\\Sdk
```

(Android Studio normally writes this file for you the first time you open
the project there — running `npm run android:open` and letting Android
Studio sync once is the simplest path.)

## Credentials

- `serviceAccountKey.json` (Firebase Admin, used only by the local seed
  scripts in `scripts/`) is `.gitignore`d, was never committed, and is never
  read by any client or Capacitor code — it cannot end up in the APK.
- `.env.local` (the `NEXT_PUBLIC_FIREBASE_*` web config) is also
  `.gitignore`d and never committed, but its values **do** end up inside the
  APK — that is expected and safe. Firebase's client-side web config
  (`apiKey`, `authDomain`, `projectId`, etc.) is not a secret; it identifies
  which Firebase project to talk to. The actual security boundary is
  `firestore.rules`, which must be deployed (see below) and restricts every
  read/write to `request.auth.uid == the document's owner`.
- Do not add `google-services.json` unless you deliberately start using the
  native Firebase Android SDK — this build intentionally does not need it.

## Firestore rules

`firestore.rules` already enforces per-user ownership on `tasks`, `checkins`,
`reflections`, `settings` and `stats`, with a default-deny fallback. Confirm
the version deployed to the live project matches this file:

```powershell
npx firebase deploy --only firestore:rules --project nuvora-b197f
```

Run this after any change to `firestore.rules`, and before the first phone
demo against the real backend — a rules change in this repo only takes
effect once deployed.
