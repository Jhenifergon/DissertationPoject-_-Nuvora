'use client';

import { ChevronLeft, Leaf } from 'lucide-react';
import { PageTitle } from '@/components/ui/PageTitle';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { Setting } from '@/components/ui/Setting';

export function SettingsPage({ value, busy, error, onChange, go }) {
  return <>
    <button className="back" onClick={() => go('today')}><ChevronLeft /> Today</button>
    <PageTitle title="Calm accessibility settings" tone="teal" icon={<Leaf />} />
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
