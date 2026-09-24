'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { reflectionTime, saveReflection } from '@/lib/store';
import { GENERIC_ERROR } from '@/components/constants';
import { StatusMessage } from '@/components/ui/StatusMessage';

const REFLECTION_PROMPTS = [
  { id: 'manageable', label: 'What felt manageable this week?' },
  { id: 'hard', label: 'What would help make next week a little easier?' },
];

// Only the most recent few are shown by default so the screen stays calm to
// scan; older entries are one tap away rather than silently cut off.
const RECENT_COUNT = 5;

// A short, free-text reflection entirely in the student's own words —
// never generated, summarised, or scored by Nuvora. Saved so past entries
// can be looked back on, but there is no "streak" of doing this regularly.
//
// Saving: saveReflection stores it (Firestore or the demo browser store)
// and returns the entry, which is put at the top of the list straight away.
// On the next load the list comes back newest first in both modes.
export function Reflection({ uid, data, setData, go }) {
  const [answers, setAnswers] = useState({ manageable: '', hard: '' });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ text: '', tone: 'status' });
  const [showAll, setShowAll] = useState(false);
  const reflections = data.reflections;
  const visible = showAll ? reflections : reflections.slice(0, RECENT_COUNT);

  async function save() {
    if (saving) return;
    if (!answers.manageable.trim() && !answers.hard.trim()) {
      setStatus({ text: 'Write as much or as little as feels useful — at least one answer helps.', tone: 'error' });
      return;
    }
    setSaving(true);
    setStatus({ text: '', tone: 'status' });
    try {
      const saved = await saveReflection(uid, answers);
      setData(d => ({ ...d, reflections: [saved, ...d.reflections] }));
      setAnswers({ manageable: '', hard: '' });
      setStatus({ text: 'Saved. Thank you for taking a moment for this.', tone: 'status' });
    } catch (err) {
      console.error('Unable to save reflection:', err);
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
    {reflections.length > 0 && <>
      <h2>Past reflections</h2>
      {reflections.length > RECENT_COUNT && <p>{showAll ? `All ${reflections.length} reflections, newest first.` : `Your ${RECENT_COUNT} most recent reflections, newest first.`}</p>}
      {visible.map((r, i) => {
        const time = reflectionTime(r);
        return <article className="panel" key={r.id || i}>
          {time > 0 && <small>{new Date(time).toLocaleDateString()}</small>}
          {r.manageable && <p><b>Manageable:</b> {r.manageable}</p>}
          {r.hard && <p><b>Would help:</b> {r.hard}</p>}
          {r.text && <p>{r.text}</p>}
        </article>;
      })}
      {reflections.length > RECENT_COUNT && <button className="link" aria-expanded={showAll} onClick={() => setShowAll(s => !s)}>
        {showAll ? 'Show recent only' : `Show older reflections (${reflections.length - RECENT_COUNT})`}
      </button>}
    </>}
  </>;
}
