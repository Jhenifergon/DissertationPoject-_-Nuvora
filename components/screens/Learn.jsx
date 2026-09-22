'use client';

import { useState } from 'react';
import { Leaf } from 'lucide-react';
import { completeCurrentStep, recordStepCompleted, recordStrategyUse, setCurrentStep } from '@/lib/store';
import { pickPriorityTask } from '@/lib/recommendation';
import { makeCustomStep } from '@/lib/steps';
import { GENERIC_ERROR } from '@/components/constants';
import { PageTitle } from '@/components/ui/PageTitle';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { FocusTimer } from '@/components/ui/FocusTimer';

export function Learn({ calmMode, data, uid, setData, go }) {
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shrinkStatus, setShrinkStatus] = useState({ text: '', tone: 'status' });
  const [lowEnergyStatus, setLowEnergyStatus] = useState({ text: '', tone: 'status' });
  const [supportChoice, setSupportChoice] = useState(null);
  const [supportStatus, setSupportStatus] = useState({ text: '', tone: 'status' });
  const [helperAnswers, setHelperAnswers] = useState({ brain: '', environment: '', task: '' });
  const [sensoryChoice, setSensoryChoice] = useState('');
  const [focusSprintMinutes, setFocusSprintMinutes] = useState(5);
  const [parkingInput, setParkingInput] = useState('');
  const [parkingLot, setParkingLot] = useState([]);
  const [ifThenCue, setIfThenCue] = useState('');
  const [ifThenAction, setIfThenAction] = useState('');
  const task = pickPriorityTask(data.tasks);

  async function persistSuggestedStep(text, statusSetter = setSupportStatus) {
    if (!task || busy) return;
    setBusy(true);
    statusSetter({ text: '', tone: 'status' });
    try {
      const nextStep = makeCustomStep(task, text);
      await setCurrentStep(uid, task.id, nextStep);

      // Firestore persistence and local React state are deliberately handled
      // separately. setCurrentStep() may not return a task object in every
      // storage mode, so never replace the task in state with its return value.
      setData(d => ({
        ...d,
        tasks: d.tasks.map(t => (t.id === task.id ? { ...t, currentStep: nextStep } : t)),
      }));
      statusSetter({ text: 'Saved as your next step for this task.', tone: 'status' });
    } catch {
      statusSetter({ text: GENERIC_ERROR, tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function useShrunkStep() {
    if (!task) return;
    await persistSuggestedStep(`Write one sentence about ${task.title}.`, setShrinkStatus);
  }

  async function markLowEnergyDone() {
    if (!task || busy) return;
    setBusy(true);
    setLowEnergyStatus({ text: '', tone: 'status' });
    try {
      const updated = await completeCurrentStep(uid, task.id, true);
      setData(d => ({ ...d, tasks: d.tasks.map(t => (t.id === task.id ? updated : t)) }));
      await recordStepCompleted(uid).catch(() => {});
      setLowEnergyStatus({ text: 'Saved. That step is done — the assignment stays open.', tone: 'status' });
    } catch {
      setLowEnergyStatus({ text: GENERIC_ERROR, tone: 'error' });
    } finally {
      setBusy(false);
    }
  }

  async function copyBodyDoubleMessage() {
    const message = task
      ? `Hi — I’m finding it hard to start “${task.title}”. Would you mind staying on a call with me for 20–25 minutes while we both work quietly? You don’t need to help with the task.`
      : 'Hi — I’m finding it hard to start some university work. Would you mind staying on a call with me for 20–25 minutes while we both work quietly?';
    setSupportStatus({ text: '', tone: 'status' });
    try {
      await navigator.clipboard.writeText(message);
      await recordStrategyUse(uid, 'support').catch(() => {});
      setSupportStatus({ text: 'Copied. Nothing is sent automatically.', tone: 'status' });
    } catch {
      setSupportStatus({ text: 'Could not copy automatically. You can copy the message manually instead.', tone: 'error' });
    }
  }

  function helperRecommendation() {
    const { brain, environment, task: taskFeeling } = helperAnswers;
    if (!brain || !environment || !taskFeeling) return null;
    if (environment === 'overwhelming') return 'sensory';
    if (brain === 'tired') return 'energy';
    if (taskFeeling === 'big' || taskFeeling === 'unclear') return 'big';
    return 'start';
  }

  const helperResult = helperRecommendation();

  const supportChoices = [
    { id: 'start', icon: '🚪', title: 'I can’t start', text: 'Make beginning tiny.' },
    { id: 'big', icon: '🧩', title: 'This feels too big', text: 'Choose one smaller piece.' },
    { id: 'energy', icon: '🔋', title: 'I have very low energy', text: 'Lower the demand.' },
    { id: 'sensory', icon: '🌿', title: 'I’m overstimulated', text: 'Reduce input before work.' },
    { id: 'company', icon: '👥', title: 'I need company', text: 'Work alongside someone.' },
    { id: 'unsure', icon: '💭', title: 'I don’t know what I need', text: 'Use a three-question helper.' },
  ];

  function renderSupportPanel() {
    if (!supportChoice) return null;

    if (supportChoice === 'start') return <article className="panel">
      <small>LAUNCH STEP</small>
      <h2>Make the start obvious, not ambitious.</h2>
      <p>
        {task
          ? <>When I open <b>&ldquo;{task.title}&rdquo;</b>, I will only find the section I need next.</>
          : <>When I open my work, I will only find the next place to begin.</>}
      </p>
      <div className="panel" style={{ margin: '12px 0', background: 'var(--surface-soft)' }}>
        <small>IF–THEN CUE</small>
        <p style={{ marginBottom: 0 }}>
          <b>When</b> I open the work, <b>I will</b> find one place to continue.
        </p>
      </div>
      {task && <button className="primary" onClick={() => go('tasks')}>Open &ldquo;{task.title}&rdquo;</button>}
      <p className="hint">Opening the right place is enough. No timer is required.</p>
    </article>;

    if (supportChoice === 'big') return <article className="panel">
      <small>VISUAL STEP MAP</small>
      <h2>See only the next three actions.</h2>
      {task ? <>
        <button className="option" disabled={busy} onClick={() => persistSuggestedStep(`Open ${task.title} and find the section you need next.`)}>
          <b>1 · Find the place</b><br />Open the task and locate the next section.
        </button>
        <button className="option" disabled={busy} onClick={() => persistSuggestedStep(`Add one useful point to ${task.title}.`)}>
          <b>2 · Add one point</b><br />Write one useful bullet, sentence or note.
        </button>
        <button className="option" disabled={busy} onClick={() => persistSuggestedStep(`Check what comes immediately after your current step in ${task.title}.`)}>
          <b>3 · Choose what follows</b><br />Decide the next action only after that.
        </button>
      </> : <p>Find the place → add one point → choose what comes next. The whole task can stay out of view.</p>}
      <StatusMessage text={supportStatus.text} tone={supportStatus.tone} />
    </article>;

    if (supportChoice === 'energy') return <article className="panel">
      <small>LOW-ENERGY MODE</small>
      <h2>Choose the effort level you actually have.</h2>
      {task ? <>
        <button className="option" disabled={busy} onClick={() => persistSuggestedStep(`Open ${task.title} and leave it ready for later.`)}>
          <b>Tiny</b><br />Prepare the task and stop there.
        </button>
        <button className="option" disabled={busy} onClick={() => persistSuggestedStep(task.currentStep?.text || `Do one small part of ${task.title}.`)}>
          <b>Enough</b><br />Do only the current step.
        </button>
        <button className="option" onClick={() => go('tasks')}>
          <b>Full</b><br />Open the plan and choose what you can manage.
        </button>
        {!task.currentStep?.done && <button className="option" disabled={busy} onClick={markLowEnergyDone}>I did the current step</button>}
      </> : <p>Tiny: prepare it. Enough: do one step. Full: continue only if you still have capacity.</p>}
      <StatusMessage text={supportStatus.text || lowEnergyStatus.text} tone={supportStatus.text ? supportStatus.tone : lowEnergyStatus.tone} />
      <p className="hint">The useful version can be smaller than the ideal version.</p>
    </article>;

    if (supportChoice === 'sensory') {
      const sensoryOptions = [
        ['quiet', 'Move somewhere quieter'],
        ['screen', 'Lower screen brightness'],
        ['notifications', 'Pause notifications'],
        ['headphones', 'Use headphones or ear protection'],
        ['phone', 'Put the phone out of sight'],
      ];
      return <article className="panel">
        <small>SENSORY SETUP</small>
        <h2>Change one source of input first.</h2>
        <p>No task work is required while you make the environment easier to tolerate.</p>
        <div className="scale-vertical" aria-label="Choose one sensory adjustment">
          {sensoryOptions.map(([id, label]) => (
            <button
              key={id}
              className={`option ${sensoryChoice === id ? 'selected' : ''}`}
              aria-pressed={sensoryChoice === id}
              onClick={() => setSensoryChoice(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {sensoryChoice && <p className="status-msg status" role="status">Good. Change only that one thing, then decide whether you want to work, rest, or return to Today.</p>}
        <button onClick={() => go('today')}>Back to Today</button>
      </article>;
    }

    if (supportChoice === 'company') return <article className="panel">
      <small>WORK ALONGSIDE SOMEONE</small>
      <h2>Use another person as quiet company, not as a supervisor.</h2>
      <p>Choose the kind of presence that feels useful. You do not have to explain the task.</p>
      <button className="option" onClick={copyBodyDoubleMessage}>Copy a message asking someone to join me</button>
      <a className="option" href="https://www.youtube.com/watch?v=wYxDJOFgDw0" target="_blank" rel="noopener noreferrer">Optional Study With Me video ↗</a>
      <StatusMessage text={supportStatus.text} tone={supportStatus.tone} />
      <p className="hint">External YouTube link. It is optional and never starts automatically.</p>
    </article>;

    return <article className="panel">
      <small>QUICK SUPPORT MATCHER</small>
      <h2>Three quick checks. No perfect answer needed.</h2>
      <label>My brain feels
        <select value={helperAnswers.brain} onChange={e => setHelperAnswers(a => ({ ...a, brain: e.target.value }))}>
          <option value="">Choose one</option>
          <option value="scattered">Scattered</option>
          <option value="stuck">Stuck</option>
          <option value="tired">Tired</option>
        </select>
      </label>
      <label>My environment feels
        <select value={helperAnswers.environment} onChange={e => setHelperAnswers(a => ({ ...a, environment: e.target.value }))}>
          <option value="">Choose one</option>
          <option value="okay">Okay</option>
          <option value="distracting">Distracting</option>
          <option value="overwhelming">Overwhelming</option>
        </select>
      </label>
      <label>The task feels
        <select value={helperAnswers.task} onChange={e => setHelperAnswers(a => ({ ...a, task: e.target.value }))}>
          <option value="">Choose one</option>
          <option value="clear">Clear</option>
          <option value="big">Too big</option>
          <option value="unclear">Unclear</option>
        </select>
      </label>
      {!helperResult && <p className="hint">Answer all three and Nuvora will suggest one support route.</p>}
      {helperResult && <button className="primary" onClick={() => setSupportChoice(helperResult)}>
        {helperResult === 'sensory'
          ? 'Adjust the environment'
          : helperResult === 'energy'
            ? 'Try the low-energy version'
            : helperResult === 'big'
              ? 'Map three small steps'
              : 'Try a launch step'}
      </button>}
    </article>;
  }

  // Extra tools deliberately use different support mechanisms instead of
  // repeating the same two-minute timer/audio pattern on every card.
  const visualSteps = task
    ? [
        `Open ${task.title} and find the exact place you last stopped.`,
        task.currentStep?.text || `Add one useful point to ${task.title}.`,
        `Decide only the next action after that.`,
      ]
    : [
        'Open the work and find where you stopped.',
        'Do one visible action.',
        'Choose only what comes immediately after it.',
      ];

  const allActivities = [
    {
      title: 'Focus Sprint',
      badge: 'OPTIONAL FOCUS TOOL',
      body: <>
        <p>Choose the amount of time yourself. The timer is optional support, not the goal.</p>
        <div className="row" role="group" aria-label="Choose focus sprint length">
          {[2, 5, 10, 15].map(minutes => (
            <button
              key={minutes}
              className={focusSprintMinutes === minutes ? 'selected' : ''}
              aria-pressed={focusSprintMinutes === minutes}
              onClick={() => setFocusSprintMinutes(minutes)}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <FocusTimer key={focusSprintMinutes} seconds={focusSprintMinutes * 60} showTone={false} />
      </>,
    },
    {
      title: 'Distraction Parking Lot',
      badge: 'CLEAR WORKING MEMORY',
      body: <>
        <p>Put an unrelated thought somewhere safe so you do not have to keep holding it in mind.</p>
        <div className="row">
          <input
            aria-label="Thought to park for later"
            value={parkingInput}
            onChange={e => setParkingInput(e.target.value)}
            placeholder="e.g. reply to Sam, buy milk, check that link"
          />
          <button
            disabled={!parkingInput.trim()}
            onClick={() => {
              const note = parkingInput.trim();
              if (!note) return;
              setParkingLot(items => [...items, note]);
              setParkingInput('');
            }}
          >
            Park it
          </button>
        </div>
        {parkingLot.length > 0 && <ul aria-label="Parked thoughts">
          {parkingLot.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
        </ul>}
        <p className="hint">These notes are session-only and are not added to your task list.</p>
      </>,
    },
    {
      title: 'If–Then Plan',
      badge: 'MAKE THE CUE EXPLICIT',
      body: <>
        <p>Turn an intention into a concrete cue and response.</p>
        <label>When…
          <input value={ifThenCue} onChange={e => setIfThenCue(e.target.value)} placeholder="I open my dissertation document" />
        </label>
        <label>I will…
          <input value={ifThenAction} onChange={e => setIfThenAction(e.target.value)} placeholder="find the testing section and add one point" />
        </label>
        {(ifThenCue || ifThenAction) && <div className="panel" style={{ marginTop: 10 }}>
          <b>My plan</b>
          <p style={{ marginBottom: 0 }}>
            When {ifThenCue || 'the cue happens'}, I will {ifThenAction || 'do one specific action'}.
          </p>
        </div>}
      </>,
    },
    {
      title: 'Visual Step Map',
      badge: 'SEE ONLY THREE ACTIONS',
      body: <>
        <ol>
          {visualSteps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}
        </ol>
        {task && <button className="option" disabled={busy} onClick={() => persistSuggestedStep(visualSteps[0], setShrinkStatus)}>Use step 1 as my next step</button>}
        <StatusMessage text={shrinkStatus.text} tone={shrinkStatus.tone} />
      </>,
    },
  ];

  const [pick, ...rest] = allActivities;
  const ACTIVITY_COLORS = ['teal', 'amber', 'blue'];

  return <>
    <PageTitle title="Learn" tone="lavender" icon={<Leaf />} />
    <p><b>Support tools for difficult study moments.</b> You do not need to fix everything. Pick the problem that feels closest.</p>

    <div className="panel panel-lavender">
      <h2>What would help right now?</h2>
      <div className="scale-vertical" aria-label="What would help right now?">
        {supportChoices.map(choice => <button
          key={choice.id}
          className={`option ${supportChoice === choice.id ? 'selected' : ''}`}
          aria-pressed={supportChoice === choice.id}
          onClick={() => { setSupportChoice(choice.id); setSupportStatus({ text: '', tone: 'status' }); }}
        >
          <b>{choice.icon} {choice.title}</b><br /><span className="hint">{choice.text}</span>
        </button>)}
      </div>
      <p className="hint">One choice is enough. You can change it at any time.</p>
    </div>

    {renderSupportPanel()}

    <article className="panel panel-teal">
      <h2>Reset Space</h2>
      <p>Need a little more space before studying? You can pause here without starting another task.</p>
      <details>
        <summary>Wellbeing and sensory resources — optional</summary>
        <p className="hint">These resources open outside Nuvora and are completely optional.</p>
        <a className="option" href="https://www.nhs.uk/every-mind-matters/" target="_blank" rel="noopener noreferrer">NHS Every Mind Matters ↗</a>
        <a className="option" href="https://www.adhdfoundation.org.uk/resources/" target="_blank" rel="noopener noreferrer">ADHD Foundation resources ↗</a>
        <a className="option" href="https://www.autism.org.uk/advice-and-guidance/about-autism/sensory-processing" target="_blank" rel="noopener noreferrer">National Autistic Society: sensory processing ↗</a>
      </details>
      <p className="hint">External resources are optional and are not a replacement for professional support.</p>
    </article>

    <div className="panel panel-amber">
      <h2>More study tools</h2>
      <p className="hint">Optional tools for different kinds of attention, planning and task-entry problems. Use only the one that fits.</p>
      <button
        type="button"
        className="option"
        aria-expanded={showMoreTools}
        onClick={() => setShowMoreTools(value => !value)}
      >
        {showMoreTools ? 'Hide study tools' : 'Show more study tools'}
      </button>
    </div>

    {showMoreTools && (
      <>
        <div className="all-activities-label">SUGGESTED TOOL</div>
        <div className="pick-card">
          <div className="pick-label"><span>CHOOSE YOUR OWN LENGTH</span></div>
          <h2 style={{ margin: 0 }}>{pick.title}</h2>
          {pick.body}
        </div>

        <div className="all-activities-label">OTHER STUDY TOOLS</div>
        {rest.map((activity, index) => (
          <article
            className="activity"
            data-color={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]}
            key={activity.title}
          >
            <div>{index + 2}</div>
            <details>
              <summary><small>{activity.badge}</small><h2>{activity.title}</h2></summary>
              <section>{activity.body}</section>
            </details>
          </article>
        ))}
      </>
    )}
  </>;
}
