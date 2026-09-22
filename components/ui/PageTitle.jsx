'use client';

import { Mascot } from './Mascot';

export function PageTitle({ title, tone = 'lavender', icon = null, action = null }) {
  return <div className="page-title page-title-card" data-tone={tone}>
    <div className="page-title-copy">
      <small>NUVORA SPACE</small>
      <h1>{title}</h1>
    </div>
    <div className="page-title-side">
      <div className="page-title-cloud" aria-hidden="true">
        <Mascot size={54} mood="calm" />
        {icon && <span className="page-title-icon">{icon}</span>}
      </div>
      {action}
    </div>
  </div>;
}
