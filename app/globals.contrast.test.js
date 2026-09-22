import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const cssPath = path.join(
  process.cwd(),
  'app',
  'globals.css'
);

const entryCss = fs.readFileSync(
  cssPath,
  'utf8'
);

// globals.css is now a manifest of ordered @import statements (see its own
// header comment) rather than one long file — resolve those imports the
// same way a browser/bundler would, so this test still sees the full
// effective stylesheet.
const css = entryCss.replace(
  /@import\s+['"](.+?)['"];/g,
  (_, importPath) => fs.readFileSync(
    path.join(path.dirname(cssPath), importPath),
    'utf8'
  )
);

function hexToRgb(hex) {
  const clean = hex.replace('#', '');

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function channelToLinear(value) {
  const channel = value / 255;

  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow(
        (channel + 0.055) / 1.055,
        2.4
      );
}

function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);

  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

function contrastRatio(
  foreground,
  background
) {
  const light1 = luminance(foreground);
  const light2 = luminance(background);

  const lighter = Math.max(
    light1,
    light2
  );

  const darker = Math.min(
    light1,
    light2
  );

  return (
    (lighter + 0.05) /
    (darker + 0.05)
  );
}

describe(
  'Nuvora text contrast tokens',
  () => {
    it(
      'secondary text colour meets WCAG AA for normal text on white',
      () => {
        const ratio =
          contrastRatio(
            '#6B6B76',
            '#FFFFFF'
          );

        expect(ratio).toBeGreaterThanOrEqual(
          4.5
        );
      }
    );

    it(
      'primary text purple meets WCAG AA for normal text on white',
      () => {
        const ratio =
          contrastRatio(
            '#5B4FD1',
            '#FFFFFF'
          );

        expect(ratio).toBeGreaterThanOrEqual(
          4.5
        );
      }
    );

    it(
      'button purple meets WCAG AA for white text',
      () => {
        const ratio =
          contrastRatio(
            '#FFFFFF',
            '#6E62E5'
          );

        expect(ratio).toBeGreaterThanOrEqual(
          4.5
        );
      }
    );

    it(
      'small text uses the higher-contrast secondary text token',
      () => {
        expect(css).toMatch(
          /small\s*\{[\s\S]*?color:\s*var\(--nuvora-text-secondary\)/
        );
      }
    );

    it(
      'the lighter muted colour is not used by global small text',
      () => {
        const smallRuleMatch =
          css.match(
            /small\s*\{[\s\S]*?\}/
          );

        expect(
          smallRuleMatch
        ).not.toBeNull();

        expect(
          smallRuleMatch[0]
        ).not.toContain(
          'var(--nuvora-text-muted)'
        );
      }
    );
  }
);