'use client';

import { useState } from 'react';
import { Check, Heart, Leaf, Pencil, Settings, Sparkles } from 'lucide-react';
import { completeCurrentStep, recordStepCompleted, setCurrentStep, withStepCounted } from '@/lib/store';
import { effectiveBucket, relativeDueLabel } from '@/lib/dates';
import { recommendAction } from '@/lib/recommendation';
import { makeCustomStep, nextStepAfter, suggestAlternativeSteps, withStep, withStepDone } from '@/lib/steps';
import { explainPressure } from '@/lib/explain';
import { displayNameOrFallback, timeOfDayGreeting } from '@/lib/greeting';
import { moduleColor } from '@/lib/modules';
import { GENERIC_ERROR } from '@/components/constants';
import { Mascot } from '@/components/ui/Mascot';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { Setting } from '@/components/ui/Setting';
import { Empty } from '@/components/ui/Empty';

// Today is the home screen. It shows the latest pressure result (or an
// invitation to check in), a way into Overwhelmed Mode, and ONE recommended
// next step from lib/recommendation.js — the same task Overwhelmed Mode
// would pick.
//
// Calm Mode is handled here as a small set of alternative views, checked in
// this order:
//   1. Leaving Calm Mode — a choice of where to go, with nothing marked done.
//   2. "Stop for now" — confirms the student can stop; their place is saved.
//   3. Welcome back — offers the saved restart point before anything new.
//   4. Calm Mode itself — one task, one step, two main buttons (only when
//      there is an open task to suggest).
//   5. Otherwise, the normal dashboard (with Calm Mode's softer styling if
//      it is on).
// The restart point ("restartMemory") is saved with the student's settings,
// so it survives closing the app. The four calm-session preferences
// (hide deadlines, hide numbers, less detail, less motion) are deliberately
// temporary and reset each time Calm Mode is switched on.
export function Today({ data, go, uid, setData, settings, updateSettings, settingsBusy, calmSession, setCalmSession, pausedThisSession, setPausedThisSession, restartAcknowledged, setRestartAcknowledged, showCalmExit, setShowCalmExit }) {
  const [calmSettingsOpen, setCalmSettingsOpen] = useState(false);
  // Only the most recent check-in counts. If it was incomplete ("Not sure"
  // answers) it has no band, and Today simply invites a new check-in.
  const risk = data.checkins[0]?.risk;
  const recommendation = recommendAction(data.tasks, risk?.band);
  const restartMemory = settings.restartMemory;
  const restartTask = restartMemory
    ? data.tasks.find(t => t.id === restartMemory.taskId && !t.done && !t.currentStep?.done)
    : null;
  const hasValidRestart = Boolean(restartMemory && restartTask);

  // Calm Mode deliberately separates the task name from the instruction.
  // When time pressure is hidden, avoid timed language in the recommendation
  // itself so the interface does not contradict the student's preference.
  const calmTaskTitle = hasValidRestart
    ? restartMemory.taskTitle || restartTask?.title || recommendation?.task?.title
    : recommendation?.task?.title;

  const calmInstruction = hasValidRestart
    ? restartMemory.stepText
    : calmSession.hideDeadlines
      ? 'Make one small update. You can stop whenever you need.'
      : recommendation?.actionText;

  async function stopForNow() {
    if (!recommendation || settingsBusy) return;

    const restartPoint = {
      taskId: recommendation.task.id,
      taskTitle: recommendation.task.title,
      stepText: recommendation.actionText,
      stoppedAt: new Date().toISOString(),
    };

    // Only say "Your place is saved" once it actually is.
    if (!(await updateSettings({ ...settings, restartMemory: restartPoint }))) return;
    setRestartAcknowledged(false);
    setPausedThisSession(true);
  }

  async function clearRestartMemory() {
    if (settingsBusy) return;
    if (!(await updateSettings({ ...settings, restartMemory: null }))) return;
    setRestartAcknowledged(false);
  }

  async function leaveCalmMode(destination = 'today') {
    if (settingsBusy) return;
    if (!(await updateSettings({ ...settings, calmMode: false }))) return;
    setShowCalmExit(false);
    setPausedThisSession(false);
    setRestartAcknowledged(false);
    go(destination);
  }

  // The focused task already has its own card above, so the list below
  // shows only the other things due today rather than repeating it.
  const focusTaskId = recommendation?.task.id;
  const todaysTasks = data.tasks.filter(t => effectiveBucket(t) === 'today' && !t.done && t.id !== focusTaskId).slice(0, 3);

  if (settings.calmMode && showCalmExit) {
    return <div className="calm-focus">
      {!calmSession.reduceVisualDetail && <Mascot size={64} mood="calm" />}
      <small>LEAVING CALM MODE</small>
      <div className="calm-heading">How would you like to come back?</div>
      <p>Nothing will be marked complete. Any saved restart point will stay available.</p>

      <button
        className="primary"
        style={{ width: '100%', maxWidth: 340 }}
        disabled={settingsBusy}
        onClick={() => leaveCalmMode('today')}
      >
        Return to Today
      </button>

      <button
        className="option"
        style={{ width: '100%', maxWidth: 340 }}
        disabled={settingsBusy}
        onClick={() => leaveCalmMode('tasks')}
      >
        Show my tasks
      </button>

      <button
        className="link"
        disabled={settingsBusy}
        onClick={() => setShowCalmExit(false)}
      >
        Stay in Calm Mode
      </button>
    </div>;
  }

  if (pausedThisSession) {
    return <div className="calm-focus">
      <Leaf size={42} aria-hidden="true" />
      <div className="calm-heading">You can stop here.</div>
      <p>Your place is saved. Nuvora will not ask you to do anything else unless you choose to continue.</p>

      {settings.restartMemory && <article className="panel" style={{ width: '100%', maxWidth: 340, textAlign: 'left' }}>
        <small>SAVED RESTART POINT</small>
        <h2 style={{ marginBottom: 6 }}>{settings.restartMemory.taskTitle || 'Your task'}</h2>
        <p>{settings.restartMemory.stepText}</p>
      </article>}

      <button
        className="primary"
        style={{ width: 'auto', padding: '14px 32px' }}
        onClick={() => {
          setPausedThisSession(false);
          setRestartAcknowledged(true);
        }}
      >
        Continue from here
      </button>

      <button
        className="link"
        disabled={settingsBusy}
        onClick={() => setShowCalmExit(true)}
      >
        Leave Calm Mode
      </button>
    </div>;
  }

  if (settings.calmMode && hasValidRestart && !restartAcknowledged) {
    return <div className="calm-focus">
      {!calmSession.reduceVisualDetail && <Mascot size={70} mood="calm" />}
      <small>WELCOME BACK</small>
      <div className="calm-heading">You already have a safe place to restart.</div>

      <article className="panel" style={{ width: '100%', maxWidth: 340, textAlign: 'left' }}>
        <small>{restartTask.module || 'YOUR TASK'}</small>
        <h2 style={{ marginBottom: 6 }}>{restartMemory.taskTitle || restartTask.title}</h2>
        <p>{restartMemory.stepText}</p>
      </article>

      <button
        className="primary"
        style={{ width: 'auto', padding: '14px 32px' }}
        onClick={() => setRestartAcknowledged(true)}
      >
        Continue from here
      </button>

      <button className="link" disabled={settingsBusy} onClick={clearRestartMemory}>
        Use today&apos;s suggestion instead
      </button>
      <button className="link" disabled={settingsBusy} onClick={() => setShowCalmExit(true)}>
        Leave Calm Mode
      </button>
    </div>;
  }

  // Genuine Calm Mode: rather than only changing colours, this collapses
  // the whole dashboard to the single next step when Calm Mode is on —
  // one primary action, no stats, no secondary explanations. Nothing is
  // deleted or switched off: the plan is one tap away ("Open my plan"),
  // Support stays in the reduced nav bar, and Learn and Progress come back
  // as soon as the student leaves Calm Mode.
  if (settings.calmMode && recommendation) {
    return <div className="calm-focus">
      {!calmSession.reduceVisualDetail && <Mascot size={70} mood="calm" />}
      <div className="calm-layout">
        <section className="calm-hero">
          <div className="calm-hero-copy">
            <small>CALM SPACE</small>
            <div className="calm-heading">Calm Mode is on.</div>
            <p>Nuvora is keeping things simple for now.</p>
          </div>
          <div className="calm-hero-cloud" aria-hidden="true">
            <Mascot size={76} mood="calm" />
          </div>
        </section>

        <article className="calm-task-card">
          <div className="calm-task-label">YOUR NEXT SMALL STEP</div>
          <h2>{calmTaskTitle}</h2>
          <p className="calm-step">{calmInstruction}</p>

          <div className="calm-actions">
            <button className="primary" onClick={() => go('tasks')}>
              Open my plan
            </button>
            <button className="calm-stop" disabled={settingsBusy} onClick={stopForNow}>
              Stop for now
            </button>
          </div>
        </article>

        <div className="calm-settings-card">
          <button
            type="button"
            className="calm-settings-toggle"
            aria-expanded={calmSettingsOpen}
            aria-controls="calm-settings-panel"
            onClick={() => setCalmSettingsOpen(open => !open)}
          >
            <span className="calm-settings-icon" aria-hidden="true"><Settings /></span>
            <span className="calm-settings-copy">
              <b>Adjust calm settings</b>
              <small>4 temporary preferences</small>
            </span>
            <span className="calm-settings-action" aria-hidden="true">
              {calmSettingsOpen ? 'Hide −' : 'Show +'}
            </span>
          </button>

          {calmSettingsOpen && (
            <div id="calm-settings-panel" className="calm-settings-panel">
              <p className="hint">
                These changes are temporary and reset the next time Calm Mode starts.
              </p>

              <Setting
                label="Hide time pressure"
                text="Hides deadlines, priority labels and timed wording while Calm Mode is active."
                checked={calmSession.hideDeadlines}
                onChange={v => setCalmSession(current => ({ ...current, hideDeadlines: v }))}
              />
              <Setting
                label="Hide progress numbers"
                text="Keeps scores and totals out of view while Calm Mode is active."
                checked={calmSession.hideProgressNumbers}
                onChange={v => setCalmSession(current => ({ ...current, hideProgressNumbers: v }))}
              />
              <Setting
                label="Reduce visual detail"
                text="Hides non-essential illustrations, step previews and task edit controls."
                checked={calmSession.reduceVisualDetail}
                onChange={v => setCalmSession(current => ({ ...current, reduceVisualDetail: v }))}
              />
              <Setting
                label="Reduce motion"
                text="Temporarily removes non-essential animation and transitions."
                checked={calmSession.reduceMotion}
                onChange={v => setCalmSession(current => ({ ...current, reduceMotion: v }))}
              />
            </div>
          )}
        </div>

        <div className="calm-footer-note">
          <div className="calm-footer-cloud" aria-hidden="true"><Mascot size={34} mood="calm" /></div>
          <span>You can leave this here and come back when you’re ready.</span>
        </div>

        <button
          className="link calm-leave"
          disabled={settingsBusy}
          onClick={() => setShowCalmExit(true)}
        >
          Leave Calm Mode
        </button>
      </div>
    </div>;
  }

  return <>
    {hasValidRestart && <article className="panel" style={{ marginTop: 0 }}>
      <small>RESTART POINT SAVED</small>
      <h2>Pick up where you left off</h2>
      <p><b>{restartMemory.taskTitle || restartTask.title}</b></p>
      <p>{restartMemory.stepText}</p>
      <div className="row">
        <button
          className="primary"
          disabled={settingsBusy}
          onClick={async () => {
            if (await updateSettings({ ...settings, calmMode: true })) setRestartAcknowledged(true);
          }}
        >
          Continue gently
        </button>
        <button className="link" disabled={settingsBusy} onClick={clearRestartMemory}>Dismiss</button>
      </div>
    </article>}
    <div className="welcome welcome-card">
      <div>
        <small>{timeOfDayGreeting().toUpperCase()}</small>
        <h1>How are things feeling, {displayNameOrFallback(settings.displayName)}?</h1>
      </div>
      <div className="welcome-cloud" aria-hidden="true"><Mascot size={58} mood="calm" /></div>
    </div>
    {!risk
      ? <button className="checkin-card" onClick={() => go('checkin')}>
          <div><b>Check in when it would help</b><span>A few gentle questions · skip anytime</span></div>
          <Sparkles />
        </button>
      : <RiskCard risk={risk} tasks={data.tasks} onUpdate={() => go('checkin')} hideNumbers={settings.calmMode && calmSession.hideProgressNumbers} />}
    <button className="overwhelmed" onClick={() => go('overwhelmed')}><Heart /> I’m feeling overwhelmed</button>
    <div className="section-title"><h2>One small next step</h2><button onClick={() => go('tasks')}>View plan</button></div>
    {recommendation ? <FocusTask key={recommendation.task.id} task={recommendation.task} actionText={recommendation.actionText} uid={uid} setData={setData} /> : (
      data.tasks.length === 0
        ? <div className="empty"><Leaf /><h2>Your space is ready.</h2><p>Add one thing that's currently on your mind. It doesn't need to be your biggest task.</p><button className="primary" style={{ width: 'auto', padding: '12px 22px' }} onClick={() => go('tasks')}>+ Add one task</button><button className="link" onClick={() => go('checkin')}>Take a short check-in first</button></div>
        : <Empty title="Your plan is clear" text="That is enough for today." />
    )}
    {todaysTasks.length > 0 && <h2>{focusTaskId ? 'Also on today’s plan' : 'Today’s plan'}</h2>}
    {todaysTasks.map(t => <MiniTask key={t.id} task={t} />)}
  </>;
}

// `hideNumbers`: Calm Mode's "Hide progress numbers" — the band and
// explanation stay, the score itself is not shown.
function RiskCard({ risk, tasks, onUpdate, hideNumbers = false }) {
  const explanation = explainPressure(risk, tasks);
  return <article className={`risk ${risk.band.toLowerCase()}`}>
    {!hideNumbers && <div className="score" aria-hidden="true">{risk.score}</div>}
    <div className="risk-copy">
      <h3>Workload pressure · {risk.band}</h3>
      <p>{risk.message}</p>

      <button className="risk-update" onClick={onUpdate}>
        <Sparkles aria-hidden="true" />
        <span>
          <b>Update workload pressure</b>
          <small>Take a new check-in</small>
        </span>
      </button>

      <details>
        <summary>Why this result?</summary>
        {!hideNumbers && <p className="hint">Pressure estimate: {risk.score}/100 — a supportive estimate, not a diagnosis.</p>}
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

  // `patch` applies the same change to local state that `persist` saved —
  // the store's return value is not used (it is empty in Firestore mode).
  async function run(persist, patch, successText) {
    if (busy) return;
    setBusy(true);
    setStatus({ text: '', tone: 'status' });
    try {
      await persist();
      setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === task.id ? patch(t) : t)) }));
      setStatus({ text: successText, tone: 'status' });
      setMode('view');
    } catch {
      setStatus({ text: GENERIC_ERROR, tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  return <article className="task focus">
    <div className="module" data-color={moduleColor(task.module)}>{task.module}</div>
    <h3>{task.title}</h3>
    <small className="due-label">{relativeDueLabel(task.due)}</small>

    {mode === 'view' && <p>{actionText}</p>}
    {mode === 'editing' && <div className="panel">
      <label>Edit this step<textarea value={draftText} onChange={e => setDraftText(e.target.value)} rows={2} /></label>
      <div className="row">
        <button onClick={() => setMode('view')} disabled={busy}>Cancel</button>
        <button className="primary" disabled={busy || !draftText.trim()} onClick={() => { const step = makeCustomStep(task, draftText); run(() => setCurrentStep(uid, task.id, step), t => withStep(t, step), 'Step updated.'); }}>Save</button>
      </div>
    </div>}
    {mode === 'choosing' && <div className="panel">
      <p>Try a different small step:</p>
      {suggestAlternativeSteps(task).map(alt => (
        <button key={alt.id} className="option" disabled={busy} onClick={() => run(() => setCurrentStep(uid, task.id, alt), t => withStep(t, alt), 'Step updated.')}>{alt.text}</button>
      ))}
      <button onClick={() => setMode('view')} disabled={busy}>Cancel</button>
    </div>}

    {mode === 'view' && !stepDone && <div className="row">
      <button className="primary" disabled={busy} onClick={() => run(async () => {
        await completeCurrentStep(uid, task.id, true);
        // The count is secondary: a failure here must not report the step itself as unsaved.
        await recordStepCompleted(uid).then(() => setData(d => ({ ...d, stats: withStepCounted(d.stats) })), () => {});
      }, t => withStepDone(t), 'Saved. That step is done — the assignment stays open until you choose to complete it.')}>
        <Check /> {busy ? 'Saving…' : 'Mark this step done'}
      </button>
      <button disabled={busy} onClick={() => { setDraftText(task.currentStep?.text || ''); setMode('editing'); }}><Pencil /> Edit</button>
      <button disabled={busy} onClick={() => setMode('choosing')}>Try a different step</button>
    </div>}
    {mode === 'view' && stepDone && <div className="row">
      <span className="step-complete-badge"><Check /> Step complete</span>
      <button disabled={busy} onClick={() => { const step = nextStepAfter(task); run(() => setCurrentStep(uid, task.id, step), t => withStep(t, step), 'Here is a next small step.'); }}>Generate next step</button>
    </div>}
    <StatusMessage text={status.text} tone={status.tone} />
  </article>;
}

function MiniTask({ task }) {
  return <div className="mini">
    <span className={task.done ? 'checked' : ''}>{task.done && <Check />}</span>
    <div><b>{task.title}</b><small>{relativeDueLabel(task.due)} · {task.currentStep?.text}</small></div>
  </div>;
}
