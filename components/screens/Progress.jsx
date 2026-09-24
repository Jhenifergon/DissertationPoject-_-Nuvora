'use client';

import { useState } from 'react';
import { PenLine, TrendingUp } from 'lucide-react';
import { buildPatternInsights } from '@/lib/patterns';
import { explainPressure } from '@/lib/explain';
import { CALM_SESSION_DEFAULTS } from '@/components/constants';
import { PageTitle } from '@/components/ui/PageTitle';
import { Empty } from '@/components/ui/Empty';

const STRATEGY_LABELS = { start: 'Getting started', big: 'Breaking a task down', energy: 'Low-energy attempts', reset: 'Short resets', support: 'Asking for help' };

// Progress is designed to be reflective, not motivational pressure: there
// are no streaks, targets, grades or "missed day" counts, only neutral
// totals (check-ins, small steps taken, strategies used), recent pressure
// results with their explanations, and pattern lines that only appear when
// there is enough data to support them (lib/patterns.js). The student can
// hide the whole section ("Hide these details"), and Calm Mode can hide the
// numbers for the current session. Weekly reflections are reached from here.
export function Progress({ data, settings, updateSettings, settingsBusy, go, calmSession = CALM_SESSION_DEFAULTS }) {
  const totalStrategyUses = Object.values(data.stats.strategyUses).reduce((a, b) => a + b, 0);
  const usedStrategies = Object.entries(data.stats.strategyUses).filter(([, n]) => n > 0);
  const [showTrends, setShowTrends] = useState(false);
  const showProgressNumbers = !(settings.calmMode && calmSession.hideProgressNumbers);

  if (settings.hideProgress) {
    return <>
      <PageTitle title="Progress, without pressure" tone="teal" icon={<TrendingUp />} />
      <Empty title="Progress is hidden" text="You've chosen not to see these details right now. That's completely fine." />
      <button disabled={settingsBusy} onClick={() => updateSettings({ ...settings, hideProgress: false })}>Show progress again</button>
    </>;
  }

  const patternInsights = buildPatternInsights(data.checkins);

  const trendsAndStrategies = <>
    {patternInsights.length > 0 && <div className="panel panel-teal">
      <h2>Patterns</h2>
      {patternInsights.map((line, i) => <p key={i}>{line}</p>)}
    </div>}
    {usedStrategies.length > 0 && <div className="panel panel-lavender">
      <h2>Helpful strategies</h2>
      {usedStrategies.map(([id, n]) => <div className="trend strategy-row" key={id}><span>{STRATEGY_LABELS[id]}</span><b>{showProgressNumbers ? n : 'Used'}</b></div>)}
    </div>}
    <h2>Recent pressure patterns</h2>
    {data.checkins.slice(0, 7).map((c, i) => {
      const dateLabel = new Date(c.createdAt?.seconds ? c.createdAt.seconds * 1000 : c.createdAt || Date.now()).toLocaleDateString();
      if (!c.risk) return <div className="trend" key={c.id || i}><span>{dateLabel}</span><span className="incomplete-tag">Incomplete</span></div>;
      // Progressive disclosure: the date/score is always visible, but the
      // "main contributors" breakdown for that day only shows if opened —
      // seven full breakdowns at once would be a lot to scan by default.
      return <details className="trend-entry" key={c.id || i}>
        <summary className="trend"><span>{dateLabel}</span><div><i style={{ width: showProgressNumbers ? `${c.risk.score}%` : '100%' }} /></div><b>{showProgressNumbers ? c.risk.score : c.risk.band}</b></summary>
        <ul className="explanation-list">{explainPressure(c.risk, data.tasks).map((line, j) => <li key={j}>{line}</li>)}</ul>
      </details>;
    })}
    {!data.checkins.length && <Empty title="Your trends will appear here" text="Complete a check-in whenever it feels helpful." />}
  </>;

  return <>
    <PageTitle title="Progress, without pressure" tone="teal" icon={<TrendingUp />} />
    <p>These numbers are just for your own reflection — there's no target to hit, and nothing here is shared with anyone.</p>
    {showProgressNumbers
      ? <div className="stats">
        <article><small>CHECK-INS SO FAR</small><b>{data.checkins.length}</b></article>
        <article><small>SMALL STEPS TAKEN</small><b>{data.stats.stepsCompleted}</b></article>
        <article><small>STRATEGIES USED</small><b>{totalStrategyUses}</b></article>
      </div>
      : <p className="status-msg status" role="status">Progress numbers are hidden for this Calm session.</p>}
    {settings.calmMode && !showTrends
      ? <button className="link" onClick={() => setShowTrends(true)}>Show trends &amp; strategies</button>
      : trendsAndStrategies}
    <button className="reflection-link" onClick={() => go('reflection')}><PenLine aria-hidden="true" /> Weekly reflection</button>
    <button className="link" disabled={settingsBusy} onClick={() => updateSettings({ ...settings, hideProgress: true })}>Hide these details</button>
  </>;
}
