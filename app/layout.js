import './globals.css';

export const metadata = { title: 'Nuvora', description: 'A calm academic workload companion' };

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
