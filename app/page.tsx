'use client';

import { useState, useRef, useEffect } from 'react';

const CHATBOT_API = process.env.NEXT_PUBLIC_CHATBOT_API || '';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sentBy?: string;
}

function generateSessionId() {
  return 'web-' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
}

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [takenOver, setTakenOver] = useState(false);
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('stride_session_id');
      if (stored) return stored;
      const id = generateSessionId();
      sessionStorage.setItem('stride_session_id', id);
      return id;
    }
    return generateSessionId();
  });
  const [lastSeenTs, setLastSeenTs] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for agent messages during takeover
  useEffect(() => {
    if (takenOver && CHATBOT_API) {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(CHATBOT_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'poll',
              conversation_id: sessionId,
              last_seen_timestamp: lastSeenTs,
            }),
          });
          const data = await res.json();
          const body = typeof data.body === 'string' ? JSON.parse(data.body) : data;

          if (body.messages?.length > 0) {
            const newMsgs: Message[] = body.messages.map((m: { role: string; text: string; sent_by?: string; timestamp?: number }) => ({
              role: 'assistant' as const,
              text: m.text,
              sentBy: m.sent_by || '',
            }));
            setMessages((prev) => [...prev, ...newMsgs]);
            const maxTs = Math.max(...body.messages.map((m: { timestamp?: number }) => m.timestamp || 0));
            if (maxTs > 0) setLastSeenTs(maxTs);
          }

          if (!body.taken_over) {
            setTakenOver(false);
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 2500);

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  }, [takenOver, sessionId, lastSeenTs]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !CHATBOT_API) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const res = await fetch(CHATBOT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          conversation_id: sessionId,
        }),
      });
      const data = await res.json();
      const body = typeof data.body === 'string' ? JSON.parse(data.body) : data;

      if (body.taken_over) {
        setTakenOver(true);
        setLastSeenTs(Math.floor(Date.now() / 1000));
      } else if (body.answer) {
        setMessages((prev) => [...prev, { role: 'assistant', text: body.answer }]);
      }
    } catch (e) {
      console.error('Chat error:', e);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Przepraszam, wystąpił błąd. Spróbuj ponownie.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />

      {/* Content */}
      <main className="relative z-10 text-center px-6">
        <div className="mb-4">
          <span className="text-sm font-medium text-blue-400 tracking-widest uppercase">
            Stride Services
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          <span className="bg-gradient-to-r from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            AI Chatboty
          </span>
          <br />
          <span className="text-zinc-500">dla Twojej firmy</span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Spersonalizowane chatboty AI, które rozumieją Twoich klientów,
          odpowiadają na pytania i umawiają spotkania — 24/7.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="mailto:jakub@stride-services.com"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            Kontakt
          </a>
          <button
            onClick={() => setChatOpen(true)}
            className="px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] rounded-lg text-sm font-medium transition-colors border border-white/[0.08]"
          >
            Porozmawiaj z botem
          </button>
        </div>
      </main>

      {/* Chat widget */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center shadow-lg shadow-blue-600/20 transition-transform hover:scale-105"
          aria-label="Otwórz czat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
        </button>
      )}

      {chatOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-zinc-900 rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium">
                {takenOver ? 'Rozmawiasz z konsultantem' : 'Stride Assistant'}
              </span>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Takeover indicator */}
          {takenOver && (
            <div className="px-4 py-2 bg-blue-600/10 border-b border-blue-500/20 text-xs text-blue-400 text-center">
              Rozmawiasz z konsultantem Stride
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-zinc-500 text-sm py-8">
                Cześć! Jak mogę Ci pomóc?
              </div>
            )}
            {messages.map((msg, i) => {
              const isAgent = msg.sentBy?.startsWith('agent:');
              return (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : isAgent
                          ? 'bg-blue-500/10 text-zinc-200 rounded-bl-sm border border-blue-500/20'
                          : 'bg-white/[0.06] text-zinc-300 rounded-bl-sm'
                    }`}
                  >
                    {isAgent && (
                      <span className="text-[10px] text-blue-400 block mb-0.5">Konsultant</span>
                    )}
                    {msg.text}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.06] px-4 py-2 rounded-xl rounded-bl-sm text-zinc-500 text-sm">
                  <span className="animate-pulse">Pisanie...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/[0.06]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Napisz wiadomość..."
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
