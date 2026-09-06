'use client';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Check, ChevronLeft, CircleHelp, Download, Heart, Home, Leaf, ListTodo, LogOut, Menu, Pencil, Plus, Settings, Shield, Sparkles, Trash2, TrendingUp, X } from 'lucide-react';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, deleteAccount, firebaseEnabled } from '@/lib/firebase';
import { addTask, completeCurrentStep, defaultSettings, deleteAllData, deleteCheckinHistory, deleteCompletedTasks, exportAllData, loadData, recordStepCompleted, recordStrategyUse, removeTask, saveCheckin, saveReflection, saveSettings, setCurrentStep, toggleTask, updateTask } from '@/lib/store';
import { effectiveBucket, relativeDueLabel } from '@/lib/dates';
import { recommendAction } from '@/lib/recommendation';
import { makeCustomStep, nextStepAfter, suggestAlternativeSteps } from '@/lib/steps';
import { explainPressure } from '@/lib/explain';
import { combineWorkloadPressure } from '@/lib/pressure';
import { avatarInitial, displayNameOrFallback, timeOfDayGreeting } from '@/lib/greeting';
import { availableModules } from '@/lib/modules';
import { formatSeconds } from '@/lib/timer';

const questions = [
  { id: 'mood', title: 'How is your workload feeling today?', max: 4, low: 'Calm', high: 'Very overwhelming' },
  { id: 'sleep', title: 'How rested do you feel?', max: 5, low: 'Low energy', high: 'Well rested' },
  { id: 'focus', title: 'How easy is it to focus right now?', max: 5, low: 'Hard to focus', high: 'Easy to focus' },
  { id: 'initiation', title: 'How easy is it to start tasks today?', max: 5, low: 'Hard to start', high: 'Easy to start' },
  { id: 'confidence', title: 'How confident do you feel about this week?', max: 5, low: 'Not confident', high: 'Confident' },
];
const activities = [['Reframe overwhelm', 'Pick one task. Name only its first physical action.'], ['Two-minute task starter', 'Work for two minutes, with permission to stop.'], ['Sort your brain dump', 'List everything, then circle only what is due in 48 hours.']];
const nav = [['today', Home, 'Today'], ['tasks', ListTodo, 'Tasks'], ['learn', BookOpen, 'Learn'], ['progress', TrendingUp, 'Progress'], ['support', Heart, 'Support']];
const priorities = [['low', 'Low'], ['normal', 'Normal'], ['high', 'High']];
const BARRIERS = [
  { id: 'start', label: 'I do not know where to start' },
  { id: 'big', label: 'The task feels too big' },
  { id: 'energy', label: 'I have very low energy' },
  { id: 'reset', label: 'I need a short reset' },
  { id: 'support', label: 'I need to ask someone for help' },
];
const GENERIC_ERROR = 'That did not save. Please try again in a moment.';

// Gives custom role="radio" groups the arrow-key behaviour native radio
// inputs get for free (WAI-ARIA radiogroup pattern): Left/Up selects the
// previous option, Right/Down the next, Home/End jump to the ends, and
// focus follows the newly selected option so keyboard users always know
// where they are.
function handleRadiogroupKeyDown(e, containerRef, values, current, onSelect) {
  let idx = values.indexOf(current);
  if (idx === -1) idx = 0;
  let nextIdx;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (idx + 1) % values.length;
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (idx - 1 + values.length) % values.length;
  else if (e.key === 'Home') nextIdx = 0;
  else if (e.key === 'End') nextIdx = values.length - 1;
  else return;
  e.preventDefault();
  const nextValue = values[nextIdx];
  onSelect(nextValue);
  requestAnimationFrame(() => {
    const match = Array.from(containerRef.current?.querySelectorAll('[data-value]') || []).find(el => el.dataset.value === String(nextValue));
    match?.focus();
  });
}

// A small accessible status/error message. Errors use role="alert" so
// assistive technology announces them immediately; confirmations use the
// gentler role="status" so they do not interrupt the user.
function StatusMessage({ text, tone = 'status' }) {
  if (!text) return null;
  return <p className={`status-msg ${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>{text}</p>;
}

// An accessible drawer: moves focus in on open, returns it to the trigger
// on close, traps Tab/Shift+Tab within itself, and closes on Escape or a
// click on the backdrop — none of which the previous version did.
function Drawer({ open, onClose, triggerRef, children }) {
  const drawerRef = useRef(null);
  const firstFocusableRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const triggerEl = triggerRef.current;
    firstFocusableRef.current?.focus();
    function onKeyDown(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      triggerEl?.focus();
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;
  return <>
    <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
    <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu" ref={drawerRef}>
      <button className="icon close" ref={firstFocusableRef} onClick={onClose} aria-label="Close menu"><X /></button>
      {children}
    </div>
  </>;
}

export default function NuvoraApp() {
  const [user, setUser] = useState(firebaseEnabled ? undefined : { uid: 'demo', email: 'demo@nuvora.local' });
  const [screen, setScreen] = useState('today');
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(false);
  const menuButtonRef = useRef(null);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  // The daily check-in's in-progress answers live here (not inside the
  // Checkin screen itself) so that leaving and returning to the check-in
  // within the same session does not lose what was already answered.
  const [checkinDraft, setCheckinDraft] = useState({ step: 0, answers: {} });

  useEffect(() => (firebaseEnabled ? onAuthStateChanged(auth, setUser) : undefined), []);
  useEffect(() => { if (user) loadData(user.uid).then(d => { setData(d); setSettings(d.settings); }); }, [user]);

  if (user === undefined) return <Splash />;
  if (!user) return <Auth />;
  if (!data) return <Splash />;

  const go = s => { setScreen(s); setMenu(false); };

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

  return <main className={`${settings.calmMode ? 'calm' : ''} ${settings.reducedMotion ? 'reduced' : ''}`} style={{ '--scale': settings.textScale }}>
    <section className="phone">
      <header>
        <button className="icon" ref={menuButtonRef} onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button>
        <Logo />
        <button className="calm-toggle" disabled={settingsBusy} onClick={() => updateSettings({ ...settings, calmMode: !settings.calmMode })}>
          <Leaf /> {settings.calmMode ? 'Calm on' : 'Calm'}
        </button>
      </header>
      {settingsError && <div className="content" style={{ padding: '0 22px' }}><StatusMessage text={settingsError} tone="error" /></div>}
      <Drawer open={menu} onClose={() => setMenu(false)} triggerRef={menuButtonRef}>
        <Logo />
        <button onClick={() => go('settings')}><Settings /> Accessibility settings</button>
        <button onClick={() => go('privacy')}><Shield /> Privacy &amp; data</button>
        <button onClick={() => (firebaseEnabled ? signOut(auth) : location.reload())}><LogOut /> Sign out</button>
        <p>Nuvora provides academic support, not medical advice or diagnosis.</p>
      </Drawer>
      <div className="content">
        {screen === 'today' && <Today data={data} go={go} uid={user.uid} setData={setData} settings={settings} updateSettings={updateSettings} settingsBusy={settingsBusy} />}
        {screen === 'tasks' && <Tasks data={data} uid={user.uid} setData={setData} />}
        {screen === 'checkin' && <Checkin uid={user.uid} data={data} setData={setData} go={go} draft={checkinDraft} setDraft={setCheckinDraft} />}
        {screen === 'learn' && <Learn />}
        {screen === 'progress' && <Progress data={data} settings={settings} updateSettings={updateSettings} settingsBusy={settingsBusy} go={go} />}
        {screen === 'reflection' && <Reflection uid={user.uid} data={data} setData={setData} go={go} />}
        {screen === 'support' && <Support data={data} />}
        {screen === 'settings' && <SettingsPage value={settings} busy={settingsBusy} error={settingsError} onChange={updateSettings} />}
        {screen === 'privacy' && <Privacy uid={user.uid} data={data} setData={setData} updateSettings={updateSettings} go={go} />}
        {screen === 'overwhelmed' && <Overwhelmed data={data} uid={user.uid} setData={setData} go={go} settings={settings} />}
      </div>
      {!['checkin', 'overwhelmed', 'settings', 'reflection', 'privacy'].includes(screen) && <nav>{nav.map(([id, I, label]) => <button key={id} className={screen === id ? 'active' : ''} onClick={() => go(id)}><I /><span>{label}</span></button>)}</nav>}
    </section>
  </main>;
}

// A small, friendly cloud mascot, matching the brand's hand-drawn wireframe
// style. `mood` only changes the mouth/eyes — never the body colour — so it
// stays visually calm rather than becoming an alarm indicator.
function Mascot({ size = 64, mood = 'calm' }) {
  const mouth = { calm: 'M40 55 Q52 63 64 55', worried: 'M40 58 Q52 52 64 58', neutral: 'M42 56 Q52 60 62 56' }[mood];
  return <svg className="mascot" width={size} height={size * 0.75} viewBox="0 0 104 78" aria-hidden="true">
    <ellipse cx="52" cy="60" rx="40" ry="7" fill="var(--purple-soft)" />
    <ellipse cx="52" cy="48" rx="46" ry="21" fill="var(--purple)" opacity="0.85" />
    <circle cx="28" cy="37" r="21" fill="var(--purple)" opacity="0.85" />
    <circle cx="76" cy="37" r="21" fill="var(--purple)" opacity="0.85" />
    <circle cx="52" cy="27" r="25" fill="var(--purple)" opacity="0.85" />
    <circle cx="40" cy="42" r="3.2" fill="var(--ink)" />
    <circle cx="64" cy="42" r="3.2" fill="var(--ink)" />
    <path d={mouth} stroke="var(--ink)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </svg>;
}

function Logo() { return <div className="logo"><Mascot size={26} /> Nuvora</div>; }
function Splash() { return <main><section className="phone splash"><Mascot size={110} /><Logo /><p>A calmer way to move forward.</p></section></main>; }

function Auth() {
  const [mode, setMode] = useState('login'), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      mode === 'login' ? await signInWithEmailAndPassword(auth, email, password) : await createUserWithEmailAndPassword(auth, email, password);
    } catch {
      setError('Please check your email and password.');
    } finally {
      setBusy(false);
    }
  }
  return <main><section className="phone auth">
    <Logo />
    <h1>Welcome to your calm study space</h1>
    <p>No shame. No pressure. One step at a time.</p>
    <div className="tabs">
      <button onClick={() => setMode('login')} className={mode === 'login' ? 'active' : ''}>Log in</button>
      <button onClick={() => setMode('signup')} className={mode === 'signup' ? 'active' : ''}>Sign up</button>
    </div>
    <form onSubmit={submit}>
      <label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>
      <label>Password<input type="password" minLength="6" value={password} onChange={e => setPassword(e.target.value)} required /></label>
      <StatusMessage text={error} tone="error" />
      <button className="primary" disabled={busy}>{busy ? 'Please wait…' : (mode === 'login' ? 'Log in' : 'Create account')}</button>
    </form>
  </section></main>;
}

// --- Today -------------------------------------------------------------

function Today({ data, go, uid, setData, settings, updateSettings, settingsBusy }) {
  const risk = data.checkins[0]?.risk;
  const recommendation = recommendAction(data.tasks, risk?.band);

  // Genuine Calm Mode: rather than only changing colours, this collapses
  // the whole dashboard to the single next step when Calm Mode is on —
  // one primary action, no stats, no secondary explanations. Everything
  // else stays reachable via the nav bar underneath, so no functionality
  // is lost, just decluttered.
  if (settings.calmMode && recommendation) {
    return <div className="calm-focus">
      <Mascot size={70} mood="calm" />
      <div className="calm-heading">Calm Mode is on — only one thing is shown at a time.</div>
      <small>YOUR NEXT SMALL STEP</small>
      <div className="calm-step">{recommendation.actionText}</div>
      <button className="primary" style={{ width: 'auto', padding: '14px 32px' }} onClick={() => go('tasks')}>Open my plan</button>
      <button className="link" disabled={settingsBusy} onClick={() => updateSettings({ ...settings, calmMode: false })}>Turn off Calm Mode</button>
    </div>;
  }

  return <>
    <div className="welcome"><div><small>{timeOfDayGreeting().toUpperCase()}</small><h1>How are things feeling, {displayNameOrFallback(settings.displayName)}?</h1></div><div className="avatar" aria-hidden="true">{avatarInitial(settings.displayName)}</div></div>
    {!risk ? <button className="checkin-card" onClick={() => go('checkin')}><div><b>Take your daily check-in</b><span>Five gentle questions · about 1 minute</span></div><Sparkles /></button> : <RiskCard risk={risk} tasks={data.tasks} />}
    <button className="overwhelmed" onClick={() => go('overwhelmed')}><Heart /> I’m feeling overwhelmed</button>
    <div className="section-title"><h2>One small next step</h2><button onClick={() => go('tasks')}>View plan</button></div>
    {recommendation ? <FocusTask key={recommendation.task.id} task={recommendation.task} actionText={recommendation.actionText} uid={uid} setData={setData} /> : <Empty title="Your plan is clear" text="That is enough for today." />}
    <h2>Today’s plan</h2>
    {data.tasks.filter(t => effectiveBucket(t) === 'today' && !t.done).slice(0, 3).map(t => <MiniTask key={t.id} task={t} />)}
  </>;
}

function RiskCard({ risk, tasks }) {
  const explanation = explainPressure(risk, tasks);
  return <article className={`risk ${risk.band.toLowerCase()}`}>
    <div className="score">{risk.score}</div>
    <div>
      <small>WORKLOAD PRESSURE · {risk.band.toUpperCase()}</small>
      <h2>{risk.message}</h2>
      <details>
        <summary>Why this result?</summary>
        <ul className="explanation-list">{explanation.map((line, i) => <li key={i}>{line}</li>)}</ul>
      </details>
    </div>
  </article>;
}

// The focused task on Today: shows the recommended step and lets the
// student mark it done, edit it, try a different suggested step, or
// generate the next rule-based step once the current one is complete.
// None of this text is personalised or AI-generated — it is a fixed set
// of small, deterministic templates.
function FocusTask({ task, actionText, uid, setData }) {
  const [mode, setMode] = useState('view'); // view | editing | choosing
  const [draftText, setDraftText] = useState(task.currentStep?.text || '');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ text: '', tone: 'status' });
  const stepDone = task.currentStep?.done;

  function applyLocally(updatedTask) {
    setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === task.id ? updatedTask : t)) }));
  }

  async function run(action, successText) {
    if (busy) return;
    setBusy(true);
    setStatus({ text: '', tone: 'status' });
    try {
      const updated = await action();
      if (updated) applyLocally(updated);
      setStatus({ text: successText, tone: 'status' });
      setMode('view');
    } catch {
      setStatus({ text: GENERIC_ERROR, tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return <article className="task focus">
    <div className="module">{task.module}</div>
    <h3>{task.title}</h3>
    <small className="due-label">{relativeDueLabel(task.due)}</small>

    {mode === 'view' && <p>{actionText}</p>}
    {mode === 'editing' && <div className="panel">
      <label>Edit this step<textarea value={draftText} onChange={e => setDraftText(e.target.value)} rows={2} /></label>
      <div className="row">
        <button onClick={() => setMode('view')} disabled={busy}>Cancel</button>
        <button className="primary" disabled={busy || !draftText.trim()} onClick={() => run(async () => setCurrentStep(uid, task.id, makeCustomStep(task, draftText)), 'Step updated.')}>Save</button>
      </div>
    </div>}
    {mode === 'choosing' && <div className="panel">
      <p>Try a different small step:</p>
      {suggestAlternativeSteps(task).map(alt => (
        <button key={alt.id} className="option" disabled={busy} onClick={() => run(async () => setCurrentStep(uid, task.id, alt), 'Step updated.')}>{alt.text}</button>
      ))}
      <button onClick={() => setMode('view')} disabled={busy}>Cancel</button>
    </div>}

    {mode === 'view' && !stepDone && <div className="row">
      <button className="primary" disabled={busy} onClick={() => run(async () => { const updated = await completeCurrentStep(uid, task.id, true); await recordStepCompleted(uid); return updated; }, 'Saved. That step is done — the assignment stays open until you choose to complete it.')}>
        <Check /> {busy ? 'Saving…' : 'Mark this step done'}
      </button>
      <button disabled={busy} onClick={() => { setDraftText(task.currentStep?.text || ''); setMode('editing'); }}><Pencil /> Edit</button>
      <button disabled={busy} onClick={() => setMode('choosing')}>Try a different step</button>
    </div>}
    {mode === 'view' && stepDone && <div className="row">
      <span className="step-complete-badge"><Check /> Step complete</span>
      <button disabled={busy} onClick={() => run(async () => setCurrentStep(uid, task.id, nextStepAfter(task)), 'Here is a next small step.')}>Generate next step</button>
    </div>}
    <StatusMessage text={status.text} tone={status.tone} />
  </article>;
}

// --- Tasks ---------------------------------------------------------------

function TaskForm({ initial, tasks, onCancel, onSave, saving }) {
  const [module, setModule] = useState(initial?.module || 'Dissertation');
  const [addingModule, setAddingModule] = useState(false);
  const [customModule, setCustomModule] = useState('');
  const chips = availableModules(tasks);

  return <form className="panel" onSubmit={e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onSave({ title: f.get('title'), module, due: f.get('due'), priority: f.get('priority') });
  }}>
    <label>Task name<input name="title" defaultValue={initial?.title} required autoFocus /></label>
    <div>
      <div className="hint">Module</div>
      <div className="module-chips">
        {chips.filter(c => c !== 'Other').map(m => (
          <button key={m} type="button" className={`module-chip ${module === m ? 'selected' : ''}`} onClick={() => { setModule(m); setAddingModule(false); }}>{m}</button>
        ))}
        <button type="button" className={`module-chip ${addingModule ? 'selected' : ''}`} onClick={() => setAddingModule(true)}>+ New module</button>
      </div>
      {addingModule && <input type="text" placeholder="Type a module name" value={customModule} onChange={e => { setCustomModule(e.target.value); setModule(e.target.value || 'Other'); }} style={{ marginTop: 8 }} />}
    </div>
    <label>Due date<input name="due" type="date" defaultValue={initial?.due} /></label>
    <label>Priority<select name="priority" defaultValue={initial?.priority || 'normal'}>{priorities.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
    {!initial && <p className="hint">Nuvora will create a small first step automatically.</p>}
    <div className="row">
      <button type="button" onClick={onCancel} disabled={saving}>Cancel</button>
      <button className="primary" disabled={saving || !module.trim()}>{saving ? 'Saving…' : (initial ? 'Save changes' : 'Add task')}</button>
    </div>
  </form>;
}

function Tasks({ data, uid, setData }) {
  const [tab, setTab] = useState('today');
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [error, setError] = useState('');
  const [undo, setUndo] = useState(null); // { id, title }
  const filtered = data.tasks.filter(t => effectiveBucket(t) === tab);

  async function create(fields) {
    if (saving) return;
    const task = {
      title: fields.title,
      module: fields.module,
      due: fields.due,
      priority: fields.priority,
      bucket: tab,
      done: false,
      currentStep: { id: crypto.randomUUID(), text: `Open ${fields.title} and write down one small first action.`, done: false, completedAt: null },
    };
    setSaving(true);
    setError('');
    try {
      const saved = await addTask(uid, task);
      setData(d => ({ ...d, tasks: [saved, ...d.tasks] }));
      setAdding(false);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(id, fields) {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const updated = await updateTask(uid, id, fields);
      setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === id ? updated : t)) }));
      setEditingId(null);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setSaving(false);
    }
  }

  async function runOnTask(id, action) {
    if (busyIds.has(id)) return;
    setBusyIds(s => new Set(s).add(id));
    setError('');
    try {
      await action();
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusyIds(s => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function toggle(t) {
    await runOnTask(t.id, async () => {
      await toggleTask(uid, t.id, !t.done);
      setData(d => ({ ...d, tasks: d.tasks.map(x => (x.id === t.id ? { ...x, done: !x.done } : x)) }));
      setUndo(!t.done ? { id: t.id, title: t.title } : null);
    });
  }

  async function undoComplete() {
    if (!undo) return;
    const { id } = undo;
    setUndo(null);
    await runOnTask(id, async () => {
      await toggleTask(uid, id, false);
      setData(d => ({ ...d, tasks: d.tasks.map(x => (x.id === id ? { ...x, done: false } : x)) }));
    });
  }

  async function remove(t) {
    if (!window.confirm(`Delete "${t.title}"? This cannot be undone.`)) return;
    await runOnTask(t.id, async () => {
      await removeTask(uid, t.id);
      setData(d => ({ ...d, tasks: d.tasks.filter(x => x.id !== t.id) }));
    });
  }

  return <>
    <div className="page-title"><h1>My plan</h1><button className="icon filled" onClick={() => setAdding(true)} aria-label="Add task"><Plus /></button></div>
    <div className="tabs">{['today', 'week', 'later'].map(t => <button className={tab === t ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
    {adding && <TaskForm tasks={data.tasks} saving={saving} onCancel={() => setAdding(false)} onSave={create} />}
    <StatusMessage text={error} tone="error" />
    {undo && <div className="status-msg status" role="status">
      “{undo.title}” marked complete. <button className="link" onClick={undoComplete}>Undo</button>
    </div>}
    {filtered.map(t => t.id === editingId ? (
      <TaskForm key={t.id} initial={t} tasks={data.tasks} saving={saving} onCancel={() => setEditingId(null)} onSave={fields => saveEdit(t.id, fields)} />
    ) : (
      <article className={`task row-task ${t.done ? 'done' : ''}`} key={t.id}>
        <button className="check" aria-label={t.done ? `Mark ${t.title} as not done` : `Mark ${t.title} as done`} aria-pressed={t.done} disabled={busyIds.has(t.id)} onClick={() => toggle(t)}>
          <span className="check-dot">{t.done && <Check />}</span>
        </button>
        <div>
          <small>{t.module} · {relativeDueLabel(t.due)}{t.priority === 'high' && ' · High priority'}</small>
          <h2>{t.title}</h2>
          <p>{t.currentStep?.text}</p>
        </div>
        <button className="icon" aria-label={`Edit ${t.title}`} disabled={busyIds.has(t.id)} onClick={() => setEditingId(t.id)}><Pencil /></button>
        <button className="icon trash" aria-label={`Delete ${t.title}`} disabled={busyIds.has(t.id)} onClick={() => remove(t)}><Trash2 /></button>
      </article>
    ))}
    {!filtered.length && !adding && <Empty title="Nothing here yet" text="Add one task when you are ready." />}
  </>;
}

// --- Checkin ---------------------------------------------------------------

function Checkin({ uid, data, setData, go, draft, setDraft }) {
  const [risk, setRisk] = useState(null);
  const [incomplete, setIncomplete] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { step, answers } = draft;
  const q = questions[step];
  const scaleRef = useRef(null);
  const resultHeadingRef = useRef(null);

  // Moves focus to the result heading when the check-in resolves to a
  // result or an "insufficient information" screen — without this, a
  // screen-reader user tabbing through an SPA view-change would have no
  // cue that the content around them just changed entirely.
  useEffect(() => {
    if (incomplete || risk) resultHeadingRef.current?.focus();
  }, [incomplete, risk]);

  function setAnswer(value) {
    setDraft(d => ({ ...d, answers: { ...d.answers, [q.id]: value } }));
    setError('');
  }
  function resetDraft() { setDraft({ step: 0, answers: {} }); }

  async function next() {
    if (submitting) return;
    if (answers[q.id] === undefined) return setError('Choose the option that feels closest, or “Not sure”.');
    if (step < questions.length - 1) return setDraft(d => ({ ...d, step: d.step + 1 }));

    // Do not silently substitute a neutral score for anything marked "not
    // sure" — if any answer is incomplete, we say so plainly instead of
    // calculating a band from guessed data.
    const hasUnsure = questions.some(qq => answers[qq.id] === 'unsure');
    if (hasUnsure) {
      setSubmitting(true);
      try {
        await saveCheckin(uid, { answers, risk: null, incomplete: true });
        setData(d => ({ ...d, checkins: [{ answers, risk: null, incomplete: true, createdAt: new Date().toISOString() }, ...d.checkins] }));
        setIncomplete(true);
      } catch {
        setError("We couldn't save that. Please try again.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/risk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(answers) });
      const r = await res.json();
      if (!res.ok || !r.band) {
        setError(r.error || "We couldn't calculate a result from those answers. Please try again.");
        return;
      }
      // The self-report score (r) is combined with the student's current
      // task deadlines here — see lib/pressure.js and the Phase 2 item 5
      // proposal for the full rule set, rationale, and scenario table.
      const combined = combineWorkloadPressure(r, data.tasks);
      setRisk(combined);
      await saveCheckin(uid, { answers, risk: combined });
      setData(d => ({ ...d, checkins: [{ answers, risk: combined, createdAt: new Date().toISOString() }, ...d.checkins] }));
    } catch {
      setError("We couldn't reach Nuvora just now. Your answers are still here — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (incomplete) return <div className="result">
    <Mascot size={64} mood="neutral" /><h1 ref={resultHeadingRef} tabIndex={-1}>That’s okay.</h1>
    <p>We don’t have enough information from today’s answers to calculate a workload-pressure band. Your answers have been saved. Here’s one small step anyway.</p>
    <button className="primary" onClick={() => { resetDraft(); go('today'); }}>Back to Today</button>
  </div>;

  if (risk) return <>
    <button className="back" onClick={() => { resetDraft(); go('today'); }}><ChevronLeft /> Today</button>
    <div className="result">
      <div className={`big-score ${risk.band.toLowerCase()}`}>{risk.score}</div>
      <small>{risk.band.toUpperCase()} WORKLOAD PRESSURE</small>
      <h1 ref={resultHeadingRef} tabIndex={-1}>{risk.message}</h1>
      <p>This result is not a diagnosis. It only helps Nuvora adjust today’s support.</p>
      <details><summary>Why this result?</summary><ul className="explanation-list">{explainPressure(risk, data.tasks).map((line, i) => <li key={i}>{line}</li>)}</ul></details>
      <button className="primary" onClick={() => { resetDraft(); go(risk.band === 'Higher' ? 'overwhelmed' : 'today'); }}>Choose my next step</button>
    </div>
  </>;

  return <>
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <button className="back" onClick={() => (step ? setDraft(d => ({ ...d, step: d.step - 1 })) : go('today'))}><ChevronLeft /> Back</button>
      <button className="link" onClick={() => go('today')}>Exit for now</button>
    </div>
    <div className="progressbar" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={questions.length} aria-valuetext={`Question ${step + 1} of ${questions.length}`} aria-label="Check-in progress">
      <span style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
    </div>
    <small>QUESTION {step + 1} OF {questions.length}</small>
    <h1>{q.title}</h1>
    <div ref={scaleRef} role="radiogroup" aria-label={q.title} onKeyDown={e => handleRadiogroupKeyDown(e, scaleRef, [...Array.from({ length: q.max }, (_, i) => i + 1), 'unsure'], answers[q.id], setAnswer)}>
      <div className="scale">
        {Array.from({ length: q.max }, (_, i) => i + 1).map(n => (
          <button key={n} role="radio" aria-checked={answers[q.id] === n} data-value={n} tabIndex={answers[q.id] === n || (answers[q.id] === undefined && n === 1) ? 0 : -1} onClick={() => setAnswer(n)} className={answers[q.id] === n ? 'selected' : ''}>{n}</button>
        ))}
      </div>
      <div className="scale-label"><span>{q.low}</span><span>{q.high}</span></div>
      <button role="radio" aria-checked={answers[q.id] === 'unsure'} data-value="unsure" tabIndex={answers[q.id] === 'unsure' ? 0 : -1} className={`option not-sure ${answers[q.id] === 'unsure' ? 'selected' : ''}`} onClick={() => setAnswer('unsure')}>Not sure / prefer not to answer</button>
    </div>
    <StatusMessage text={error} tone="error" />
    <button className="primary bottom" disabled={submitting} onClick={next}>{submitting ? 'Saving…' : 'Continue'}</button>
  </>;
}

// --- Learn / Progress / Support / Settings ---------------------------------

// A real, working countdown timer — Overwhelmed Mode's "low energy" path
// and Learn's "two-minute task starter" both used to just describe a timer
// in text without actually having one. The optional tone is a plain
// generated sine wave (Web Audio API) at low volume, started only by an
// explicit tap — never bundled audio, never autoplay, matching the "no
// background music, nothing plays itself" rule.
function FocusTimer({ seconds = 120 }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [toneOn, setToneOn] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          setRunning(false);
          setFinished(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  function stopTone() {
    if (!audioRef.current) return;
    try { audioRef.current.oscillator.stop(); audioRef.current.ctx.close(); } catch { /* already stopped */ }
    audioRef.current = null;
  }
  useEffect(() => stopTone, []);

  function toggleTone() {
    if (toneOn) { stopTone(); setToneOn(false); return; }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 220;
      gain.gain.value = 0.03;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      audioRef.current = { ctx, oscillator, gain };
      setToneOn(true);
    } catch { /* Web Audio unavailable — the timer itself still works fine */ }
  }

  return <div className="focus-timer">
    <div className="timer-display" role="status" aria-live="polite">{finished ? 'Time’s up — well done.' : formatSeconds(remaining)}</div>
    <div className="row">
      {!running && <button className="primary" onClick={() => { setFinished(false); setRunning(true); }}>{remaining === seconds ? 'Start' : 'Resume'}</button>}
      {running && <button onClick={() => setRunning(false)}>Pause</button>}
      <button onClick={() => { setRunning(false); setFinished(false); setRemaining(seconds); }} disabled={remaining === seconds && !running}>Reset</button>
    </div>
    <button className="link" onClick={toggleTone}>{toneOn ? 'Turn off soft tone' : 'Play a soft tone (optional)'}</button>
  </div>;
}

function Learn() {
  return <>
    <div className="page-title"><h1>Small resets</h1><Leaf /></div>
    <p>Short activities for difficult moments. Choose only what feels useful.</p>
    {activities.map(([title, text], i) => <article className="activity" key={title}>
      <div>{i + 1}</div>
      <section><small>{i === 0 ? '2–3 MIN · RECOMMENDED' : '2–5 MIN'}</small><h2>{title}</h2><p>{text}</p>
        <details><summary>Start activity</summary><div className="activity-step">{text}<br /><br />Stopping after this is completely okay.
          {title === 'Two-minute task starter' && <FocusTimer seconds={120} />}
        </div></details>
      </section>
    </article>)}
    <article className="panel">
      <h2>Reset Space</h2>
      <p>For a guided breathing exercise or a longer break, the NHS's Every Mind Matters has free, evidence-based resources.</p>
      <a className="option" href="https://www.nhs.uk/every-mind-matters/" target="_blank" rel="noopener noreferrer">Open Every Mind Matters (opens in a new tab, leaves Nuvora) ↗</a>
      <p className="hint">This is an external NHS website, not part of Nuvora. It is not a replacement for professional support.</p>
    </article>
  </>;
}

const STRATEGY_LABELS = { start: 'Getting started', big: 'Breaking a task down', energy: 'Low-energy attempts', reset: 'Short resets', support: 'Asking for help' };

function Progress({ data, settings, updateSettings, settingsBusy, go }) {
  const totalStrategyUses = Object.values(data.stats.strategyUses).reduce((a, b) => a + b, 0);
  const usedStrategies = Object.entries(data.stats.strategyUses).filter(([, n]) => n > 0);

  if (settings.hideProgress) {
    return <>
      <div className="page-title"><h1>Progress, without pressure</h1><TrendingUp /></div>
      <Empty title="Progress is hidden" text="You've chosen not to see these details right now. That's completely fine." />
      <button disabled={settingsBusy} onClick={() => updateSettings({ ...settings, hideProgress: false })}>Show progress again</button>
    </>;
  }

  return <>
    <div className="page-title"><h1>Progress, without pressure</h1><TrendingUp /></div>
    <p>These numbers are just for your own reflection — there's no target to hit, and nothing here is shared with anyone.</p>
    <div className="stats">
      <article><small>CHECK-INS SO FAR</small><b>{data.checkins.length}</b></article>
      <article><small>SMALL STEPS TAKEN</small><b>{data.stats.stepsCompleted}</b></article>
      <article><small>STRATEGIES USED</small><b>{totalStrategyUses}</b></article>
    </div>
    {usedStrategies.length > 0 && <div className="panel">
      <h2>Helpful strategies</h2>
      {usedStrategies.map(([id, n]) => <div className="trend" key={id}><span>{STRATEGY_LABELS[id]}</span><span /><b>{n}</b></div>)}
    </div>}
    <h2>Recent pressure patterns</h2>
    {data.checkins.slice(0, 7).map((c, i) => <div className="trend" key={c.id || i}>
      <span>{new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt || Date.now()).toLocaleDateString()}</span>
      {c.risk ? <><div><i style={{ width: `${c.risk.score}%` }} /></div><b>{c.risk.score}</b></> : <span className="incomplete-tag">Incomplete</span>}
    </div>)}
    {!data.checkins.length && <Empty title="Your trends will appear here" text="Complete a check-in whenever it feels helpful." />}
    <button className="overwhelmed" onClick={() => go('reflection')}>Weekly reflection</button>
    <button className="link" disabled={settingsBusy} onClick={() => updateSettings({ ...settings, hideProgress: true })}>Hide these details</button>
  </>;
}

const REFLECTION_PROMPTS = [
  { id: 'manageable', label: 'What felt manageable this week?' },
  { id: 'hard', label: 'What would help make next week a little easier?' },
];

// A short, free-text reflection entirely in the student's own words —
// never generated, summarised, or scored by Nuvora. Saved so past entries
// can be looked back on, but there is no "streak" of doing this regularly.
function Reflection({ uid, data, setData, go }) {
  const [answers, setAnswers] = useState({ manageable: '', hard: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ text: '', tone: 'status' });

  async function save() {
    if (saving) return;
    if (!answers.manageable.trim() && !answers.hard.trim()) {
      setStatus({ text: 'Write as much or as little as feels useful — at least one answer helps.', tone: 'error' });
      return;
    }
    setSaving(true);
    setStatus({ text: '', tone: 'status' });
    try {
      await saveReflection(uid, answers);
      setData(d => ({ ...d, reflections: [{ ...answers, createdAt: new Date().toISOString() }, ...d.reflections] }));
      setAnswers({ manageable: '', hard: '' });
      setStatus({ text: 'Saved. Thank you for taking a moment for this.', tone: 'status' });
    } catch {
      setStatus({ text: GENERIC_ERROR, tone: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button className="back" onClick={() => go('progress')}><ChevronLeft /> Progress</button>
    <h1>Weekly reflection</h1>
    <p>A couple of optional questions, entirely in your own words. Nothing here is scored or shared.</p>
    {REFLECTION_PROMPTS.map(p => (
      <label key={p.id} style={{ display: 'block', margin: '14px 0' }}>
        <b>{p.label}</b>
        <textarea rows={3} value={answers[p.id]} disabled={saving} onChange={e => setAnswers(a => ({ ...a, [p.id]: e.target.value }))} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginTop: 8, fontFamily: 'inherit' }} />
      </label>
    ))}
    <StatusMessage text={status.text} tone={status.tone} />
    <button className="primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save reflection'}</button>
    {data.reflections.length > 0 && <>
      <h2>Past reflections</h2>
      {data.reflections.slice(0, 5).map((r, i) => <article className="panel" key={r.id || i}>
        <small>{new Date(r.createdAt?.seconds ? r.createdAt.seconds * 1000 : r.createdAt || Date.now()).toLocaleDateString()}</small>
        {r.manageable && <p><b>Manageable:</b> {r.manageable}</p>}
        {r.hard && <p><b>Would help:</b> {r.hard}</p>}
      </article>)}
    </>}
  </>;
}

function downloadJson(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function Privacy({ uid, data, setData, updateSettings, go }) {
  const [busy, setBusy] = useState(null);
  const [status, setStatus] = useState({ text: '', tone: 'status' });
  const [confirmAll, setConfirmAll] = useState('');
  const [confirmAccount, setConfirmAccount] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');

  function run(name, action, successText) {
    if (busy) return;
    setBusy(name);
    setStatus({ text: '', tone: 'status' });
    return action()
      .then(() => setStatus({ text: successText, tone: 'status' }))
      .catch(() => setStatus({ text: GENERIC_ERROR, tone: 'error' }))
      .finally(() => setBusy(null));
  }

  async function handleExport() {
    if (busy) return;
    setBusy('export');
    setStatus({ text: '', tone: 'status' });
    try {
      const exported = await exportAllData(uid);
      downloadJson(exported, `nuvora-data-export-${new Date().toISOString().slice(0, 10)}.json`);
      setStatus({ text: 'Your data has been downloaded as a JSON file.', tone: 'status' });
    } catch {
      setStatus({ text: GENERIC_ERROR, tone: 'error' });
    } finally {
      setBusy(null);
    }
  }

  function handleDeleteCheckins() {
    if (!window.confirm('Delete all check-in and reflection history? This cannot be undone.')) return;
    run('checkins', async () => {
      await deleteCheckinHistory(uid);
      setData(d => ({ ...d, checkins: [], reflections: [] }));
    }, 'Check-in and reflection history deleted.');
  }

  function handleDeleteCompleted() {
    if (!window.confirm('Delete all completed tasks? This cannot be undone.')) return;
    run('completed', async () => {
      await deleteCompletedTasks(uid);
      setData(d => ({ ...d, tasks: d.tasks.filter(t => !t.done) }));
    }, 'Completed tasks deleted.');
  }

  function handleDeleteAll() {
    if (confirmAll.trim().toUpperCase() !== 'DELETE') {
      setStatus({ text: 'Type DELETE in the box to confirm.', tone: 'error' });
      return;
    }
    if (!window.confirm('This permanently deletes everything Nuvora has stored for you — tasks, check-ins, reflections, and settings. Continue?')) return;
    run('all', async () => {
      await deleteAllData(uid);
      setData(d => ({ ...d, tasks: [], checkins: [], reflections: [] }));
      await updateSettings(defaultSettings);
      setConfirmAll('');
    }, 'All your Nuvora data has been deleted.');
  }

  async function handleDeleteAccount() {
    if (confirmAccount.trim().toUpperCase() !== 'DELETE') {
      setStatus({ text: 'Type DELETE in the box to confirm.', tone: 'error' });
      return;
    }
    if (!window.confirm('This permanently deletes your account and all your data. This cannot be undone. Continue?')) return;
    if (busy) return;
    setBusy('account');
    setStatus({ text: '', tone: 'status' });
    try {
      await deleteAllData(uid);
      setData(d => ({ ...d, tasks: [], checkins: [], reflections: [] }));
      await deleteAccount(needsPassword ? password : undefined);
      // A successful deletion signs the student out; onAuthStateChanged
      // (in the top-level component) picks that up and returns to Auth
      // automatically — no manual navigation needed here.
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        setNeedsPassword(true);
        setStatus({ text: 'Your data has been deleted. Please re-enter your password to finish deleting your account.', tone: 'error' });
      } else {
        setStatus({ text: GENERIC_ERROR, tone: 'error' });
      }
    } finally {
      setBusy(null);
    }
  }

  return <>
    <button className="back" onClick={() => go('today')}><ChevronLeft /> Today</button>
    <div className="page-title"><h1>Privacy &amp; data</h1><Shield /></div>

    <article className="panel">
      <h2>What Nuvora stores</h2>
      <p>Your tasks and their small steps, your daily check-in answers and the workload-pressure result calculated from them, any weekly reflections you write, your accessibility preferences, and a small count of how many steps you've completed and which support strategies you've used.</p>
      <h2>Why</h2>
      <p>Only to run the features you're using — recommending a next step, showing your check-in trends, and remembering your settings. Nothing is used for any other purpose.</p>
      <h2>Where</h2>
      <p>{firebaseEnabled ? 'In your account on Firebase (Google Cloud), accessible only to you — see the Firestore security rules for how that\u2019s enforced.' : 'Nowhere but this browser. Nuvora is running in local demo mode: everything is stored in this browser\u2019s local storage and never leaves this device. Clearing your browser data or using a different browser will lose it.'}</p>
      <h2>Important</h2>
      <p>The workload-pressure band is <b>not a diagnosis</b> of ADHD, autism, burnout, or any condition — it's a supportive, rule-based estimate from your own answers. Your data is <b>never automatically sent to tutors</b>, your university, or anyone else — the Support screen's "copy summary" only ever copies text to your own clipboard, for you to send yourself if you choose to.</p>
    </article>

    <article className="panel">
      <h2>Export your data</h2>
      <p>Download everything Nuvora has stored for you as a plain JSON file.</p>
      <button className="primary" disabled={!!busy} onClick={handleExport}><Download /> {busy === 'export' ? 'Preparing…' : 'Download my data'}</button>
    </article>

    <article className="panel">
      <h2>Delete check-in &amp; reflection history</h2>
      <p>Removes every check-in and reflection. Your tasks and settings are left untouched.</p>
      <button className="danger-btn" disabled={!!busy} onClick={handleDeleteCheckins}><Trash2 /> {busy === 'checkins' ? 'Deleting…' : 'Delete check-in history'}</button>
    </article>

    <article className="panel">
      <h2>Delete completed tasks</h2>
      <p>Removes tasks you've marked complete. Tasks still open are left untouched.</p>
      <button className="danger-btn" disabled={!!busy} onClick={handleDeleteCompleted}><Trash2 /> {busy === 'completed' ? 'Deleting…' : 'Delete completed tasks'}</button>
    </article>

    <article className="panel">
      <h2>Delete all my data</h2>
      <p>Permanently removes everything — every task, check-in, reflection, and setting. Type <b>DELETE</b> below to confirm.</p>
      <input type="text" value={confirmAll} disabled={busy === 'all'} onChange={e => setConfirmAll(e.target.value)} placeholder="Type DELETE to confirm" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginBottom: 10 }} />
      <button className="danger-btn" disabled={!!busy} onClick={handleDeleteAll}><Trash2 /> {busy === 'all' ? 'Deleting…' : 'Delete all my data'}</button>
    </article>

    {firebaseEnabled && <article className="panel">
      <h2>Delete my account</h2>
      <p>Permanently deletes all your data and your Nuvora account itself. Type <b>DELETE</b> below to confirm.</p>
      <input type="text" value={confirmAccount} disabled={busy === 'account'} onChange={e => setConfirmAccount(e.target.value)} placeholder="Type DELETE to confirm" style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginBottom: 10 }} />
      {needsPassword && <label style={{ display: 'block', marginBottom: 10 }}>
        Re-enter your password to confirm
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginTop: 6 }} />
      </label>}
      <button className="danger-btn" disabled={!!busy} onClick={handleDeleteAccount}><Trash2 /> {busy === 'account' ? 'Deleting…' : 'Delete my account'}</button>
    </article>}

    <StatusMessage text={status.text} tone={status.tone} />
  </>;
}

function Support({ data }) {
  const risk = data.checkins[0]?.risk;
  const [status, setStatus] = useState({ text: '', tone: 'status' });
  const summary = risk ? `My current academic pressure is ${risk.band.toLowerCase()} (${risk.score}/100). A smaller first step and a clear priority would help.` : '';

  async function copy() {
    setStatus({ text: '', tone: 'status' });
    try {
      await navigator.clipboard.writeText(summary);
      setStatus({ text: 'Copied to your clipboard.', tone: 'status' });
    } catch {
      setStatus({ text: "We couldn't copy that automatically. You can select and copy the text above instead.", tone: 'error' });
    }
  }

  return <>
    <div className="page-title"><h1>Support</h1><Heart /></div>
    <article className="support-card">
      <h2>A summary you control</h2>
      <p>{risk ? summary : 'Complete a check-in to prepare a short support summary.'}</p>
      <button className="primary" disabled={!risk} onClick={copy}>Copy summary</button>
      <StatusMessage text={status.text} tone={status.tone} />
    </article>
    <article className="notice">
      <CircleHelp />
      <div><b>Need urgent help?</b><p>Nuvora is not an emergency or healthcare service. Contact your university support service, NHS 111, or emergency services when appropriate.</p></div>
    </article>
  </>;
}

function SettingsPage({ value, busy, error, onChange }) {
  return <>
    <h1>Calm accessibility settings</h1>
    <label className="setting" style={{ display: 'block' }}>
      <b>What should Nuvora call you?</b>
      <p>Optional — used only for a friendly greeting. Leave blank if you&rsquo;d rather not.</p>
      <input type="text" defaultValue={value.displayName} disabled={busy} placeholder="e.g. Jhenifer" onBlur={e => onChange({ ...value, displayName: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginTop: 8 }} />
    </label>
    <Setting label="Calm mode" text="Shows only one small step at a time on Today, and hides secondary detail elsewhere." checked={value.calmMode} disabled={busy} onChange={v => onChange({ ...value, calmMode: v })} />
    <Setting label="Reduced motion" text="Removes non-essential animation." checked={value.reducedMotion} disabled={busy} onChange={v => onChange({ ...value, reducedMotion: v })} />
    <h2>Text size</h2>
    <div className="tabs">{[[1, 'Standard'], [1.15, 'Medium'], [1.3, 'Large']].map(([v, l]) => <button key={v} disabled={busy} className={value.textScale === v ? 'active' : ''} onClick={() => onChange({ ...value, textScale: v })}>{l}</button>)}</div>
    <h2>Support person</h2>
    <p>Optional — just a personal note for yourself. Nuvora never contacts anyone automatically.</p>
    <label className="setting" style={{ display: 'block' }}>
      <b>Name</b>
      <input type="text" defaultValue={value.supportPersonName} disabled={busy} placeholder="e.g. Course tutor, a friend" onBlur={e => onChange({ ...value, supportPersonName: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginTop: 8 }} />
    </label>
    <label className="setting" style={{ display: 'block' }}>
      <b>Note (optional)</b>
      <input type="text" defaultValue={value.supportPersonNote} disabled={busy} placeholder="e.g. Best reached by email" onBlur={e => onChange({ ...value, supportPersonNote: e.target.value })} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginTop: 8 }} />
    </label>
    <StatusMessage text={error} tone="error" />
  </>;
}
function Setting({ label, text, checked, disabled, onChange }) {
  return <label className="setting"><div><b>{label}</b><p>{text}</p></div><input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} /></label>;
}

// --- Overwhelmed Mode (barrier-based) ---------------------------------------

function Overwhelmed({ data, uid, setData, go, settings }) {
  const [barrier, setBarrier] = useState(null);
  const [done, setDone] = useState(false);
  const [chosenAlt, setChosenAlt] = useState(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [copyStatus, setCopyStatus] = useState({ text: '', tone: 'status' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const task = data.tasks.find(t => !t.done);
  const barrierRef = useRef(null);
  const doneHeadingRef = useRef(null);

  useEffect(() => {
    if (done) doneHeadingRef.current?.focus();
  }, [done]);

  useEffect(() => {
    if (barrier === 'support' && task) {
      setSupportMessage(`Hi${settings?.supportPersonName ? ` ${settings.supportPersonName}` : ''} — I'm finding "${task.title}" difficult to manage right now and could use a hand. Could we talk it through?`);
    }
  }, [barrier, task, settings]);

  async function markDone(action) {
    if (busy || !task) { setDone(true); return; }
    setBusy(true);
    setError('');
    try {
      const updated = await action();
      if (updated) setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === task.id ? updated : t)) }));
      if (barrier) await recordStrategyUse(uid, barrier).catch(() => {});
      setDone(true);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  async function continueAfterReset() {
    await recordStrategyUse(uid, 'reset').catch(() => {});
    go('today');
  }

  async function copySupportMessage() {
    setCopyStatus({ text: '', tone: 'status' });
    try {
      await navigator.clipboard.writeText(supportMessage);
      await recordStrategyUse(uid, 'support').catch(() => {});
      setCopyStatus({ text: 'Copied. Nothing is sent automatically.', tone: 'status' });
    } catch {
      setCopyStatus({ text: "We couldn't copy that automatically — you can select and copy the text above.", tone: 'error' });
    }
  }

  if (done) return <div className="overwhelmed-page">
    <Mascot size={80} mood="calm" /><small>OVERWHELMED MODE</small>
    <h1 ref={doneHeadingRef} tabIndex={-1}>One step down.</h1>
    <p>That is genuinely enough for right now.</p>
    <button className="primary" onClick={() => go('today')}>Back to Today</button>
  </div>;

  return <div className="overwhelmed-page">
    <Mascot size={80} mood="worried" /><small>OVERWHELMED MODE</small>
    <h1>Let’s make everything smaller.</h1>
    <p>What is making this difficult right now?</p>
    <div ref={barrierRef} className="scale-vertical" role="radiogroup" aria-label="What is making this difficult right now?" onKeyDown={e => handleRadiogroupKeyDown(e, barrierRef, BARRIERS.map(b => b.id), barrier, id => { setBarrier(id); setChosenAlt(null); })}>
      {BARRIERS.map((b, i) => (
        <button key={b.id} role="radio" aria-checked={barrier === b.id} data-value={b.id} tabIndex={barrier === b.id || (barrier === null && i === 0) ? 0 : -1} className={`option ${barrier === b.id ? 'selected' : ''}`} onClick={() => { setBarrier(b.id); setChosenAlt(null); }}>{b.label}</button>
      ))}
    </div>

    {barrier === 'start' && <article><small>ONE SMALL ACTION</small>
      <h2>{task ? `Just open "${task.title}". Nothing else needed.` : 'Just open the relevant file or page.'}</h2>
      <button className="primary" disabled={busy} onClick={() => markDone(() => completeCurrentStep(uid, task.id, true))}>{busy ? 'Saving…' : 'I opened it'}</button>
    </article>}

    {barrier === 'big' && <article><small>CHOOSE ONE PART</small>
      {!chosenAlt ? (task ? suggestAlternativeSteps(task).map(alt => (
        <button key={alt.id} className="option" onClick={() => setChosenAlt(alt)}>{alt.text}</button>
      )) : <p>Pick one small section or question to focus on.</p>) : <>
        <p>{chosenAlt.text}</p>
        <button className="primary" disabled={busy} onClick={() => markDone(() => setCurrentStep(uid, task.id, { ...chosenAlt, done: true, completedAt: new Date().toISOString() }))}>{busy ? 'Saving…' : 'I did this'}</button>
      </>}
    </article>}

    {barrier === 'energy' && <article><small>JUST TWO MINUTES</small>
      <h2>You have permission to stop the moment this ends.</h2>
      <FocusTimer seconds={120} />
      <button className="primary" disabled={busy} onClick={() => markDone(() => task && completeCurrentStep(uid, task.id, true))}>{busy ? 'Saving…' : 'I tried for two minutes'}</button>
    </article>}

    {barrier === 'reset' && <article><small>ONE BRIEF RESET</small>
      <h2>{activities[0][0]}</h2>
      <p>{activities[0][1]}</p>
      <button className="primary" onClick={continueAfterReset}>I’m ready to continue</button>
    </article>}

    {barrier === 'support' && <article><small>A MESSAGE YOU CONTROL</small>
      <label>Edit before sending it yourself<textarea value={supportMessage} onChange={e => setSupportMessage(e.target.value)} rows={3} /></label>
      <button className="primary" onClick={copySupportMessage}>Copy message</button>
      <StatusMessage text={copyStatus.text} tone={copyStatus.tone} />
      {!settings?.supportPersonName && <p className="hint">Tip: set a support person's name in Settings and this will greet them automatically.</p>}
    </article>}

    <StatusMessage text={error} tone="error" />
    <button onClick={() => go('today')}>Not now</button>
    <span>No shame. You’ve got this.</span>
  </div>;
}

function MiniTask({ task }) {
  return <div className="mini">
    <span className={task.done ? 'checked' : ''}>{task.done && <Check />}</span>
    <div><b>{task.title}</b><small>{relativeDueLabel(task.due)} · {task.currentStep?.text}</small></div>
  </div>;
}
function Empty({ title, text }) { return <div className="empty"><Leaf /><h2>{title}</h2><p>{text}</p></div>; }
