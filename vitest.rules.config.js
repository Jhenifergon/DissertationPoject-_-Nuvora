import { defineConfig } from 'vitest/config';

// Used only by `npm run test:rules`. The emulator suite's filename
// deliberately doesn't match Vitest's default *.test.js pattern (so plain
// `npm test` skips it), which means it has to be included explicitly here —
// passing the filename on the CLI only filters the default include list.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['firestore-rules.emulator-test.js'],
  },
});
