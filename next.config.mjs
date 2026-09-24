/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export: Capacitor ships the app as files inside the Android
  // and iOS apps (no Node server on the device), so the production build
  // must be a set of static files rather than a server build. The same
  // `out/` folder is also what the web version serves. This is safe here
  // because Nuvora has no server-only route left — see docs/ANDROID_BUILD.md,
  // docs/IOS_BUILD.md and docs/PROJECT_EXPLAINED.md (Part 1).
  output: 'export',

  // next/image's optimizer needs a Node server; it is not used by this
  // project (no next/image imports), but unoptimized is required by
  // `output: 'export'` if that ever changes.
  images: { unoptimized: true },
};

export default nextConfig;
