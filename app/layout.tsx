import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { RecordingProvider } from '@/context/RecordingContext';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryProvider } from "@/providers/react-query-provider";

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
        <ReactQueryProvider>
          <Toaster />
          <RecordingProvider>
            {children}
          </RecordingProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}