'use client';
import { useEffect, useState } from 'react';
import { BookOpen, Check, ChevronLeft, CircleHelp, Heart, Home, Leaf, ListTodo, LogOut, Menu, Plus, Settings, Sparkles, Trash2, TrendingUp, X } from 'lucide-react';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, firebaseEnabled } from '@/lib/firebase';
import { addTask, completeCurrentStep, defaultSettings, loadData, removeTask, saveCheckin, saveSettings, toggleTask } from '@/lib/store';

const questions = [
  { id: 'mood', title: 'How is your workload feeling today?', max: 4, low: 'Calm', high: 'Very overwhelming' },
  { id: 'sleep', title: 'How rested do you feel?', max: 5, low: 'Low energy', high: 'Well rested' },
  { id: 'focus', title: 'How easy is it to focus right now?', max: 5, low: 'Hard to focus', high: 'Easy to focus' },
  { id: 'initiation', title: 'How easy is it to start tasks today?', max: 5, low: 'Hard to start', high: 'Easy to start' },
  { id: 'confidence', title: 'How confident do you feel about this week?', max: 5, low: 'Not confident', high: 'Confident' },
];
const activities = [['Reframe overwhelm', 'Pick one task. Name only its first physical action.'], ['Two-minute task starter', 'Work for two minutes, with permission to stop.'], ['Sort your brain dump', 'List everything, then circle only what is due in 48 hours.']];
const nav = [['today', Home, 'Today'], ['tasks', ListTodo, 'Tasks'], ['learn', BookOpen, 'Learn'], ['progress', TrendingUp, 'Progress'], ['support', Heart, 'Support']];

// A small accessible status/error message. Errors use role="alert" so
// assistive technology announces them immediately; confirmations use the
// gentler role="status" so they do not interrupt the user.
function StatusMessage({ text, tone = 'status' }) {
  if (!text) return null;
  return <p className={`status-msg ${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>{text}</p>;
}

const GENERIC_ERROR = "That did not save. Please try again in a moment.";

export default function NuvoraApp() {
  const [user, setUser] = useState(firebaseEnabled ? undefined : { uid: 'demo', email: 'demo@nuvora.local' });
  const [screen, setScreen] = useState('today');
  const [data, setData] = useState(null);
  const [menu, setMenu] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState('');

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
        <button className="icon" onClick={() => setMenu(true)} aria-label="Open menu"><Menu /></button>
        <Logo />
        <button className="calm-toggle" disabled={settingsBusy} onClick={() => updateSettings({ ...settings, calmMode: !settings.calmMode })}>
          <Leaf /> {settings.calmMode ? 'Calm on' : 'Calm'}
        </button>
      </header>
      {settingsError && <div className="content" style={{ padding: '0 22px' }}><StatusMessage text={settingsError} tone="error" /></div>}
      {menu && <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
        <button className="icon close" onClick={() => setMenu(false)} aria-label="Close menu"><X /></button>
        <Logo />
        <button onClick={() => go('settings')}><Settings /> Accessibility settings</button>
        <button onClick={() => (firebaseEnabled ? signOut(auth) : location.reload())}><LogOut /> Sign out</button>
        <p>Nuvora provides academic support, not medical advice or diagnosis.</p>
      </div>}
      <div className="content">
        {screen === 'today' && <Today data={data} go={go} uid={user.uid} setData={setData} />}
        {screen === 'tasks' && <Tasks data={data} uid={user.uid} setData={setData} />}
        {screen === 'checkin' && <Checkin uid={user.uid} data={data} setData={setData} go={go} />}
        {screen === 'learn' && <Learn />}
        {screen === 'progress' && <Progress data={data} />}
        {screen === 'support' && <Support data={data} />}
        {screen === 'settings' && <SettingsPage value={settings} busy={settingsBusy} error={settingsError} onChange={updateSettings} />}
        {screen === 'overwhelmed' && <Overwhelmed data={data} uid={user.uid} setData={setData} go={go} />}
      </div>
      {!['checkin', 'overwhelmed', 'settings'].includes(screen) && <nav>{nav.map(([id, I, label]) => <button key={id} className={screen === id ? 'active' : ''} onClick={() => go(id)}><I /><span>{label}</span></button>)}</nav>}
    </section>
  </main>;
}

function Logo() { return <div className="logo"><span>●●●</span> Nuvora</div>; }
function Splash() { return <main><section className="phone splash"><Logo /><p>A calmer way to move forward.</p></section></main>; }

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

function Today({ data, go, uid, setData }) {
  const [stepBusy, setStepBusy] = useState(false);
  const [stepStatus, setStepStatus] = useState({ text: '', tone: 'status' });
  const risk = data.checkins[0]?.risk;
  const open = data.tasks.filter(t => !t.done);
  const top = open[0];
  const stepDone = top?.currentStep?.done;

  async function markStepDone() {
    if (stepBusy || !top) return;
    setStepBusy(true);
    setStepStatus({ text: '', tone: 'status' });
    try {
      const updated = await completeCurrentStep(uid, top.id, true);
      setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === top.id ? updated : t)) }));
      setStepStatus({ text: 'Saved. That step is done — the assignment stays open until you choose to complete it.', tone: 'status' });
    } catch {
      setStepStatus({ text: GENERIC_ERROR, tone: 'error' });
    } finally {
      setStepBusy(false);
    }
  }

  return <>
    <div className="welcome"><div><small>GOOD MORNING</small><h1>How are things feeling?</h1></div><div className="avatar" aria-hidden="true">J</div></div>
    {!risk ? <button className="checkin-card" onClick={() => go('checkin')}><div><b>Take your daily check-in</b><span>Five gentle questions · about 1 minute</span></div><Sparkles /></button> : <RiskCard risk={risk} />}
    <button className="overwhelmed" onClick={() => go('overwhelmed')}><Heart /> I’m feeling overwhelmed</button>
    <div className="section-title"><h2>One small next step</h2><button onClick={() => go('tasks')}>View plan</button></div>
    {top ? <article className="task focus">
      <div className="module">{top.module}</div>
      <h3>{top.title}</h3>
      <p>{risk?.band === 'Higher' ? `Let's only open ${top.title.toLowerCase()}. You can stop after that.` : top.currentStep?.text}</p>
      <button className="primary" disabled={stepBusy || stepDone} onClick={markStepDone}>
        <Check /> {stepDone ? 'Step complete' : stepBusy ? 'Saving…' : 'Mark this step done'}
      </button>
      <StatusMessage text={stepStatus.text} tone={stepStatus.tone} />
    </article> : <Empty title="Your plan is clear" text="That is enough for today." />}
    <h2>Today’s plan</h2>
    {data.tasks.filter(t => t.bucket === 'today').slice(0, 3).map(t => <MiniTask key={t.id} task={t} />)}
  </>;
}

function RiskCard({ risk }) {
  return <article className={`risk ${risk.band.toLowerCase()}`}>
    <div className="score">{risk.score}</div>
    <div>
      <small>WORKLOAD PRESSURE · {risk.band.toUpperCase()}</small>
      <h3>{risk.message}</h3>
      <details><summary>Why this result?</summary><p>This transparent score combines workload feeling (30%), task initiation (25%), focus (20%), rest (15%) and confidence (10%). It is supportive, not diagnostic.</p></details>
    </div>
  </article>;
}

function Tasks({ data, uid, setData }) {
  const [tab, setTab] = useState('today');
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [error, setError] = useState('');
  const filtered = data.tasks.filter(t => t.bucket === tab);

  async function create(e) {
    e.preventDefault();
    if (creating) return;
    const f = new FormData(e.currentTarget);
    const title = f.get('title');
    const task = {
      title,
      module: f.get('module'),
      due: f.get('due'),
      bucket: tab,
      done: false,
      currentStep: { id: crypto.randomUUID(), text: `Open ${title} and write down one small first action.`, done: false, completedAt: null },
    };
    setCreating(true);
    setError('');
    try {
      const saved = await addTask(uid, task);
      setData(d => ({ ...d, tasks: [saved, ...d.tasks] }));
      setAdding(false);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setCreating(false);
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

  return <>
    <div className="page-title"><h1>My plan</h1><button className="icon filled" onClick={() => setAdding(true)} aria-label="Add task"><Plus /></button></div>
    <div className="tabs">{['today', 'week', 'later'].map(t => <button className={tab === t ? 'active' : ''} onClick={() => setTab(t)} key={t}>{t}</button>)}</div>
    {adding && <form className="panel" onSubmit={create}>
      <h2>Add a manageable task</h2>
      <label>Task name<input name="title" required autoFocus /></label>
      <label>Module<select name="module"><option>Dissertation</option><option>Database Systems</option><option>Web Development</option><option>Other</option></select></label>
      <label>Due date<input name="due" type="date" /></label>
      <p className="hint">Nuvora will create a small first step automatically.</p>
      <div className="row">
        <button type="button" onClick={() => setAdding(false)} disabled={creating}>Cancel</button>
        <button className="primary" disabled={creating}>{creating ? 'Adding…' : 'Add task'}</button>
      </div>
    </form>}
    <StatusMessage text={error} tone="error" />
    {filtered.map(t => <article className={`task row-task ${t.done ? 'done' : ''}`} key={t.id}>
      <button className="check" aria-label={t.done ? `Mark ${t.title} as not done` : `Mark ${t.title} as done`} disabled={busyIds.has(t.id)}
        onClick={() => runOnTask(t.id, async () => { await toggleTask(uid, t.id, !t.done); setData(d => ({ ...d, tasks: d.tasks.map(x => (x.id === t.id ? { ...x, done: !x.done } : x)) })); })}>
        {t.done && <Check />}
      </button>
      <div><small>{t.module} {t.due && `· ${t.due}`}</small><h3>{t.title}</h3><p>{t.currentStep?.text}</p></div>
      <button className="icon trash" aria-label={`Delete ${t.title}`} disabled={busyIds.has(t.id)}
        onClick={() => runOnTask(t.id, async () => { await removeTask(uid, t.id); setData(d => ({ ...d, tasks: d.tasks.filter(x => x.id !== t.id) })); })}>
        <Trash2 />
      </button>
    </article>)}
    {!filtered.length && <Empty title="Nothing here yet" text="Add one task when you are ready." />}
  </>;
}

function Checkin({ uid, data, setData, go }) {
  const [step, setStep] = useState(0), [answers, setAnswers] = useState({}), [risk, setRisk] = useState(null);
  const [error, setError] = useState(''), [submitting, setSubmitting] = useState(false);
  const q = questions[step];

  async function next() {
    if (submitting) return;
    if (!answers[q.id]) return setError('Choose the option that feels closest.');
    setError('');
    if (step < questions.length - 1) return setStep(step + 1);
    setSubmitting(true);
    try {
      const res = await fetch('/api/risk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(answers) });
      const r = await res.json();
      if (!res.ok || !r.band) {
        setError(r.error || "We couldn't calculate a result from those answers. Please try again.");
        return;
      }
      setRisk(r);
      await saveCheckin(uid, { answers, risk: r });
      setData(d => ({ ...d, checkins: [{ answers, risk: r, createdAt: new Date().toISOString() }, ...d.checkins] }));
    } catch {
      setError("We couldn't reach Nuvora just now. Your answers are still here — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (risk) return <>
    <button className="back" onClick={() => go('today')}><ChevronLeft /> Today</button>
    <div className="result">
      <div className={`big-score ${risk.band.toLowerCase()}`}>{risk.score}</div>
      <small>{risk.band.toUpperCase()} WORKLOAD PRESSURE</small>
      <h1>{risk.message}</h1>
      <p>This result is not a diagnosis. It only helps Nuvora adjust today’s support.</p>
      <button className="primary" onClick={() => go(risk.band === 'Higher' ? 'overwhelmed' : 'today')}>Choose my next step</button>
    </div>
  </>;

  return <>
    <button className="back" onClick={() => (step ? setStep(step - 1) : go('today'))}><ChevronLeft /> Back</button>
    <div className="progressbar" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={questions.length} aria-label={`Question ${step + 1} of ${questions.length}`}>
      <span style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
    </div>
    <small>QUESTION {step + 1} OF {questions.length}</small>
    <h1>{q.title}</h1>
    <div className="scale" role="radiogroup" aria-label={q.title}>
      {Array.from({ length: q.max }, (_, i) => i + 1).map(n => (
        <button key={n} role="radio" aria-checked={answers[q.id] === n} onClick={() => setAnswers({ ...answers, [q.id]: n })} className={answers[q.id] === n ? 'selected' : ''}>{n}</button>
      ))}
    </div>
    <div className="scale-label"><span>{q.low}</span><span>{q.high}</span></div>
    <StatusMessage text={error} tone="error" />
    <button className="primary bottom" disabled={submitting} onClick={next}>{submitting ? 'Saving…' : 'Continue'}</button>
  </>;
}

function Learn() {
  return <>
    <div className="page-title"><h1>Small resets</h1><Leaf /></div>
    <p>Short activities for difficult moments. Choose only what feels useful.</p>
    {activities.map(([title, text], i) => <article className="activity" key={title}>
      <div>{i + 1}</div>
      <section><small>{i === 0 ? '2–3 MIN · RECOMMENDED' : '2–5 MIN'}</small><h3>{title}</h3><p>{text}</p>
        <details><summary>Start activity</summary><div className="activity-step">{text}<br /><br />Stopping after this is completely okay.</div></details>
      </section>
    </article>)}
  </>;
}

function Progress({ data }) {
  const completed = data.tasks.filter(t => t.done).length;
  const avg = data.checkins.length ? Math.round(data.checkins.reduce((a, c) => a + c.risk.score, 0) / data.checkins.length) : 0;
  return <>
    <div className="page-title"><h1>Progress, without pressure</h1><TrendingUp /></div>
    <div className="stats">
      <article><small>CHECK-INS</small><b>{data.checkins.length}</b></article>
      <article><small>TASKS COMPLETED</small><b>{completed}</b></article>
      <article><small>AVG PRESSURE</small><b>{avg || '—'}</b></article>
    </div>
    <h2>Recent check-ins</h2>
    {data.checkins.slice(0, 7).map((c, i) => <div className="trend" key={c.id || i}>
      <span>{new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt || Date.now()).toLocaleDateString()}</span>
      <div><i style={{ width: `${c.risk.score}%` }} /></div>
      <b>{c.risk.score}</b>
    </div>)}
    {!data.checkins.length && <Empty title="Your trends will appear here" text="Complete a check-in whenever it feels helpful." />}
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
    <Setting label="Calm mode" text="Reduces visual density and uses softer contrast." checked={value.calmMode} disabled={busy} onChange={v => onChange({ ...value, calmMode: v })} />
    <Setting label="Reduced motion" text="Removes non-essential animation." checked={value.reducedMotion} disabled={busy} onChange={v => onChange({ ...value, reducedMotion: v })} />
    <h2>Text size</h2>
    <div className="tabs">{[[1, 'Standard'], [1.15, 'Medium'], [1.3, 'Large']].map(([v, l]) => <button key={v} disabled={busy} className={value.textScale === v ? 'active' : ''} onClick={() => onChange({ ...value, textScale: v })}>{l}</button>)}</div>
    <StatusMessage text={error} tone="error" />
  </>;
}
function Setting({ label, text, checked, disabled, onChange }) {
  return <label className="setting"><div><b>{label}</b><p>{text}</p></div><input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} /></label>;
}

function Overwhelmed({ data, uid, setData, go }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const task = data.tasks.find(t => !t.done);

  async function markDone() {
    if (busy || !task) { setDone(true); return; }
    setBusy(true);
    setError('');
    try {
      const updated = await completeCurrentStep(uid, task.id, true);
      setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === task.id ? updated : t)) }));
      setDone(true);
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setBusy(false);
    }
  }

  return <div className="overwhelmed-page">
    <Leaf /><small>OVERWHELMED MODE</small>
    {done ? <>
      <h1>One step down.</h1>
      <p>That is genuinely enough for right now.</p>
      <button className="primary" onClick={() => go('today')}>Back to Today</button>
    </> : <>
      <h1>Let’s make everything smaller.</h1>
      <p>You do not need to solve the whole day.</p>
      <article><small>YOUR ONE STEP</small><h2>{task ? `Only open “${task.title}”.` : 'Take one slow breath.'}</h2><p>You can stop immediately after that.</p></article>
      <button className="primary" disabled={busy} onClick={markDone}>{busy ? 'Saving…' : 'I did this step'}</button>
      <button onClick={() => go('today')}>Not now</button>
      <StatusMessage text={error} tone="error" />
      <span>No shame. You’ve got this.</span>
    </>}
  </div>;
}

function MiniTask({ task }) {
  return <div className="mini">
    <span className={task.done ? 'checked' : ''}>{task.done && <Check />}</span>
    <div><b>{task.title}</b><small>{task.currentStep?.text}</small></div>
  </div>;
}
function Empty({ title, text }) { return <div className="empty"><Leaf /><h3>{title}</h3><p>{text}</p></div>; }
