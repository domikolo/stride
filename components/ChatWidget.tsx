'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = 'chat' | 'booking' | 'contact' | 'verifying' | 'confirmed' | 'takeover';

interface Message {
  role: 'user' | 'bot' | 'agent';
  text: string;
  ts: number;
}

interface SlotsByDay {
  [date: string]: string[];
}

// ── Constants ──────────────────────────────────────────────────────────────

const CHATBOT_API = process.env.NEXT_PUBLIC_CHATBOT_API || '';
const POLL_INTERVAL = 2500;

// ── Helpers ────────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr-session';
  let sid = sessionStorage.getItem('stride_sid');
  if (!sid) {
    sid = 'web-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
    sessionStorage.setItem('stride_sid', sid);
  }
  return sid;
}

function formatTime(slot: string): string {
  try {
    const d = new Date(slot);
    return d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return slot;
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    return dateStr;
  }
}

function groupSlotsByDay(slots: string[]): SlotsByDay {
  const grouped: SlotsByDay = {};
  for (const slot of slots) {
    const date = slot.split('T')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(slot);
  }
  return grouped;
}

/** Simple inline markdown renderer: **bold**, _italic_, newlines → <br> */
function renderInlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  type ListType = 'ul' | 'ol';
  let listType: ListType | null = null;
  let listItems: string[] = [];
  let key = 0;

  const flushList = () => {
    if (!listType || listItems.length === 0) return;
    const Tag = listType;
    const className = listType === 'ul' ? 'list-disc pl-4 my-1 space-y-0.5' : 'list-decimal pl-4 my-1 space-y-0.5';
    elements.push(
      <Tag key={key++} className={className}>
        {listItems.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: renderInlineMd(item) }} />
        ))}
      </Tag>
    );
    listType = null;
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^[-*]\s+/.test(trimmed)) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(trimmed.replace(/^[-*]\s+/, ''));
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(trimmed.replace(/^\d+\.\s+/, ''));
      continue;
    }

    flushList();

    if (!trimmed) {
      elements.push(<div key={key++} className="h-1" />);
      continue;
    }
    elements.push(
      <p key={key++} dangerouslySetInnerHTML={{ __html: renderInlineMd(trimmed) }} />
    );
  }

  flushList();
  return <>{elements}</>;
}

// ── SlotPicker ─────────────────────────────────────────────────────────────

function SlotPicker({
  slots,
  selected,
  onSelect,
}: {
  slots: string[];
  selected: string | null;
  onSelect: (slot: string) => void;
}) {
  const grouped = groupSlotsByDay(slots);
  const days = Object.keys(grouped).sort();

  return (
    <div className="w-full space-y-3">
      {days.map(day => (
        <div key={day}>
          <p className="text-xs font-semibold text-[#60a5fa] mb-1.5 capitalize">{formatDate(day)}</p>
          <div className="flex flex-wrap gap-1.5">
            {grouped[day].map(slot => (
              <button
                key={slot}
                onClick={() => onSelect(slot)}
                className={`slot-btn px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  selected === slot
                    ? 'selected bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/80 hover:bg-blue-700/30'
                }`}
              >
                {formatTime(slot)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── ContactForm ────────────────────────────────────────────────────────────

function ContactForm({
  selectedSlot,
  onSubmit,
  onBack,
}: {
  selectedSlot: string;
  onSubmit: (info: string, type: 'email' | 'phone') => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState('');
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) { setError('Podaj adres e-mail lub numer telefonu.'); return; }
    if (contactType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Nieprawidłowy format e-mail.');
      return;
    }
    if (contactType === 'phone' && !/^[\d\s\+\-\(\)]{7,}$/.test(trimmed)) {
      setError('Nieprawidłowy numer telefonu.');
      return;
    }
    setError('');
    onSubmit(trimmed, contactType);
  };

  const dateLabel = (() => {
    try {
      const d = new Date(selectedSlot);
      return d.toLocaleString('pl-PL', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return selectedSlot; }
  })();

  return (
    <div className="w-full space-y-4 widget-msg-animate">
      <div className="bg-blue-600/15 border border-blue-500/25 rounded-xl p-3">
        <p className="text-xs text-blue-300 font-medium">Wybrany termin</p>
        <p className="text-sm text-white capitalize mt-0.5">{dateLabel}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <div className="flex gap-2 mb-2">
            {(['email', 'phone'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => { setContactType(t); setValue(''); setError(''); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  contactType === t
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {t === 'email' ? 'E-mail' : 'Telefon'}
              </button>
            ))}
          </div>
          <input
            type={contactType === 'email' ? 'email' : 'tel'}
            value={value}
            onChange={e => { setValue(e.target.value); setError(''); }}
            placeholder={contactType === 'email' ? 'twoj@email.pl' : '+48 123 456 789'}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/60 transition-colors"
            autoFocus
          />
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>

        <p className="text-xs text-white/40">
          Wyślemy kod weryfikacyjny, aby potwierdzić spotkanie.
        </p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 rounded-xl text-xs text-white/50 border border-white/10 hover:bg-white/5 transition-all"
          >
            Wróć
          </button>
          <button
            type="submit"
            className="flex-1 py-2 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-all active:scale-95"
          >
            Potwierdź termin
          </button>
        </div>
      </form>
    </div>
  );
}

// ── VerifyForm ─────────────────────────────────────────────────────────────

function VerifyForm({
  contactInfo,
  onSubmit,
  onResend,
}: {
  contactInfo: string;
  onSubmit: (code: string) => void;
  onResend?: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.replace(/\s/g, '');
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
      setError('Podaj 6-cyfrowy kod.');
      return;
    }
    setError('');
    onSubmit(trimmed);
  };

  return (
    <div className="w-full space-y-4 widget-msg-animate">
      <div className="text-center space-y-1">
        <p className="text-sm text-white font-medium">Weryfikacja</p>
        <p className="text-xs text-white/50">
          Kod wysłany na <span className="text-white/70">{contactInfo}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
          placeholder="123456"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-center text-xl tracking-[0.4em] text-white placeholder-white/20 outline-none focus:border-blue-500/60 transition-colors font-mono"
          autoFocus
        />
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <button
          type="submit"
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-all active:scale-95"
        >
          Potwierdź
        </button>

        {onResend && (
          <button
            type="button"
            onClick={onResend}
            className="w-full text-xs text-white/40 hover:text-white/60 transition-colors py-1"
          >
            Wyślij kod ponownie
          </button>
        )}
      </form>
    </div>
  );
}

// ── Main ChatWidget ────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [phase, setPhase] = useState<Phase>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState('');
  const [takenOver, setTakenOver] = useState(false);
  const [lastSeenTs, setLastSeenTs] = useState(0);

  const widgetRef = useRef<HTMLDivElement>(null);
  const animTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionId = useRef<string>('');

  // Init session ID on client
  useEffect(() => {
    sessionId.current = getSessionId();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      animTimers.current.forEach(clearTimeout);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, phase, slots]);

  // Takeover polling
  useEffect(() => {
    if (!takenOver) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(CHATBOT_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'poll',
            conversation_id: sessionId.current,
            last_seen_timestamp: lastSeenTs,
          }),
        });
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          const newMsgs: Message[] = data.messages.map((m: { text: string; timestamp: number }) => ({
            role: 'agent' as const,
            text: m.text,
            ts: m.timestamp,
          }));
          setMessages(prev => [...prev, ...newMsgs]);
          setLastSeenTs(data.messages[data.messages.length - 1].timestamp);
        }
        if (!data.taken_over) {
          setTakenOver(false);
          setPhase('chat');
        }
      } catch {
        // silently ignore poll errors
      }
    }, POLL_INTERVAL);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [takenOver, lastSeenTs]);

  // Wire up "Porozmawiaj z botem" button on landing page
  useEffect(() => {
    const btn = document.getElementById('open-chat-btn');
    if (!btn) return;
    const handler = () => animateOpen();
    btn.addEventListener('click', handler);
    return () => btn.removeEventListener('click', handler);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const scheduleTimer = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    animTimers.current.push(id);
    return id;
  };

  const animateOpen = () => {
    if (isAnimating || isOpen) return;
    animTimers.current.forEach(clearTimeout);
    animTimers.current = [];
    setIsAnimating(true);

    const widget = widgetRef.current;
    if (!widget) return;

    // Step 0: set initial collapsed state
    Object.assign(widget.style, {
      display: 'flex',
      height: '115px',
      width: '35px',
      transform: 'translateX(40px)',
      transition: 'none',
      opacity: '1',
    });

    const header = widget.querySelector('.widget-header') as HTMLElement | null;
    const body = widget.querySelector('.widget-body') as HTMLElement | null;
    const footer = widget.querySelector('.widget-footer') as HTMLElement | null;
    if (header) header.style.opacity = '0';
    if (body) body.style.opacity = '0';
    if (footer) footer.style.opacity = '0';

    void widget.offsetWidth; // force reflow

    // Step 1: slide in from right (0.25s)
    scheduleTimer(() => {
      widget.style.transition = 'transform 0.25s cubic-bezier(0.77,0,0.18,1)';
      widget.style.transform = 'translateX(0)';
    }, 10);

    // Step 2: expand width to 380px (0.25s)
    scheduleTimer(() => {
      widget.style.transition = 'width 0.25s cubic-bezier(0.77,0,0.18,1)';
      widget.style.width = '380px';
    }, 260);

    // Step 3: expand height to 520px (0.5s)
    scheduleTimer(() => {
      widget.style.transition = 'height 0.5s cubic-bezier(0.77,0,0.18,1)';
      widget.style.height = '520px';
    }, 510);

    // Step 4: show content, finish animation
    scheduleTimer(() => {
      setIsAnimating(false);
      setIsOpen(true);
      if (header) header.style.opacity = '1';
      if (body) body.style.opacity = '1';
      if (footer) footer.style.opacity = '1';
      widget.style.transition = 'none';
      // Focus input after open
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 1010);
  };

  const animateClose = useCallback(() => {
    if (isAnimating || !isOpen) return;
    animTimers.current.forEach(clearTimeout);
    animTimers.current = [];
    setIsAnimating(true);

    const widget = widgetRef.current;
    if (!widget) return;

    const header = widget.querySelector('.widget-header') as HTMLElement | null;
    const body = widget.querySelector('.widget-body') as HTMLElement | null;
    const footer = widget.querySelector('.widget-footer') as HTMLElement | null;

    if (header) header.style.opacity = '0';
    if (body) body.style.opacity = '0';
    if (footer) footer.style.opacity = '0';

    scheduleTimer(() => {
      widget.style.transition = 'height 0.25s cubic-bezier(0.77,0,0.18,1)';
      widget.style.height = '115px';
    }, 50);

    scheduleTimer(() => {
      widget.style.transition = 'width 0.25s cubic-bezier(0.77,0,0.18,1)';
      widget.style.width = '35px';
    }, 300);

    scheduleTimer(() => {
      widget.style.transition = 'transform 0.25s cubic-bezier(0.77,0,0.18,1)';
      widget.style.transform = 'translateX(40px)';
    }, 550);

    scheduleTimer(() => {
      setIsOpen(false);
      setIsAnimating(false);
      widget.style.display = 'none';
      widget.style.transition = 'none';
    }, 800);
  }, [isAnimating, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const addMessage = (role: Message['role'], text: string) => {
    setMessages(prev => [...prev, { role, text, ts: Date.now() }]);
  };

  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isTyping || takenOver) return;
    setInputValue('');
    addMessage('user', text);
    setIsTyping(true);

    try {
      const res = await fetch(CHATBOT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text, conversation_id: sessionId.current }),
      });
      const data = await res.json();

      if (data.taken_over) {
        setTakenOver(true);
        setPhase('takeover');
        return;
      }

      if (data.action_type === 'show_calendar' && data.available_slots?.length > 0) {
        addMessage('bot', data.answer || 'Wybierz dostępny termin:');
        setSlots(data.available_slots);
        setSelectedSlot(null);
        setPhase('booking');
      } else {
        addMessage('bot', data.answer || '');
      }
    } catch {
      addMessage('bot', 'Przepraszam, wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleSlotSelect = (slot: string) => {
    setSelectedSlot(slot);
    setPhase('contact');
  };

  const handleContactSubmit = async (info: string, type: 'email' | 'phone') => {
    if (!selectedSlot) return;
    setContactInfo(info);
    setIsTyping(true);

    try {
      const res = await fetch(CHATBOT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'book_appointment',
          session_id: sessionId.current,
          data: {
            datetime: selectedSlot,
            contact_info: info,
            contact_type: type,
          },
        }),
      });
      const data = await res.json();

      if (data.action_type === 'request_verification') {
        setAppointmentId(data.appointment_id);
        setPhase('verifying');
        addMessage('bot', data.answer || `Kod weryfikacyjny wysłany na ${info}`);
      } else {
        addMessage('bot', data.answer || data.error || 'Błąd rezerwacji, spróbuj ponownie.');
        setPhase('booking');
      }
    } catch {
      addMessage('bot', 'Błąd połączenia. Spróbuj ponownie.');
      setPhase('booking');
    } finally {
      setIsTyping(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (!appointmentId) return;
    setIsTyping(true);

    try {
      const res = await fetch(CHATBOT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_appointment',
          session_id: sessionId.current,
          data: {
            appointment_id: appointmentId,
            verification_code: code,
          },
        }),
      });
      const data = await res.json();

      if (data.action_type === 'confirmed') {
        setPhase('confirmed');
        addMessage('bot', data.answer || '✅ Spotkanie potwierdzone!');
        setTimeout(() => setPhase('chat'), 4000);
      } else {
        addMessage('bot', data.answer || '❌ Nieprawidłowy kod. Spróbuj ponownie.');
      }
    } catch {
      addMessage('bot', 'Błąd połączenia. Spróbuj ponownie.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const statusLabel = takenOver
    ? 'Konsultant online'
    : phase === 'booking'
    ? 'Wybierz termin'
    : phase === 'contact'
    ? 'Dane kontaktowe'
    : phase === 'verifying'
    ? 'Weryfikacja'
    : phase === 'confirmed'
    ? 'Potwierdzono!'
    : 'Online';

  const showInput = phase === 'chat' || phase === 'takeover';

  return (
    <>
      {/* FAB Button */}
      {!isOpen && !isAnimating && (
        <button
          onClick={animateOpen}
          className="fixed bottom-6 right-6 z-[100] w-14 h-14 rounded-full text-white flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
          style={{
            background: '#2563eb',
            boxShadow: '0 4px 24px rgba(37,99,235,0.35)',
          }}
          aria-label="Otwórz czat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
        </button>
      )}

      {/* Widget Window */}
      <div
        ref={widgetRef}
        style={{
          display: 'none',
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 100,
          width: '380px',
          height: '520px',
          background: '#18181b',
          borderRadius: '1rem',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        className="max-sm:!w-[calc(100vw-1rem)] max-sm:!h-[90vh] max-sm:!bottom-2 max-sm:!right-2"
      >
        {/* Header */}
        <div
          className="widget-header flex items-center justify-between px-4 py-3 transition-opacity duration-300"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="flex items-center gap-2">
            <Image
              src="/icon-logo-biale.png"
              alt="Stride"
              width={22}
              height={22}
              style={{ objectFit: 'contain' }}
            />
            <div>
              <p className="text-sm font-medium text-white leading-none">Stride Assistant</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-2 h-2 rounded-full bg-green-400"
                  style={{ animation: 'pulse-dot 2s infinite' }}
                />
                <span className="text-xs text-white/40">{statusLabel}</span>
              </div>
            </div>
          </div>
          <button
            onClick={animateClose}
            className="text-white/40 hover:text-white transition-colors p-1"
            aria-label="Zamknij czat"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Takeover banner */}
        {takenOver && (
          <div
            className="px-4 py-2 text-xs text-blue-300 text-center"
            style={{
              background: 'rgba(37,99,235,0.08)',
              borderBottom: '1px solid rgba(59,130,246,0.15)',
            }}
          >
            Rozmawiasz teraz z konsultantem Stride
          </div>
        )}

        {/* Messages */}
        <div
          className="widget-body widget-scroll flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 transition-opacity duration-300"
        >
          {messages.length === 0 && phase === 'chat' && (
            <div className="text-center text-white/30 text-sm py-8">
              Cześć! W czym mogę pomóc? 👋
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`widget-msg-animate flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={
                  msg.role === 'user'
                    ? { background: '#2563eb', color: '#fff' }
                    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.9)' }
                }
              >
                {msg.role === 'user' ? (
                  msg.text
                ) : (
                  <RenderMarkdown text={msg.text} />
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start widget-msg-animate">
              <div
                className="flex items-center gap-1 px-3.5 py-2.5 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <span className="widget-typing-dot" />
                <span className="widget-typing-dot" />
                <span className="widget-typing-dot" />
              </div>
            </div>
          )}

          {/* Slot picker */}
          {phase === 'booking' && slots.length > 0 && (
            <div className="widget-msg-animate">
              <SlotPicker
                slots={slots}
                selected={selectedSlot}
                onSelect={handleSlotSelect}
              />
            </div>
          )}

          {/* Contact form */}
          {phase === 'contact' && selectedSlot && (
            <ContactForm
              selectedSlot={selectedSlot}
              onSubmit={handleContactSubmit}
              onBack={() => setPhase('booking')}
            />
          )}

          {/* Verify form */}
          {phase === 'verifying' && (
            <VerifyForm
              contactInfo={contactInfo}
              onSubmit={handleVerify}
            />
          )}

          {/* Confirmed */}
          {phase === 'confirmed' && (
            <div className="widget-msg-animate text-center py-4 space-y-2">
              <div className="text-4xl">✅</div>
              <p className="text-sm font-medium text-white">Spotkanie potwierdzone!</p>
              <p className="text-xs text-white/40">Wrócimy do czatu za chwilę...</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Footer / Input */}
        {showInput && (
          <div
            className="widget-footer px-4 py-3 transition-opacity duration-300"
            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={takenOver ? 'Wiadomość do konsultanta...' : 'Napisz wiadomość...'}
                disabled={isTyping}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-blue-500/50 transition-colors disabled:opacity-50"
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-white transition-all active:scale-95 disabled:opacity-30"
                style={{ background: '#2563eb' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-center text-[10px] text-white/15 mt-1.5">
              Stride Services AI · <a href="/polityka-prywatnosci/" className="hover:text-white/30 transition-colors">Prywatność</a>
            </p>
          </div>
        )}
      </div>
    </>
  );
}
