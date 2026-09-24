'use client';

import { useState } from 'react';
import { ChevronLeft, Leaf } from 'lucide-react';
import { PageTitle } from '@/components/ui/PageTitle';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { Setting } from '@/components/ui/Setting';

const inputStyle = { width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(58,58,66,0.14)', marginTop: 8 };

export function SettingsPage({ value, busy, error, onChange, back }) {
  const [saved, setSaved] = useState('');

  // Text fields save when you leave them, and only if something changed —
  // with a quiet confirmation, since there is no Save button to press.
  async function saveText(field, text) {
    if (text === (value[field] || '')) return;
    setSaved('');
    if (await onChange({ ...value, [field]: text })) setSaved('Saved.');
  }

  return <>
    <button className="back" onClick={back.go}><ChevronLeft /> {back.label}</button>
    <PageTitle title="Settings" tone="teal" icon={<Leaf />} />
    <label className="setting" style={{ display: 'block' }}>
      <b>What should Nuvora call you?</b>
      <p>Optional — used only for a friendly greeting. Leave blank if you&rsquo;d rather not.</p>
      <input type="text" autoComplete="nickname" defaultValue={value.displayName} disabled={busy} placeholder="e.g. Sam" onBlur={e => saveText('displayName', e.target.value.trim())} style={inputStyle} />
    </label>
    <Setting label="Calm Mode" text="Shows one small step at a time on Today, and hides extra detail elsewhere." checked={value.calmMode} disabled={busy} onChange={v => onChange({ ...value, calmMode: v })} />
    <Setting label="Play calming sound when Calm Mode starts" text="A soft, continuous background tone while Calm Mode is on. Some people find a steady sound helps them settle. Stop it any time with the speaker button at the top." checked={value.calmTone !== false} disabled={busy} onChange={v => onChange({ ...value, calmTone: v })} />
    <Setting label="Reduced motion" text="Removes non-essential animation." checked={value.reducedMotion} disabled={busy} onChange={v => onChange({ ...value, reducedMotion: v })} />
    <h2>Text size</h2>
    <div className="tabs" role="group" aria-label="Text size">{[[1, 'Standard'], [1.15, 'Medium'], [1.3, 'Large']].map(([v, l]) => <button key={v} disabled={busy} aria-pressed={value.textScale === v} className={value.textScale === v ? 'active' : ''} onClick={() => onChange({ ...value, textScale: v })}>{l}</button>)}</div>
    <h2>Support person</h2>
    <p>Optional — a note for yourself. Nuvora never contacts anyone.</p>
    <label className="setting" style={{ display: 'block' }}>
      <b>Name</b>
      <input type="text" defaultValue={value.supportPersonName} disabled={busy} placeholder="e.g. Course tutor, a friend" onBlur={e => saveText('supportPersonName', e.target.value.trim())} style={inputStyle} />
    </label>
    <label className="setting" style={{ display: 'block' }}>
      <b>Note (optional)</b>
      <input type="text" defaultValue={value.supportPersonNote} disabled={busy} placeholder="e.g. Best reached by email" onBlur={e => saveText('supportPersonNote', e.target.value.trim())} style={inputStyle} />
    </label>
    <StatusMessage text={error || saved} tone={error ? 'error' : 'status'} />
  </>;
}
