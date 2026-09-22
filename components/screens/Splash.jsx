'use client';

import { Mascot } from '@/components/ui/Mascot';
import { Logo } from '@/components/ui/Logo';

export function Splash() {
  return <main><section className="phone splash"><Mascot size={110} /><Logo /><p>A calmer way to move forward.</p></section></main>;
}
