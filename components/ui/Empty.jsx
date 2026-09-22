'use client';

import { Leaf } from 'lucide-react';

export function Empty({ title, text }) {
  return <div className="empty"><Leaf /><h2>{title}</h2><p>{text}</p></div>;
}
