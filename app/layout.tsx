import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stride Services — AI Chatboty dla Firm',
  description: 'Spersonalizowane chatboty AI dla firm usługowych. Zwiększ sprzedaż, automatyzuj obsługę klienta.',
  icons: [
    {
      rel: 'icon',
      url: '/favicon-czarne.png',
      media: '(prefers-color-scheme: light)',
    },
    {
      rel: 'icon',
      url: '/favicon-biale.png',
      media: '(prefers-color-scheme: dark)',
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className="bg-[#09090b] text-white antialiased">{children}</body>
    </html>
  );
}
