import '@testing-library/jest-dom/vitest';

// jsdom does not implement canvas and logs a "Not implemented" error whenever
// getContext is called. axe-core calls it for its icon-ligature heuristic and
// already copes with a missing context, so return null quietly instead.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = () => null;
}
