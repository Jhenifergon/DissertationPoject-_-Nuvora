# iOS test build (Capacitor)

This is a **private test/demo build for a dissertation**, not an App Store
submission. It reuses the same static export and Capacitor setup as the
Android build (`docs/ANDROID_BUILD.md`) — same `appId`, same `webDir`, same
scoring logic, same Firebase Web SDK.

## What's reused from the Android setup (unchanged)

- `next.config.mjs` (`output: 'export'`) and `webDir: 'out'` in
  `capacitor.config.ts` — the same static export both platforms ship.
- `appId: 'com.nuvora.dissertation'`, `appName: 'Nuvora'` — identical on
  both platforms, as Capacitor intends (one `capacitor.config.ts` for all
  platforms).
- `components/ui/ExternalLink.jsx` — already platform-generic
  (`Capacitor.isNativePlatform()` + `@capacitor/browser`), so the four
  outbound Learn-screen links work the same way on iOS with no extra code.
- `lib/risk.js` / `lib/pressureConfig.js` scoring, Firebase Auth/Firestore
  (`lib/firebase.js`), demo mode (`lib/store.js`), account deletion order —
  none of this is platform-specific; nothing here changed for iOS.

## What's new for iOS

- `@capacitor/ios` (dependency) and the generated `ios/` native Xcode
  project (`npx cap add ios`).
- `@capacitor/status-bar` and `@capacitor/keyboard` — added for **both**
  platforms (they're harmless no-ops on the web), because plain WKWebView
  needs explicit help with two things a normal Safari tab handles for free:
  - **Status bar contrast.** Nuvora's background is a light warm cream
    (`--nuvora-bg: #faf7f0`, see `app/styles/tokens.css`). Without setting a
    style, iOS's default status bar content can end up hard to read against
    a light header. `NuvoraApp.jsx` now calls
    `StatusBar.setStyle({ style: Style.Dark })` on native platforms —
    `Style.Dark` is the plugin's name for *dark* status bar icons/text,
    which is the correct choice for a *light* background.
  - **Keyboard covering inputs.** A WKWebView does not automatically resize
    or scroll the page when the iOS keyboard appears, unlike a native
    Safari tab — a known, common Capacitor iOS issue. `NuvoraApp.jsx` calls
    `Keyboard.setResizeMode({ mode: KeyboardResize.Native })` on iOS so the
    webview's visible area shrinks to fit above the keyboard.
  - Both calls live in one `useEffect` near the top of `NuvoraApp.jsx`,
    guarded by `Capacitor.isNativePlatform()`, wrapped in `.catch(() => {})`
    since they're cosmetic/UX only and must never block the app if a
    platform API changes.
- `npm run ios:sync` / `npm run ios:open` scripts, mirroring the Android
  ones.

## Safe areas (notch / home indicator) — checked, not changed

Nuvora's `app/layout.js` does not set `viewport-fit=cover`, and nothing
under `app/styles/` reads `env(safe-area-inset-*)`. I deliberately left
this as-is rather than adding it: without `viewport-fit=cover`, WebKit's
documented default (`viewport-fit=auto`) already keeps the page's layout
viewport inside the safe area — content will not render under the notch or
home indicator, and nothing needs to reach for `env()` insets to avoid it.
Opting into `viewport-fit=cover` would require adding safe-area padding
throughout the CSS to compensate, which is exactly the kind of redesign
work this task asked me not to do speculatively. **This reasoning is based
on documented WebKit behaviour, not a device test** — it's the first thing
to check on a real iPhone (see the checklist below). If the header or
bottom nav do end up tight against the notch/home indicator on-device, the
fix is small (`viewport-fit=cover` in the viewport meta + `padding-top:
env(safe-area-inset-top)` / `padding-bottom: env(safe-area-inset-bottom)`
on `.phone` in `app/styles/base.css`) — flag it and I'll add it precisely.

## Firebase configuration for iOS

- **No `GoogleService-Info.plist` is needed or added.** Like the Android
  build, this stays on the Firebase **Web SDK** (`lib/firebase.js`), running
  inside the WKWebView exactly as it does in a desktop browser — not the
  native Firebase iOS SDK. There is nothing iOS-specific to configure in
  the Firebase console for this to work.
- **Authorized domains: no change needed for email/password.** Firebase's
  "Authorized domains" allowlist only matters for redirect-based OAuth
  flows (e.g. "Sign in with Google") and for the continue-URL in email
  action links. Nuvora only uses `signInWithEmailAndPassword` /
  `createUserWithEmailAndPassword`, which call the Identity Toolkit REST
  API directly and do not depend on the WebView's origin
  (`capacitor://localhost` by default). This matches the same reasoning
  already verified for the Android build.
- If you ever add Google/Apple Sign-In later, that's a different, larger
  change (native SDKs and/or authorized-domain + URL-scheme configuration)
  — out of scope here and not needed for this test build.

## Credentials

Same as Android (see `docs/ANDROID_BUILD.md` for the full explanation):
`serviceAccountKey.json` and `.env.local` are both `.gitignore`d and were
never committed; neither is read by any client code, so neither can end up
in the iOS app bundle. I checked `ios/App/App/public` (the folder Capacitor
copies into the Xcode project) after building and confirmed it only
contains the static export's own HTML/CSS/JS/fonts — no secret strings, no
service-account or `.env` content.

## Everyday workflow

```powershell
npm run ios:sync    # next build (static export) + npx cap sync ios
```

Run this after any code change, before opening/rebuilding in Xcode —
Capacitor only copies the latest `out/` into `ios/App/App/public` when you
sync, it does not watch files.

## What I verified in this environment (Windows, no Mac/Xcode)

- `npx cap add ios` — succeeded. This project uses Capacitor's newer
  **Swift Package Manager** integration (`ios/App/CapApp-SPM/Package.swift`)
  rather than CocoaPods, which is why this step worked at all without a Mac
  — no `pod install` is required at any point in this workflow.
- `npm run lint` — clean.
- `npm test` — 287/287 pass.
- `npm run build` — static export succeeds.
- `npx cap sync ios` — succeeds, copies the build into
  `ios/App/App/public`, and registers all three plugins
  (`@capacitor/browser`, `@capacitor/keyboard`, `@capacitor/status-bar`) in
  `Package.swift`.
- `capacitor.config.ts` / `ios/App/App/capacitor.config.json` — confirmed
  `webDir: "out"`, no `server.url`, so the release app loads the bundled
  static files, never `localhost` or a dev server.
- Bundle ID (`com.nuvora.dissertation`) and display name (`Nuvora`) — set
  identically to Android in `capacitor.config.ts`, verified in
  `App.xcodeproj/project.pbxproj` (`PRODUCT_BUNDLE_IDENTIFIER`) and
  `Info.plist` (`CFBundleDisplayName`).

**What I did NOT and could not do here:** compile the app, run it in the
iOS Simulator, or install it on an iPhone. None of that is possible without
macOS and Xcode — this is an Apple platform restriction, not a tooling gap
I can work around. Nothing below this line has been tested by me.

## Building on a Mac with Xcode — exact steps

### 1. Transfer the project to the Mac

Do **not** copy `node_modules`, `.next`, `out`, `android` build folders, or
`ios/App/Pods` (there are none — this project doesn't use CocoaPods) — they
regenerate. The simplest options, in order of preference:

- **If you use OneDrive on the Mac too**: it's already there once OneDrive
  finishes syncing.
- **Git** (cleanest if you're willing to commit): push this branch to a
  remote (GitHub etc.), then `git clone` on the Mac.
- **Manual copy**: zip the whole project folder (excluding
  `node_modules`), AirDrop/USB-drive/cloud-upload it, unzip on the Mac.

### 2. Install prerequisites on the Mac (all free)

1. **Xcode** — Mac App Store, free. This is large (~10 GB); start the
   download early.
2. **Node.js** — download the LTS installer from nodejs.org, or
   `brew install node` if you use Homebrew.

### 3. Install dependencies and sync

Open Terminal, `cd` into the project folder, then:

```bash
npm install
npm run ios:sync
```

### 4. Open the project in Xcode

```bash
open ios/App/App.xcodeproj
```

Open **`App.xcodeproj`**, not a `.xcworkspace` — this project has no
CocoaPods workspace file (see the SPM note above). Xcode will show
"Resolving Package Graph" in the status bar the first time — wait for it to
finish; it needs internet access once to fetch the Capacitor Swift
packages.

### 5. Select a Development Team (free Apple ID is enough)

1. In Xcode's left sidebar (Project Navigator), click the top-level **App**
   project, then the **App** target, then the **Signing & Capabilities**
   tab.
2. Leave **Automatically manage signing** checked.
3. Under **Team**, choose your Apple ID. If none is listed: **Xcode menu →
   Settings → Accounts → + → Apple ID**, sign in with any Apple ID (no paid
   Apple Developer Program needed for this), then come back and select it.
4. **Bundle Identifier** should already show `com.nuvora.dissertation` — if
   Xcode complains it's taken (it's a shared global namespace), append
   something unique, e.g. `com.nuvora.dissertation.yourname`, and re-run
   `npm run ios:sync` isn't required for this — just fix it directly in
   Xcode's field, matching what `capacitor.config.ts`'s `appId` would need
   to be if you want them to stay in sync long-term.

### 6. Connect your iPhone and run

1. Connect the iPhone via USB/USB-C-to-Lightning cable.
2. Unlock the phone; if it asks "Trust This Computer?", tap **Trust** and
   enter your passcode.
3. In Xcode's toolbar, click the device selector (next to the Run button)
   and choose your iPhone from the list (not a Simulator).
4. Press **Run ▶** (or Cmd+R).
5. **First launch only**: iOS will refuse to open the app with "Untrusted
   Developer". On the iPhone: **Settings → General → VPN & Device
   Management** → tap your Apple ID under Developer App → **Trust**. Then
   open the app from the home screen (or press Run again in Xcode).

### Free Apple account vs. paid Apple Developer Program ($99/year)

| Task | Free Apple ID | Paid Program needed? |
|---|---|---|
| Build, install and run on your own iPhone via cable | ✅ Yes | No |
| App keeps working after 7 days without reconnecting to Xcode | ❌ Expires after 7 days, then needs a fresh `Run` from Xcode | Yes, for longer-lived signing |
| Install without a cable (TestFlight) | ❌ | Yes |
| Submit to the App Store | ❌ | Yes (not requested here) |

For a one-off dissertation demo, the free tier is enough — just re-run from
Xcode the day of (or the day before) your presentation if more than 7 days
will have passed since the last install.

### If Xcode shows a build error about the Bundle Identifier or signing

That means the exact `com.nuvora.dissertation` identifier is already
registered to a different Apple account somewhere (this is a shared,
global namespace across all Apple developers). Change it to something
unique to you (e.g. `com.jhenifer.nuvora.test`) in **Signing &
Capabilities**, and optionally update `appId` in `capacitor.config.ts` to
match, then `npm run ios:sync` and re-run.
