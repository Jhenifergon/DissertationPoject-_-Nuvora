import './globals.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';

export const metadata = { title: 'Nuvora', description: 'A calm academic workload companion' };

// viewport-fit=cover lets the layout use env(safe-area-inset-*) to keep the
// header and bottom nav clear of the notch and home indicator on iOS, and
// of the system bars when Android draws edge to edge (app/styles/final-polish.css).
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  // suppressHydrationWarning here is the standard, narrowly-scoped fix for
  // browser extensions (Grammarly, password managers, etc.) that inject
  // attributes like data-gr-ext-installed onto <body> before React
  // hydrates. It only silences mismatches on this element's own
  // attributes — it does not hide real hydration bugs elsewhere in the
  // tree. See https://nextjs.org/docs/messages/react-hydration-error
  return <html lang="en"><body suppressHydrationWarning>{children}</body></html>;
}
