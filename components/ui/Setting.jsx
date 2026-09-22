'use client';

export function Setting({ label, text, checked, disabled, onChange }) {
  return <label className="setting"><div><b>{label}</b><p>{text}</p></div><input type="checkbox" role="switch" className="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} /></label>;
}
