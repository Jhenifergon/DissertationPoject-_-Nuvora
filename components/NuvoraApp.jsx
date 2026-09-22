'use client';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Heart, Home, Leaf, ListTodo, LogOut, Menu, Settings, Shield, TrendingUp } from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import { auth, firebaseEnabled } from '@/lib/firebase';
import { defaultSettings, loadData, saveSettings } from '@/lib/store';
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

const nav = [['today', Home, 'Today'], ['tasks', ListTodo, 'Tasks'], ['learn', BookOpen, 'Learn'], ['progress', TrendingUp, 'Progress'], ['support', Heart, 'Support']];
const calmNav = [['today', Home, 'My step'], ['support', Heart, 'Support']];

export default function NuvoraApp() {
  const [user, setUser] = useState(firebaseEnabled ? undefined : { uid: 'demo', email: 'demo@nuvora.local' });
  const [screen, setScreen] = useState('today');
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(false);
  const menuButtonRef = useRef(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  // Temporary Calm-session preferences. These deliberately stay out of
  // Firebase and reset each time Calm Mode starts, so the student can
  // reduce demand in the moment without changing their normal setup.
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
    if (!user) return undefined;
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

  const ONBOARDING_KEY = 'nuvora-onboarding-seen';
  const [onboardingDone, setOnboardingDone] = useState(() => typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_KEY) === '1');

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

  const go = s => { setScreen(s); setMenu(false); };
  const visibleNav = settings.calmMode ? calmNav : nav;

  async function updateSettings(next) {
    if (settingsBusy) return;
    setSettings(next);
    setSettingsBusy(true);
    setSettingsError('');
    try {
      await saveSettings(user.uid, next);
    } catch {
      setSettingsError(GENERIC_ERROR);
    } finally {
      setSettingsBusy(false);
    }
  }

  const calmReducedMotion = settings.calmMode && calmSession.reduceMotion;

  return <main
    className={`${settings.calmMode ? 'calm' : ''} ${(settings.reducedMotion || calmReducedMotion) ? 'reduced' : ''}${settings.calmMode && calmSession.reduceVisualDetail ? ' calm-low-detail' : ''}`}
    style={{ '--scale': settings.textScale }}
  >
    <section className="phone">
      <header>
        <button className="icon" ref={menuButtonRef} onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button>
        <Logo />
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
      </header>
      {settingsError && <div className="content" style={{ padding: '0 22px' }}><StatusMessage text={settingsError} tone="error" /></div>}
      {!isOnline && <div className="content" style={{ padding: '0 22px' }}><p className="status-msg status" role="status">You’re offline. Some saves may wait until you reconnect. Keep this page open — offline data is not stored between browser sessions.</p></div>}
      <Drawer open={menu} onClose={() => setMenu(false)} triggerRef={menuButtonRef}>
        <Logo />
        <button onClick={() => go('settings')}><Settings /> Accessibility settings</button>
        <button onClick={() => go('privacy')}><Shield /> Privacy &amp; data</button>
        <button onClick={() => (firebaseEnabled ? signOut(auth) : location.reload())}><LogOut /> Sign out</button>
        <p>Nuvora provides academic support, not medical advice or diagnosis.</p>
      </Drawer>
      <div className={`content${screen === 'overwhelmed' ? ' overwhelmed-bg' : ''}`}>
        {screen === 'today' && <Today data={data} go={go} uid={user.uid} setData={setData} settings={settings} updateSettings={updateSettings} settingsBusy={settingsBusy} calmSession={calmSession} setCalmSession={setCalmSession} pausedThisSession={pausedThisSession} setPausedThisSession={setPausedThisSession} restartAcknowledged={restartAcknowledged} setRestartAcknowledged={setRestartAcknowledged} showCalmExit={showCalmExit} setShowCalmExit={setShowCalmExit} />}
        {screen === 'tasks' && <Tasks data={data} uid={user.uid} setData={setData} calmMode={settings.calmMode} calmSession={calmSession} />}
        {screen === 'checkin' && <Checkin uid={user.uid} data={data} setData={setData} go={go} draft={checkinDraft} setDraft={setCheckinDraft} />}
        {screen === 'learn' && <Learn calmMode={settings.calmMode} data={data} uid={user.uid} setData={setData} go={go} />}
        {screen === 'progress' && <Progress data={data} settings={settings} updateSettings={updateSettings} settingsBusy={settingsBusy} go={go} calmSession={calmSession} />}
        {screen === 'reflection' && <Reflection uid={user.uid} data={data} setData={setData} go={go} />}
        {screen === 'support' && <Support data={data} settings={settings} go={go} />}
        {screen === 'settings' && <SettingsPage value={settings} busy={settingsBusy} error={settingsError} onChange={updateSettings} go={go} />}
        {screen === 'privacy' && <Privacy uid={user.uid} data={data} setData={setData} updateSettings={updateSettings} go={go} />}
        {screen === 'overwhelmed' && <Overwhelmed data={data} uid={user.uid} setData={setData} go={go} settings={settings} />}
      </div>
      {!['checkin', 'overwhelmed', 'settings', 'reflection', 'privacy'].includes(screen) && <nav className={settings.calmMode ? 'calm-nav' : ''}>{visibleNav.map(([id, I, label]) => <button key={id} className={screen === id ? 'active' : ''} onClick={() => go(id)}><I aria-hidden="true" /><span>{label}</span></button>)}</nav>}
    </section>
  </main>;
}
