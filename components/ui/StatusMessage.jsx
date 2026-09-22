'use client';

// A small accessible status/error message. Errors use role="alert" so
// assistive technology announces them immediately; confirmations use the
// gentler role="status" so they do not interrupt the user.
export function StatusMessage({ text, tone = 'status' }) {
  if (!text) return null;
  return <p className={`status-msg ${tone}`} role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>{text}</p>;
}
