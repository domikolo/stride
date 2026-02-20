import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stride Services — AI Chatboty dla Firm',
  description: 'Spersonalizowane chatboty AI dla firm usługowych',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="bg-zinc-950 text-white antialiased">{children}</body>
    </html>
  );
}
