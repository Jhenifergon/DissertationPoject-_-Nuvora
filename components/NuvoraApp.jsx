'use client';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Heart, Home, Leaf, ListTodo, LogOut, Menu, Settings, Shield, TrendingUp, Volume2, VolumeX } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { auth, firebaseEnabled } from '@/lib/firebase';
import { defaultSettings, loadData, saveSettings } from '@/lib/store';
import { startCalmSound, stopCalmSound } from '@/lib/calmSound';
import { CALM_SESSION_DEFAULTS, GENERIC_ERROR } from '@/components/constants';
import { Drawer } from '@/components/ui/Drawer';
import { Logo } from '@/components/ui/Logo';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { Splash } from '@/components/screens/Splash';
import { LoadError } from '@/components/screens/LoadError';
import { Onboarding } from '@/components/screens/Onboarding';
import { Auth } from '@/components/screens/Auth';
import { Today } from '@/components/screens/Today';
import { Tasks } from '@/components/screens/Tasks';
import { Checkin } from '@/components/screens/Checkin';
import { Learn } from '@/components/screens/Learn';
import { Progress } from '@/components/screens/Progress';
import { Reflection } from '@/components/screens/Reflection';
import { Support } from '@/components/screens/Support';
import { SettingsPage } from '@/components/screens/SettingsPage';
import { Privacy } from '@/components/screens/Privacy';
import { Overwhelmed } from '@/components/screens/Overwhelmed';

// Screen navigation
// -----------------
// Nuvora is one page. Which screen is showing is a single piece of state
// (`screen` below), and `go()` switches it; there are no URL routes. This
// keeps the static export simple for Capacitor, lets in-progress state
// (such as a half-finished check-in) survive moving between screens, and
// keeps every screen within the same "phone" frame. The trade-off is that
// screens are not bookmarkable and the browser Back button does not move
// between them — each screen that hides the bottom nav has its own back
// button instead.
//
// Calm Mode swaps the five-item bottom nav for a two-item one, so there
// are fewer choices on screen while it is on.
const nav = [['today', Home, 'Today'], ['tasks', ListTodo, 'Tasks'], ['learn', BookOpen, 'Learn'], ['progress', TrendingUp, 'Progress'], ['support', Heart, 'Support']];
const calmNav = [['today', Home, 'My step'], ['support', Heart, 'Support']];

// Settings and Privacy open from the menu on any screen, so their back
// button returns to wherever the student came from, named plainly.
const MENU_SCREENS = ['settings', 'privacy'];
const SCREEN_NAMES = { today: 'Today', tasks: 'Tasks', learn: 'Learn', progress: 'Progress', support: 'Support', checkin: 'Check-in', reflection: 'Weekly reflection', overwhelmed: 'Overwhelmed Mode' };

export default function NuvoraApp() {
  // `user` has three states: undefined = Firebase is still checking whether
  // someone is signed in (show the splash), null = signed out (show
  // onboarding/sign-in), or a user object. Demo mode starts with a fixed
  // demo user, so it goes straight into the app with no account.
  const [user, setUser] = useState(firebaseEnabled ? undefined : { uid: 'demo', email: 'demo@nuvora.local' });
  const [screen, setScreen] = useState('today');
  const [returnTo, setReturnTo] = useState('today');
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(false);
  const menuButtonRef = useRef(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  // Temporary Calm-session preferences. These deliberately stay out of
  // Firebase and reset each time Calm Mode starts, so the student can
  // reduce demand in the moment without changing their normal setup.
  // They apply across the app, not just Today: deadlines and step detail
  // on Tasks, score numbers on Today, the check-in result and Progress,
  // decorative illustrations on every screen (via the calm-low-detail
  // class below), and animation everywhere. Calm Mode itself also gives
  // every screen a softer background and flatter cards, and folds the
  // Support summary away until asked for.
  const [calmSession, setCalmSession] = useState(CALM_SESSION_DEFAULTS);
  const [pausedThisSession, setPausedThisSession] = useState(false);
  const [restartAcknowledged, setRestartAcknowledged] = useState(false);
  const [showCalmExit, setShowCalmExit] = useState(false);
  // The daily check-in's in-progress answers live here (not inside the
  // Checkin screen itself) so that leaving and returning to the check-in
  // within the same session does not lose what was already answered.
  const [checkinDraft, setCheckinDraft] = useState({ step: 0, answers: {} });
  const previousCalmModeRef = useRef(settings.calmMode);

  // A subtle offline notice. On the web, Nuvora intentionally keeps the
  // default session-only Firestore cache rather than enabling persistent
  // IndexedDB storage without the student's consent. That reduces the chance
  // of check-in data remaining on a shared device after the browser session.
  // While this page stays open, Firestore can still queue/cache work in memory,
  // but an offline reload is not guaranteed to recover that session state.
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Native (iOS/Android) shell setup. Nuvora's background is a light warm
  // cream (see tokens.css), so the status bar needs dark icons/text rather
  // than the platform default, which on iOS is otherwise easy to end up
  // invisible against a light header. The Keyboard plugin's native resize
  // mode stops the iOS keyboard covering fixed-position inputs lower on a
  // screen (a WKWebView, unlike a normal Safari tab, does not resize/scroll
  // the layout for the keyboard on its own). Both are no-ops on the web.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    if (Capacitor.getPlatform() === 'ios') {
      Keyboard.setResizeMode({ mode: KeyboardResize.Native }).catch(() => {});
    }
  }, []);

  // Calm Mode is a temporary demand-reduction layer. If the student turns
  // it on while viewing a choice-heavy screen, return to the single-step
  // Today view once. Deliberate navigation after that (for example "Open my
  // plan") remains available and is not bounced back.
  useEffect(() => {
    const justEnabled = settings.calmMode && !previousCalmModeRef.current;
    previousCalmModeRef.current = settings.calmMode;

    if (justEnabled) {
      setCalmSession(CALM_SESSION_DEFAULTS);
      setPausedThisSession(false);
      setRestartAcknowledged(false);
      setShowCalmExit(false);

      if (['tasks', 'learn', 'progress'].includes(screen)) {
        setScreen('today');
        setMenu(false);
      }
    }
  }, [settings.calmMode, screen]);

  useEffect(() => (firebaseEnabled ? onAuthStateChanged(auth, setUser) : undefined), []);

  // Calm Mode's optional background sound (lib/calmSound.js). It can only
  // START inside a tap (phones block sound started any other way), so that
  // happens in updateSettings and the header's sound button. Stopping has no
  // such restriction, so it follows state: the sound stops whenever Calm
  // Mode is off (including a rolled-back failed save), the student switches
  // the sound off in Settings, signs out, or the app closes.
  const [calmSoundOn, setCalmSoundOn] = useState(false);
  useEffect(() => {
    if (!user || !settings.calmMode || settings.calmTone === false) {
      stopCalmSound();
      setCalmSoundOn(false);
    }
  }, [user, settings.calmMode, settings.calmTone]);
  useEffect(() => () => stopCalmSound(), []);

  // Loading Firestore data can fail (permissions, network, a dropped
  // connection) — this used to have no failure path at all, so a failed
  // load left `data` as null forever and the student was stuck on the
  // splash screen indefinitely with no way to know anything had gone
  // wrong or any way to recover. Now failure is its own explicit state
  // with a way back in, and retrying never touches anything already
  // saved (loadData only reads).
  const [loadStatus, setLoadStatus] = useState('idle'); // idle | loading | success | error
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    // Signing out drops the previous account's data from memory, so the
    // next sign-in (possibly a different student on a shared device) waits
    // on the splash for its own fresh load instead of briefly rendering the
    // last account's tasks and reflections.
    if (!user) {
      setData(null);
      return undefined;
    }
    let cancelled = false;
    setLoadStatus('loading');
    loadData(user.uid)
      .then(d => {
        if (cancelled) return;
        setData(d);

        // The stored Calm state is the starting state for this app session.
        // Keep the transition ref in sync before updating settings so the
        // "Calm was just enabled" effect only reacts to an actual user toggle,
        // not to the initial settings load.
        previousCalmModeRef.current = d.settings.calmMode;

        setSettings(d.settings);
        setLoadStatus('success');
      })
      .catch(() => {
        if (!cancelled) setLoadStatus('error');
      });
    return () => { cancelled = true; };
  }, [user, retryTick]);

  // Only a "seen" flag is kept on the device for onboarding — no personal
  // data — so the three intro screens show once per browser or install.
  const ONBOARDING_KEY = 'nuvora-onboarding-seen';
  const [onboardingDone, setOnboardingDone] = useState(() => typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_KEY) === '1');

  // What to show, in order: still checking sign-in → splash; signed out →
  // onboarding (first visit, Firebase mode only) then sign-in; loading
  // failed → a calm retry screen; still loading → splash; otherwise the app.
  if (user === undefined) return <Splash />;
  if (!user) {
    if (firebaseEnabled && !onboardingDone) {
      return <Onboarding onDone={() => { localStorage.setItem(ONBOARDING_KEY, '1'); setOnboardingDone(true); }} />;
    }
    return <Auth />;
  }
  if (loadStatus === 'error') {
    return <LoadError
      onRetry={() => setRetryTick(t => t + 1)}
      onSignOut={() => (firebaseEnabled ? signOut(auth) : location.reload())}
    />;
  }
  if (!data) return <Splash />;

  const go = s => {
    if (MENU_SCREENS.includes(s) && !MENU_SCREENS.includes(screen)) setReturnTo(screen);
    setScreen(s);
    setMenu(false);
  };
  const back = { label: SCREEN_NAMES[returnTo] || 'Today', go: () => go(returnTo) };
  const visibleNav = settings.calmMode ? calmNav : nav;

  // Applies the change straight away, and returns whether it was saved. A
  // failed save is rolled back so the screen never shows (or acts on, like
  // "Your place is saved") a setting that didn't actually persist.
  async function updateSettings(next) {
    if (settingsBusy) return false;
    // Every way of turning Calm Mode on (header button, Settings, "Continue
    // gently") comes through here, still inside the student's tap, which
    // is when phones allow sound to start. Never on load, never when off.
    if (next.calmMode && !settings.calmMode && next.calmTone !== false) setCalmSoundOn(startCalmSound());
    const previous = settings;
    setSettings(next);
    setSettingsBusy(true);
    setSettingsError('');
    try {
      await saveSettings(user.uid, next);
      return true;
    } catch (err) {
      console.error('Unable to save settings:', err);
      setSettings(previous);
      setSettingsError(GENERIC_ERROR);
      return false;
    } finally {
      setSettingsBusy(false);
    }
  }

  const calmReducedMotion = settings.calmMode && calmSession.reduceMotion;

  // Accessibility preferences are applied once, here on the outer element:
  // classes switch on Calm Mode's softer palette and remove animation, and
  // the --scale CSS variable enlarges all text. Every screen inherits them
  // without needing its own code. Each screen receives the shared `data`
  // copy plus `setData`, so a change saved on one screen is immediately
  // visible on the others.
  return <main
    className={`${settings.calmMode ? 'calm' : ''} ${(settings.reducedMotion || calmReducedMotion) ? 'reduced' : ''}${settings.calmMode && calmSession.reduceVisualDetail ? ' calm-low-detail' : ''}`}
    style={{ '--scale': settings.textScale }}
  >
    <section className="phone">
      <header>
        <button className="icon" ref={menuButtonRef} onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button>
        <Logo />
        <div className="header-actions">
          <button
            className={`calm-toggle${settings.calmMode ? ' on' : ''}`}
            type="button"
            aria-pressed={settings.calmMode}
            aria-label={settings.calmMode ? 'Turn Calm Mode off' : 'Turn Calm Mode on'}
            disabled={settingsBusy}
            onClick={() => updateSettings({ ...settings, calmMode: !settings.calmMode })}
          >
            <Leaf aria-hidden="true" /> {settings.calmMode ? 'Calm on' : 'Calm'}
          </button>
          {/* While Calm Mode is on, the background sound can be stopped or
              started from any screen, without leaving Calm Mode. */}
          {settings.calmMode && <button
            className="icon sound-toggle"
            type="button"
            aria-pressed={calmSoundOn}
            aria-label={calmSoundOn ? 'Stop calming sound' : 'Play calming sound'}
            onClick={() => {
              if (calmSoundOn) { stopCalmSound(); setCalmSoundOn(false); }
              else setCalmSoundOn(startCalmSound());
            }}
          >
            {calmSoundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
          </button>}
        </div>
      </header>
      {settingsError && <div className="content" style={{ padding: '0 22px' }}><StatusMessage text={settingsError} tone="error" /></div>}
      {!isOnline && <div className="content" style={{ padding: '0 22px' }}><p className="status-msg status" role="status">You’re offline. Some saves may wait until you reconnect. Keep this page open — offline data is not stored between browser sessions.</p></div>}
      <Drawer open={menu} onClose={() => setMenu(false)} triggerRef={menuButtonRef}>
        <Logo />
        <button onClick={() => go('settings')}><Settings /> Settings</button>
        <button onClick={() => go('privacy')}><Shield /> Privacy &amp; data</button>
        <button onClick={() => (firebaseEnabled ? signOut(auth) : location.reload())}><LogOut /> Sign out</button>
        <p>Nuvora provides academic support, not medical advice or diagnosis.</p>
      </Drawer>
      <div className={`content${screen === 'overwhelmed' ? ' overwhelmed-bg' : ''}`}>
        {screen === 'today' && <Today data={data} go={go} uid={user.uid} setData={setData} settings={settings} updateSettings={updateSettings} settingsBusy={settingsBusy} calmSession={calmSession} setCalmSession={setCalmSession} pausedThisSession={pausedThisSession} setPausedThisSession={setPausedThisSession} restartAcknowledged={restartAcknowledged} setRestartAcknowledged={setRestartAcknowledged} showCalmExit={showCalmExit} setShowCalmExit={setShowCalmExit} />}
        {screen === 'tasks' && <Tasks data={data} uid={user.uid} setData={setData} calmMode={settings.calmMode} calmSession={calmSession} />}
        {screen === 'checkin' && <Checkin uid={user.uid} data={data} setData={setData} go={go} draft={checkinDraft} setDraft={setCheckinDraft} hideNumbers={settings.calmMode && calmSession.hideProgressNumbers} />}
        {screen === 'learn' && <Learn calmMode={settings.calmMode} data={data} uid={user.uid} setData={setData} go={go} />}
        {screen === 'progress' && <Progress data={data} settings={settings} updateSettings={updateSettings} settingsBusy={settingsBusy} go={go} calmSession={calmSession} />}
        {screen === 'reflection' && <Reflection uid={user.uid} data={data} setData={setData} go={go} />}
        {screen === 'support' && <Support data={data} settings={settings} go={go} calmMode={settings.calmMode} />}
        {screen === 'settings' && <SettingsPage value={settings} busy={settingsBusy} error={settingsError} onChange={updateSettings} back={back} />}
        {screen === 'privacy' && <Privacy uid={user.uid} data={data} setData={setData} updateSettings={updateSettings} back={back} />}
        {screen === 'overwhelmed' && <Overwhelmed data={data} uid={user.uid} setData={setData} go={go} settings={settings} />}
      </div>
      {!['checkin', 'overwhelmed', 'settings', 'reflection', 'privacy'].includes(screen) && <nav className={settings.calmMode ? 'calm-nav' : ''}>{visibleNav.map(([id, I, label]) => <button key={id} className={screen === id ? 'active' : ''} onClick={() => go(id)}><I aria-hidden="true" /><span>{label}</span></button>)}</nav>}
    </section>
  </main>;
}
