import './globals.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';

export const metadata = { title: 'Nuvora', description: 'A calm academic workload companion' };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
