import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the same web build in native Android and iOS apps.
// `webDir: 'out'` is the static export from `next build`; `npm run
// android:sync` / `ios:sync` rebuild it and copy it into each native
// project, so the phone apps run exactly the same code as the web version.
// Native-only behaviour (status bar style, iOS keyboard resizing, opening
// external links in the system browser) is added through Capacitor plugins
// in the React code and does nothing on the web.
const config: CapacitorConfig = {
  appId: 'com.nuvora.dissertation',
  appName: 'Nuvora',
  webDir: 'out'
};

export default config;
