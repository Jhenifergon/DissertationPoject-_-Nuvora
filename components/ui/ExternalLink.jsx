'use client';

import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// Plain <a target="_blank"> links are unreliable inside the Capacitor
// Android WebView: window.open() from a link click is not guaranteed to
// hand off to the system/in-app browser the way it does on the web. On
// native builds this opens the link in a Chrome Custom Tab via the
// @capacitor/browser plugin instead; on the web it behaves like a normal
// link, so this component is safe to use in both the browser demo and the
// Android app.
export function ExternalLink({ href, className, children }) {
  async function handleClick(event) {
    if (!Capacitor.isNativePlatform()) return;
    event.preventDefault();
    await Browser.open({ url: href });
  }

  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer" onClick={handleClick}>
      {children}
    </a>
  );
}
