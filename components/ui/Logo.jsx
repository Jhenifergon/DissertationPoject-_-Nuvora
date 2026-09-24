'use client';

import { Mascot } from './Mascot';

export function Logo() {
  return <div className="logo"><Mascot size={26} /> <span className="logo-name">Nuvora</span></div>;
}
