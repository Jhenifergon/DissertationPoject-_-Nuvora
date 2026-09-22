import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.join(process.cwd(), 'app', 'globals.css');

// globals.css is now a manifest of ordered @import statements (see its own
// header comment) rather than one long file — resolve those imports the
// same way a browser/bundler would, so this test still sees the full
// effective stylesheet.
const css = fs.readFileSync(cssPath, 'utf8').replace(
  /@import\s+['"](.+?)['"];/g,
  (_, importPath) => fs.readFileSync(path.join(path.dirname(cssPath), importPath), 'utf8')
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
