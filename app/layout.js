import './globals.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';

export const metadata = { title: 'Nuvora', description: 'A calm academic workload companion' };

export default function RootLayout({ children }) {
  // suppressHydrationWarning here is the standard, narrowly-scoped fix for
  // browser extensions (Grammarly, password managers, etc.) that inject
  // attributes like data-gr-ext-installed onto <body> before React
  // hydrates. It only silences mismatches on this element's own
  // attributes — it does not hide real hydration bugs elsewhere in the
  // tree. See https://nextjs.org/docs/messages/react-hydration-error
  return <html lang="en"><body suppressHydrationWarning>{children}</body></html>;
}
