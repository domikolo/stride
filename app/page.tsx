import Image from 'next/image';
import ChatWidget from '@/components/ChatWidget';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#09090b]">
      <div className="flex flex-col items-center gap-6">
        {/* Logos */}
        <div className="flex items-center gap-5">
          <Image
            src="/logo.png"
            alt="Stride Services"
            width={160}
            height={48}
            style={{ objectFit: 'contain' }}
            priority
          />
          <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.08)' }} />
          <Image
            src="/icon-logo-biale.png"
            alt="Stride"
            width={36}
            height={36}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        {/* Tagline */}
        <p className="text-sm text-[#52525b] tracking-widest uppercase">
          Zmieniamy się na lepsze
        </p>
      </div>

      <ChatWidget />
    </main>
  );
}
