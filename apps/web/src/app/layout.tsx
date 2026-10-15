import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jantar Mantar Chalo — Satire Multiplayer Game',
  description: 'Jantar Mantar Chalo: a multiplayer satire game. Protesters fight their way across Delhi to Jantar Mantar while Dilli Police try to stop them.',
  authors: [{ name: 'Boogiy Man' }],
  creator: 'Boogiy Man',
  publisher: 'Boogiy Man',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">✊</text></svg>'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
