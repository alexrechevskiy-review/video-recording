import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { RecordingProvider } from '@/context/RecordingContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Video Interview Recorder',
  description: 'Record and submit video interviews with screen sharing and PIP',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <RecordingProvider>
          {children}
        </RecordingProvider>
      </body>
    </html>
  );
}