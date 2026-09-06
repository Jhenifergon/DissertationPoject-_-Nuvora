import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirrors the "@/*" path alias Next.js reads from jsconfig.json —
    // Vite/Vitest don't pick that up automatically.
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Only the code that actually has behaviour worth covering — not
      // config files, the Firestore emulator suite (needs a live
      // emulator, see firestore-rules.emulator-test.js), or the test
      // files themselves.
      include: ['lib/**', 'components/**', 'app/**'],
      exclude: ['**/*.test.{js,jsx}', '**/*.emulator-test.js', 'lib/firebase.js'],
    },
  },
});
