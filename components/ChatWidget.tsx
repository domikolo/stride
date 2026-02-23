'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = 'chat' | 'booking_confirm' | 'booking' | 'contact' | 'verifying' | 'confirmed' | 'takeover';

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

// Initial collapsed dimensions (same for all screen sizes)
const BTN_WIDTH_PX  = 35;
const BTN_HEIGHT_PX = 115;

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
    return new Date(slot).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
  } catch { return slot; }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('pl-PL', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  } catch { return dateStr; }
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

function inlineMd(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>');
}

function RenderMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  type LT = 'ul' | 'ol';
  let listType: LT | null = null;
  let listItems: string[] = [];
  let tableRows: string[][] = [];
  let tableHasHeader = false;
  let key = 0;

  const parseTableRow = (line: string): string[] =>
    line.split('|').slice(1, -1).map(cell => cell.trim());

  const isTabelSep = (line: string) => /^\|[\s\-:\|]+\|$/.test(line);
  const isTableRow = (line: string) => line.startsWith('|') && line.endsWith('|');

  const flushTable = () => {
    if (!tableRows.length) return;
    const headerRow = tableHasHeader ? tableRows[0] : null;
    const bodyRows = tableHasHeader ? tableRows.slice(1) : tableRows;
    elements.push(
      <div key={key++} style={{ overflowX: 'auto', margin: '6px 0' }}>
        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
          {headerRow && (
            <thead>
              <tr>
                {headerRow.map((cell, i) => (
                  <th key={i} style={{ padding: '5px 10px', textAlign: 'left', color: '#d4d4d8', fontWeight: 600, background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.12)' }}
                      dangerouslySetInnerHTML={{ __html: inlineMd(cell) }} />
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {bodyRows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: '5px 10px', color: '#a1a1aa' }}
                      dangerouslySetInnerHTML={{ __html: inlineMd(cell) }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    tableHasHeader = false;
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    const Tag = listType;
    const cls = listType === 'ul' ? 'list-disc pl-4 my-1 space-y-0.5' : 'list-decimal pl-4 my-1 space-y-0.5';
    elements.push(
      <Tag key={key++} className={cls}>
        {listItems.map((item, i) => (
          <li key={i} dangerouslySetInnerHTML={{ __html: inlineMd(item) }} />
        ))}
      </Tag>
    );
    listType = null; listItems = [];
  };

  for (const line of lines) {
    const t = line.trim();

    if (isTableRow(t)) {
      if (isTabelSep(t)) { tableHasHeader = true; continue; }
      flushList();
      tableRows.push(parseTableRow(t));
      continue;
    }

    if (tableRows.length) flushTable();

    if (/^[-*]\s+/.test(t)) {
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(t.replace(/^[-*]\s+/, '')); continue;
    }
    if (/^\d+\.\s+/.test(t)) {
      if (listType !== 'ol') { flushList(); listType = 'ol'; }
      listItems.push(t.replace(/^\d+\.\s+/, '')); continue;
    }
    flushList();
    if (!t) { elements.push(<div key={key++} className="h-1" />); continue; }
    elements.push(<p key={key++} dangerouslySetInnerHTML={{ __html: inlineMd(t) }} />);
  }
  flushList();
  flushTable();
  return <>{elements}</>;
}

// ── CalendarPicker ──────────────────────────────────────────────────────────

const MONTH_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];
const DAY_PL   = ['Pn','Wt','Śr','Cz','Pt','So','Nd'];

function CalendarPicker({ slots, onSelect }: {
  slots: string[];
  onSelect: (s: string) => void;
}) {
  const slotsByDay = groupSlotsByDay(slots);
  const availableDates = new Set(Object.keys(slotsByDay));

  const firstAvailable = slots[0] ? new Date(slots[0].split('T')[0] + 'T00:00:00') : new Date();
  const [month, setMonth] = useState(new Date(firstAvailable.getFullYear(), firstAvailable.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year  = month.getFullYear();
  const mon   = month.getMonth();
  const today = new Date(); today.setHours(0,0,0,0);

  const pad = (n: number) => String(n).padStart(2, '0');
  const dateKey = (d: number) => `${year}-${pad(mon + 1)}-${pad(d)}`;

  // cells: null = padding, number = day
  const firstDow = new Date(year, mon, 1).getDay();
  const startPad = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const canPrev = new Date(year, mon - 1, 1) >= new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => { setMonth(new Date(year, mon - 1, 1)); setSelectedDay(null); }}
          disabled={!canPrev}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 disabled:opacity-20"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
        >‹</button>
        <span className="text-xs font-medium text-zinc-300">{MONTH_PL[mon]} {year}</span>
        <button
          onClick={() => { setMonth(new Date(year, mon + 1, 1)); setSelectedDay(null); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
        >›</button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_PL.map(d => (
          <div key={d} className="text-center text-[10px] text-zinc-600 py-0.5">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const key = dateKey(day);
          const isAvailable = availableDates.has(key);
          const isPast = new Date(year, mon, day) < today;
          const isToday = new Date(year, mon, day).getTime() === today.getTime();
          const isSelected = selectedDay === key;
          const clickable = isAvailable && !isPast;

          return (
            <button
              key={i}
              onClick={() => clickable && setSelectedDay(key)}
              disabled={!clickable}
              className="relative flex flex-col items-center justify-center rounded-lg transition-all duration-150"
              style={{
                height: '32px',
                fontSize: '12px',
                background: isSelected ? 'rgba(59,130,246,0.3)' : isAvailable && !isPast ? 'rgba(255,255,255,0.04)' : 'transparent',
                border: isSelected ? '1px solid rgba(59,130,246,0.6)' : isAvailable && !isPast ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
                color: isSelected ? '#93c5fd' : isPast ? '#3f3f46' : isAvailable ? '#e4e4e7' : '#52525b',
                cursor: clickable ? 'pointer' : 'default',
                fontWeight: isToday ? 600 : 400,
              }}
            >
              {day}
              {isToday && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-400 opacity-60" />}
            </button>
          );
        })}
      </div>

      {/* Time slots for selected day */}
      {selectedDay && slotsByDay[selectedDay] && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] text-zinc-600 mb-2 capitalize">{formatDate(selectedDay)} — wybierz godzinę:</p>
          <div className="flex flex-wrap gap-1.5">
            {slotsByDay[selectedDay].map(slot => (
              <button
                key={slot}
                onClick={() => onSelect(slot)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                style={{
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  color: '#93c5fd',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; }}
              >
                {formatTime(slot)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ContactForm ────────────────────────────────────────────────────────────

function ContactForm({ selectedSlot, onSubmit, onBack }: {
  selectedSlot: string;
  onSubmit: (info: string, type: 'email' | 'phone') => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState('');
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [error, setError] = useState('');

  const dateLabel = (() => {
    try {
      return new Date(selectedSlot).toLocaleString('pl-PL', {
        weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      });
    } catch { return selectedSlot; }
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) { setError('Podaj e-mail lub telefon.'); return; }
    if (contactType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setError('Nieprawidłowy e-mail.'); return;
    }
    if (contactType === 'phone' && !/^[\d\s\+\-\(\)]{7,}$/.test(v)) {
      setError('Nieprawidłowy numer.'); return;
    }
    setError('');
    onSubmit(v, contactType);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl px-3.5 py-2.5 text-sm" style={{ background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.04)' }}>
        <p className="text-xs text-zinc-600 mb-0.5">Wybrany termin</p>
        <p className="text-zinc-200 capitalize">{dateLabel}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div className="flex gap-2">
          {(['email', 'phone'] as const).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => { setContactType(t); setValue(''); setError(''); }}
              className="flex-1 py-1.5 rounded-lg text-xs transition-all duration-150"
              style={{
                background: contactType === t ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
                border: contactType === t ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.08)',
                color: contactType === t ? '#93c5fd' : '#71717a',
              }}
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
          autoFocus
          className="w-full outline-none text-sm text-white placeholder-zinc-600"
          style={{
            padding: '10px 14px',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            background: '#1a1a1e',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.3)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <p className="text-xs text-zinc-700">Wyślemy kod potwierdzający.</p>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="px-3 py-2 rounded-lg text-xs text-zinc-600 transition-all duration-150"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Wróć
          </button>
          <button
            type="submit"
            className="flex-1 py-2 rounded-lg text-xs font-medium text-white transition-all duration-150"
            style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
          >
            Potwierdź termin
          </button>
        </div>
      </form>
    </div>
  );
}

// ── VerifyForm ─────────────────────────────────────────────────────────────

function VerifyForm({ contactInfo, onSubmit }: {
  contactInfo: string;
  onSubmit: (code: string) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(v)) { setError('Podaj 6-cyfrowy kod.'); return; }
    setError('');
    onSubmit(v);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-600 text-center">
        Kod wysłany na <span className="text-zinc-400">{contactInfo}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
          placeholder="123456"
          autoFocus
          className="w-full outline-none text-center text-xl tracking-[0.4em] font-mono text-white placeholder-zinc-700"
          style={{
            padding: '10px 14px',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px',
            background: '#1a1a1e',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.3)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; }}
        />
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}
        <button
          type="submit"
          className="w-full py-2 rounded-lg text-xs font-medium text-white transition-all duration-150"
          style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.3)' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; }}
        >
          Potwierdź
        </button>
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
  const sessionId = useRef('');

  useEffect(() => { sessionId.current = getSessionId(); }, []);

  useEffect(() => () => {
    animTimers.current.forEach(clearTimeout);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, phase]);

  useEffect(() => {
    if (!isTyping && phase === 'chat') {
      inputRef.current?.focus();
    }
  }, [isTyping, phase]);

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
          body: JSON.stringify({ action: 'poll', conversation_id: sessionId.current, last_seen_timestamp: lastSeenTs }),
        });
        const data = await res.json();
        if (data.messages?.length) {
          const newMsgs: Message[] = data.messages.map((m: { text: string; timestamp: number }) => ({
            role: 'agent' as const, text: m.text, ts: m.timestamp,
          }));
          setMessages(prev => [...prev, ...newMsgs]);
          setLastSeenTs(data.messages[data.messages.length - 1].timestamp);
        }
        if (!data.taken_over) { setTakenOver(false); setPhase('chat'); }
      } catch { /* ignore */ }
    }, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [takenOver, lastSeenTs]);

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

    widget.style.setProperty('height', `${BTN_HEIGHT_PX}px`, 'important');
    widget.style.setProperty('width', `${BTN_WIDTH_PX}px`, 'important');
    widget.style.setProperty('transform', 'translateY(-50%) translateX(40px)', 'important');
    widget.style.setProperty('transition', 'none', 'important');
    widget.style.setProperty('display', 'flex', 'important');
    widget.style.setProperty('box-shadow', 'none', 'important');

    const header = widget.querySelector('.widget-header') as HTMLElement | null;
    const body = widget.querySelector('.widget-body') as HTMLElement | null;
    const footer = widget.querySelector('.widget-footer') as HTMLElement | null;
    const closeBtn = widget.querySelector('.close-btn') as HTMLElement | null;
    if (header) header.style.opacity = '0';
    if (body) body.style.opacity = '0';
    if (footer) footer.style.opacity = '0';
    if (closeBtn) closeBtn.style.opacity = '0';

    void widget.offsetWidth;

    // Step 1: slide in from right (250ms)
    scheduleTimer(() => {
      widget.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.77,0,0.18,1)', 'important');
      widget.style.setProperty('transform', 'translateY(-50%) translateX(0)', 'important');
    }, 10);

    // Step 2: expand width — keep transform in transition so it doesn't snap
    scheduleTimer(() => {
      widget.style.setProperty('transition', 'width 0.5s cubic-bezier(0.77,0,0.18,1), transform 0.5s cubic-bezier(0.77,0,0.18,1)', 'important');
      widget.style.setProperty('width', 'var(--cw-width)', 'important');
    }, 260);

    // Step 3: expand height — keep width in transition so it doesn't snap
    scheduleTimer(() => {
      widget.style.setProperty('transition', 'height 0.5s cubic-bezier(0.77,0,0.18,1), width 0.5s cubic-bezier(0.77,0,0.18,1), box-shadow 0.6s ease-out', 'important');
      widget.style.setProperty('height', 'var(--cw-height)', 'important');
      widget.style.setProperty('box-shadow', '0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)', 'important');
    }, 510);

    scheduleTimer(() => {
      setIsAnimating(false);
      setIsOpen(true);
      if (header) header.style.opacity = '1';
      if (body) body.style.opacity = '1';
      if (footer) footer.style.opacity = '1';
      if (closeBtn) closeBtn.style.opacity = '1';
      widget.style.removeProperty('transition');
      setTimeout(() => inputRef.current?.focus(), 50);
    }, 1010);
  };

  const animateClose = () => {
    if (isAnimating || !isOpen) return;
    animTimers.current.forEach(clearTimeout);
    animTimers.current = [];
    setIsAnimating(true);

    const widget = widgetRef.current;
    if (!widget) return;

    const header = widget.querySelector('.widget-header') as HTMLElement | null;
    const body = widget.querySelector('.widget-body') as HTMLElement | null;
    const footer = widget.querySelector('.widget-footer') as HTMLElement | null;
    const closeBtn = widget.querySelector('.close-btn') as HTMLElement | null;
    if (header) header.style.opacity = '0';
    if (body) body.style.opacity = '0';
    if (footer) footer.style.opacity = '0';
    if (closeBtn) closeBtn.style.opacity = '0';

    // Step 1: collapse height + fade shadow
    widget.style.setProperty('transition', 'height 0.5s cubic-bezier(0.77,0,0.18,1), box-shadow 0.4s ease-out', 'important');
    widget.style.setProperty('height', `${BTN_HEIGHT_PX}px`, 'important');
    widget.style.setProperty('box-shadow', 'none', 'important');

    // Step 2: slide out — keep height in transition
    scheduleTimer(() => {
      widget.style.setProperty('transition', 'transform 0.5s cubic-bezier(0.77,0,0.18,1), height 0.5s cubic-bezier(0.77,0,0.18,1)', 'important');
      widget.style.setProperty('transform', 'translateY(-50%) translateX(40px)', 'important');
    }, 250);

    // Step 3: collapse width — keep transform in transition
    scheduleTimer(() => {
      widget.style.setProperty('transition', 'width 0.5s cubic-bezier(0.77,0,0.18,1), transform 0.5s cubic-bezier(0.77,0,0.18,1)', 'important');
      widget.style.setProperty('width', `${BTN_WIDTH_PX}px`, 'important');
    }, 500);

    scheduleTimer(() => {
      setIsOpen(false);
      setIsAnimating(false);
      widget.style.setProperty('display', 'none', 'important');
      widget.style.removeProperty('height');
      widget.style.removeProperty('transform');
      widget.style.removeProperty('transition');
      widget.style.removeProperty('width');
      widget.style.removeProperty('box-shadow');
      if (header) header.style.removeProperty('opacity');
      if (body) body.style.removeProperty('opacity');
      if (footer) footer.style.removeProperty('opacity');
    }, 1000);
  };

  const addMessage = (role: Message['role'], text: string) =>
    setMessages(prev => [...prev, { role, text, ts: Date.now() }]);

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
      if (data.taken_over) { setTakenOver(true); setPhase('takeover'); return; }
      if (data.action_type === 'show_booking_button' && data.available_slots?.length) {
        addMessage('bot', data.answer || '');
        setSlots(data.available_slots);
        setSelectedSlot(null);
        setPhase('booking_confirm');
      } else {
        addMessage('bot', data.answer || '');
      }
    } catch {
      addMessage('bot', 'Przepraszam, wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setIsTyping(false);
    }
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
          data: { datetime: selectedSlot, contact_info: info, contact_type: type },
        }),
      });
      const data = await res.json();
      if (data.action_type === 'request_verification') {
        setAppointmentId(data.appointment_id);
        setPhase('verifying');
        addMessage('bot', data.answer || `Kod wysłany na ${info}`);
      } else {
        addMessage('bot', data.answer || data.error || 'Błąd rezerwacji.');
        setPhase('booking');
      }
    } catch {
      addMessage('bot', 'Błąd połączenia.'); setPhase('booking');
    } finally { setIsTyping(false); }
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
          data: { appointment_id: appointmentId, verification_code: code },
        }),
      });
      const data = await res.json();
      if (data.action_type === 'confirmed') {
        setPhase('confirmed');
        addMessage('bot', data.answer || '✅ Spotkanie potwierdzone!');
        setTimeout(() => setPhase('chat'), 4000);
      } else {
        addMessage('bot', data.answer || '❌ Nieprawidłowy kod.');
      }
    } catch {
      addMessage('bot', 'Błąd połączenia.');
    } finally { setIsTyping(false); }
  };

  const showInput = phase === 'chat' || phase === 'takeover';
  const showBookingBtn = phase === 'booking_confirm';

  return (
    <>
      {/* Pill button — vertical center right, same as admin panel */}
      <button
        id="floating-chat-btn"
        onClick={() => isOpen ? animateClose() : animateOpen()}
        className="group fixed pointer-events-auto"
        style={{
          top: '50%',
          right: 'var(--cw-right)',
          transform: 'translateY(-50%)',
          width: 'var(--cw-btn-width)',
          height: 'var(--cw-btn-height)',
          background: '#111113',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 'var(--cw-btn-radius)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
          fontSize: 0,
          zIndex: 2003,
          cursor: 'pointer',
          transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease-out',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
        }}
      >
        {/* Three dots on hover */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10"
            style={{ width: '23px', height: '62px', background: 'rgba(255,255,255,0.08)', borderRadius: '11px' }}
          />
          {[0, 1, 2].map(i => (
            <span key={i} className="block rounded-full z-10" style={{ width: '11px', height: '11px', margin: '3.5px 0', background: 'rgba(255,255,255,0.6)' }} />
          ))}
        </div>
      </button>

      {/* Chat Widget — same position as admin panel */}
      <div
        ref={widgetRef}
        id="chat-widget-floating"
        style={{
          display: 'none',
          position: 'fixed',
          top: '50%',
          right: 'var(--cw-widget-right)',
          transform: 'translateY(-50%)',
          background: '#111113',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          overflow: 'hidden',
          flexDirection: 'column',
          zIndex: 2000,
        }}
      >
        {/* Header */}
        <div
          className="widget-header flex items-center justify-between px-5 py-3 transition-opacity duration-300"
          style={{ background: '#09090b', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2.5">
            <Image src="/icon-logo-biale.png" alt="Stride" width={40} height={40} style={{ objectFit: 'contain' }} />
            <div>
              <span className="text-sm font-semibold text-white">Stride Assistant</span>
              <span className="text-xs text-zinc-600 block leading-tight">
                {takenOver ? 'Konsultant online' : 'Zapytaj o chatbota'}
              </span>
            </div>
          </div>
        </div>

        {/* Takeover banner */}
        {takenOver && (
          <div className="px-4 py-2 text-xs text-blue-400 text-center" style={{ background: 'rgba(37,99,235,0.08)', borderBottom: '1px solid rgba(59,130,246,0.12)' }}>
            Rozmawiasz teraz z konsultantem Stride
          </div>
        )}

        {/* Body */}
        <div
          className="widget-body px-5 py-4 transition-opacity duration-300"
          style={{ flex: 1, overflowY: 'auto', scrollBehavior: 'smooth', background: 'transparent' }}
        >
          <div className="flex flex-col gap-3">
            {/* Empty state */}
            {messages.length === 0 && phase === 'chat' && !isTyping && (
              <div className="flex flex-col items-center justify-center text-center py-6">
                <p className="text-zinc-600 text-xs">Zapytaj mnie o cokolwiek</p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed"
                  style={{
                    maxWidth: '85%',
                    lineHeight: '1.5',
                    background: '#1a1a1e',
                    border: msg.role === 'user' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.04)',
                    color: msg.role === 'user' ? '#ffffff' : '#e4e4e7',
                  }}
                >
                  {msg.role === 'user' ? msg.text : <RenderMarkdown text={msg.text} />}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="self-start rounded-xl px-3 py-2 flex gap-1.5" style={{ background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.04)' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}

            {/* Calendar picker */}
            {phase === 'booking' && slots.length > 0 && (
              <div className="rounded-xl p-3" style={{ background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.04)' }}>
                <CalendarPicker slots={slots} onSelect={s => { setSelectedSlot(s); setPhase('contact'); }} />
              </div>
            )}

            {/* Contact form */}
            {phase === 'contact' && selectedSlot && (
              <ContactForm selectedSlot={selectedSlot} onSubmit={handleContactSubmit} onBack={() => setPhase('booking')} />
            )}

            {/* Verify form */}
            {phase === 'verifying' && (
              <VerifyForm contactInfo={contactInfo} onSubmit={handleVerify} />
            )}

            {/* Confirmed */}
            {phase === 'confirmed' && (
              <div className="text-center py-4 space-y-2">
                <div className="text-3xl">✅</div>
                <p className="text-sm text-zinc-300">Spotkanie potwierdzone!</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Booking confirm footer */}
        {showBookingBtn && (
          <div
            className="widget-footer p-4 transition-opacity duration-300"
            style={{ background: '#09090b', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex gap-2">
              <button
                onClick={() => setPhase('booking')}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200"
                style={{ background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.35)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)'; }}
              >
                Umów spotkanie
              </button>
              <button
                onClick={() => setPhase('chat')}
                className="px-4 py-2.5 rounded-xl text-sm text-zinc-500 transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#a1a1aa'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#71717a'; }}
              >
                Może później
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {showInput && (
          <div
            className="widget-footer p-4 transition-opacity duration-300"
            style={{ background: '#09090b', borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2.5">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={takenOver ? 'Wiadomość do konsultanta...' : 'Wpisz pytanie...'}
                disabled={isTyping}
                autoComplete="off"
                className="flex-1 outline-none text-white text-sm disabled:opacity-50"
                style={{
                  padding: '10px 14px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '10px',
                  background: '#1a1a1e',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.3)'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="submit"
                disabled={isTyping || !inputValue.trim()}
                className="flex items-center justify-center transition-all duration-200 disabled:opacity-30"
                style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', background: '#1a1a1e', color: '#a1a1aa', cursor: 'pointer' }}
                onMouseEnter={e => { if (!isTyping && inputValue.trim()) { e.currentTarget.style.background = '#3b82f6'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#fff'; } }}
                onMouseLeave={e => { e.currentTarget.style.background = '#1a1a1e'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#a1a1aa'; }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                </svg>
              </button>
            </form>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={animateClose}
          className="close-btn absolute top-2.5 right-2.5 w-7 h-7 rounded-lg flex items-center justify-center z-10 transition-all duration-200"
          style={{ background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', opacity: 0 }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="#71717a">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>

    </>
  );
}
