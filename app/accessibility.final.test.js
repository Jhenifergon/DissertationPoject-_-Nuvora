import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(
  path.join(process.cwd(), 'app', 'globals.css'),
  'utf8'
);

describe('final accessibility CSS safeguards', () => {
  it('respects the operating-system reduced-motion preference', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('animation-duration: 0.01ms !important;');
    expect(css).toContain('transition-duration: 0.01ms !important;');
    expect(css).toContain('scroll-behavior: auto !important;');
  });

  it('keeps a visible keyboard focus indicator', () => {
    expect(css).toMatch(/:focus-visible\s*\{[\s\S]*?outline:\s*3px solid var\(--nuvora-purple\)/);
  });
});
