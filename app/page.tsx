'use client';

import Image from 'next/image';
import ChatWidget from '@/components/ChatWidget';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative px-8 py-16">
      {/* Background glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="relative text-center max-w-[600px]">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image
            src="/logo.png"
            alt="Stride Services"
            width={140}
            height={40}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        <p className="text-xs font-semibold text-blue-400 tracking-[0.15em] uppercase mb-6">
          AI dla Twojego Biznesu
        </p>

        <h1 className="font-bold leading-[1.1] tracking-tight mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}>
          <span
            style={{
              background: 'linear-gradient(to right, #fff, #a1a1aa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Chatboty AI,{' '}
          </span>
          <span className="text-[#52525b]">które sprzedają</span>
        </h1>

        <p className="text-[#a1a1aa] text-lg leading-relaxed mb-10">
          Spersonalizowane asystenty AI dla firm usługowych. Obsługa klienta 24/7, automatyczne
          umawianie spotkań, odpowiedzi na pytania — wszystko skrojone pod Twój biznes.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="mailto:jakub@stride-services.com"
            className="px-6 py-3 rounded-lg text-sm font-medium text-white transition-all duration-200 bg-blue-600 hover:bg-blue-700"
          >
            Kontakt
          </a>
          <button
            id="open-chat-btn"
            className="px-6 py-3 rounded-lg text-sm font-medium text-white transition-all duration-200 border border-white/10 hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            Porozmawiaj z botem
          </button>
        </div>

        <p className="mt-12 text-xs text-[#52525b]">
          <a href="/polityka-prywatnosci/" className="hover:text-[#a1a1aa] transition-colors">
            Polityka prywatności
          </a>
        </p>
      </div>

      <ChatWidget />
    </main>
  );
}
