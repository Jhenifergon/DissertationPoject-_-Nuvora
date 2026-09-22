'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { saveCheckin } from '@/lib/store';
import { explainPressure } from '@/lib/explain';
import { calculatePressure } from '@/lib/risk';
import { combineWorkloadPressure } from '@/lib/pressure';
import { Mascot } from '@/components/ui/Mascot';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { handleRadiogroupKeyDown } from '@/components/ui/radiogroup';

const questions = [
  // The first question is conceptually different from the four 1-5 scales
  // that follow it, so it's asked with plain descriptive options instead of
  // bare numbers — but the value each option saves (1-4) is unchanged, so
  // the underlying workload-pressure weighting in lib/risk.js is untouched.
  { id: 'mood', title: 'How is your workload feeling today?', max: 4, low: 'Calm', high: 'Very overwhelming', options: ['Calm & in control', 'Manageable', 'Heavier than usual', 'Very overwhelming'] },
  { id: 'sleep', title: 'How rested do you feel?', max: 5, low: 'Low energy', high: 'Well rested' },
  { id: 'focus', title: 'How easy is it to focus right now?', max: 5, low: 'Hard to focus', high: 'Easy to focus' },
  { id: 'initiation', title: 'How easy is it to start tasks today?', max: 5, low: 'Hard to start', high: 'Easy to start' },
  { id: 'confidence', title: 'How confident do you feel about this week?', max: 5, low: 'Not confident', high: 'Confident' },
];

export function Checkin({ uid, data, setData, go, draft, setDraft }) {
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
      // Calculate the transparent rule-based pressure score locally rather
      // than making an unnecessary request to /api/risk. This keeps the
      // core scoring path available for offline/PWA/Capacitor use and avoids
      // introducing a network failure point for a pure deterministic function.
      const r = calculatePressure(answers);

      // The self-report score (r) is combined with the student's current
      // task deadlines here — see lib/pressure.js and the Phase 2 item 5
      // proposal for the full rule set, rationale, and scenario table.
      const combined = combineWorkloadPressure(r, data.tasks);

      // Persist the completed check-in before moving to the result screen.
      // This prevents the UI from presenting a successful result as saved
      // when Firestore has actually failed.
      await saveCheckin(uid, { answers, risk: combined });
      setData(d => ({ ...d, checkins: [{ answers, risk: combined, createdAt: new Date().toISOString() }, ...d.checkins] }));
      setRisk(combined);
    } catch (err) {
      console.error('Unable to complete check-in:', err);
      setError("We couldn't save your check-in just now. Your answers are still here — please try again.");
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
      <small>WORKLOAD PRESSURE</small>
      <h1 ref={resultHeadingRef} tabIndex={-1}>{risk.band} pressure</h1>
      <p>{risk.message}</p>
      <p>This result is not a diagnosis. It only helps Nuvora adjust today’s support.</p>
      <details><summary>Why this result?</summary><p className="hint">Pressure estimate: {risk.score}/100 — a supportive estimate, not a diagnosis.</p><ul className="explanation-list">{explainPressure(risk, data.tasks).map((line, i) => <li key={i}>{line}</li>)}</ul></details>
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
      {q.options ? (
        <div className="scale-vertical">
          {q.options.map((label, i) => { const n = i + 1; return (
            <button key={n} role="radio" aria-checked={answers[q.id] === n} data-value={n} tabIndex={answers[q.id] === n || (answers[q.id] === undefined && n === 1) ? 0 : -1} onClick={() => setAnswer(n)} className={`option ${answers[q.id] === n ? 'selected' : ''}`}>{label}</button>
          ); })}
        </div>
      ) : <>
        <div className="scale">
          {Array.from({ length: q.max }, (_, i) => i + 1).map(n => (
            <button key={n} role="radio" aria-checked={answers[q.id] === n} data-value={n} tabIndex={answers[q.id] === n || (answers[q.id] === undefined && n === 1) ? 0 : -1} onClick={() => setAnswer(n)} className={answers[q.id] === n ? 'selected' : ''}>{n}</button>
          ))}
        </div>
        <div className="scale-label"><span>{q.low}</span><span>{q.high}</span></div>
      </>}
      <button role="radio" aria-checked={answers[q.id] === 'unsure'} data-value="unsure" tabIndex={answers[q.id] === 'unsure' ? 0 : -1} className={`option not-sure ${answers[q.id] === 'unsure' ? 'selected' : ''}`} onClick={() => setAnswer('unsure')}>Not sure / prefer not to answer</button>
    </div>
    <StatusMessage text={error} tone="error" />
    <button className="primary bottom" disabled={submitting} onClick={next}>{submitting ? 'Saving…' : 'Continue'}</button>
  </>;
}
