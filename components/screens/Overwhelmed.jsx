'use client';

import { useEffect, useRef, useState } from 'react';
import { completeCurrentStep, recordStrategyUse, setCurrentStep } from '@/lib/store';
import { pickPriorityTask } from '@/lib/recommendation';
import { suggestAlternativeSteps } from '@/lib/steps';
import { orderByUsage } from '@/lib/patterns';
import { GENERIC_ERROR } from '@/components/constants';
import { Mascot } from '@/components/ui/Mascot';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { FocusTimer } from '@/components/ui/FocusTimer';
import { handleRadiogroupKeyDown } from '@/components/ui/radiogroup';

const BARRIERS = [
  { id: 'start', label: 'I do not know where to start' },
  { id: 'big', label: 'The task feels too big' },
  { id: 'energy', label: 'I have very low energy' },
  { id: 'reset', label: 'I need a short reset' },
  { id: 'support', label: 'I need to ask someone for help' },
];
const QUICK_RESET = { title: 'A 2-minute breathing reset', text: 'Slow your breathing for two minutes — in for four counts, out for six. There is nothing else to do right now.' };

export function Overwhelmed({ data, uid, setData, go, settings }) {
  const [barrier, setBarrier] = useState(null);
  const [done, setDone] = useState(false);
  const [chosenAlt, setChosenAlt] = useState(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [copyStatus, setCopyStatus] = useState({ text: '', tone: 'status' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const task = pickPriorityTask(data.tasks);
  const barrierRef = useRef(null);
  const doneHeadingRef = useRef(null);
  // Puts whichever barrier this student has actually found helpful before
  // first — reducing decision friction at exactly the moment
  // decision-making is hardest. A stable sort means a student with no
  // history yet sees the same order as always, not something arbitrary.
  const orderedBarriers = orderByUsage(BARRIERS, data.stats.strategyUses);

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
    <div ref={barrierRef} className="scale-vertical" role="radiogroup" aria-label="What is making this difficult right now?" onKeyDown={e => handleRadiogroupKeyDown(e, barrierRef, orderedBarriers.map(b => b.id), barrier, id => { setBarrier(id); setChosenAlt(null); })}>
      {orderedBarriers.map((b, i) => (
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
      <h2>{QUICK_RESET.title}</h2>
      <p>{QUICK_RESET.text}</p>
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
