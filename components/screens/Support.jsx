'use client';

import { useState } from 'react';
import { CircleHelp, Heart } from 'lucide-react';
import { explainPressure } from '@/lib/explain';
import { PageTitle } from '@/components/ui/PageTitle';
import { StatusMessage } from '@/components/ui/StatusMessage';

export function Support({ data, settings, go }) {
  const risk = data.checkins[0]?.risk;
  const [status, setStatus] = useState({ text: '', tone: 'status' });
  const explanation = risk ? explainPressure(risk, data.tasks) : [];
  const summary = risk ? [
    `Right now I'm experiencing ${risk.band.toLowerCase()} study pressure.`,
    '',
    "What I'm finding difficult:",
    ...explanation.map(line => `- ${line}`),
    '',
    'What could help:',
    '- Clarifying the nearest deadline',
    '- Help identifying one priority',
    '- Breaking the first action down',
  ].join('\n') : '';

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
    <PageTitle title="Support" tone="amber" icon={<Heart />} />
    <article className="support-card">
      <h2>A summary you control</h2>
      <p>Nuvora can create a short summary based on your check-ins and tasks. Nothing is sent automatically — you choose whether and how to share it.</p>
      <p style={{ whiteSpace: 'pre-line' }}>{risk ? summary : 'Complete a check-in to prepare a short support summary.'}</p>
      <button className="primary" disabled={!risk} onClick={copy}>Copy summary</button>
      <StatusMessage text={status.text} tone={status.tone} />
    </article>

    <div className="panel panel-blue" style={{ padding: 6 }}>
      <button onClick={() => go('settings')} style={{ width: '100%', padding: '14px 12px', border: 0, background: 'none', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: 'var(--ink)' }}>
        Calm accessibility settings <span className="hint" style={{ color: 'var(--nuvora-purple-dark)' }}>›</span>
      </button>
      <div style={{ height: 1, background: 'var(--nuvora-line-soft)' }} />
      {settings?.supportPersonName
        ? <button onClick={() => go('settings')} style={{ width: '100%', padding: '14px 12px', border: 0, background: 'none', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: 'var(--ink)' }}>
          Support person <span className="hint" style={{ color: 'var(--muted)' }}>{settings.supportPersonName} ›</span>
        </button>
        : <button onClick={() => go('settings')} style={{ width: '100%', padding: '14px 12px', border: 0, background: 'none', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: 'var(--ink)' }}>
          Support person <span className="hint" style={{ color: 'var(--muted)' }}>Not set ›</span>
        </button>}
      <div style={{ height: 1, background: 'var(--nuvora-line-soft)' }} />
      <button onClick={() => go('privacy')} style={{ width: '100%', padding: '14px 12px', border: 0, background: 'none', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: 'var(--ink)' }}>
        Privacy &amp; data <span className="hint" style={{ color: 'var(--nuvora-purple-dark)' }}>›</span>
      </button>
    </div>

    <article className="notice">
      <CircleHelp />
      <div><b>Need urgent help?</b><p>Nuvora is not an emergency or healthcare service. Contact your university support service, NHS 111, or emergency services when appropriate.</p></div>
    </article>
  </>;
}
