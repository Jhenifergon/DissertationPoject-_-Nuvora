'use client';

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { saveReflection } from '@/lib/store';
import { GENERIC_ERROR } from '@/components/constants';
import { StatusMessage } from '@/components/ui/StatusMessage';

const REFLECTION_PROMPTS = [
  { id: 'manageable', label: 'What felt manageable this week?' },
  { id: 'hard', label: 'What would help make next week a little easier?' },
];

// A short, free-text reflection entirely in the student's own words —
// never generated, summarised, or scored by Nuvora. Saved so past entries
// can be looked back on, but there is no "streak" of doing this regularly.
export function Reflection({ uid, data, setData, go }) {
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
