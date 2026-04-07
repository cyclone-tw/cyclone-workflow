import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  thoughts?: string[];
  timestamp: Date;
  isError?: boolean;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'agent',
  content: '歡迎回來！我是 Cyclone 管家，有什麼我能幫您的嗎？ 🏠',
  timestamp: new Date(),
};

const USER_ID = 'user-' + Math.random().toString(36).slice(2, 9);

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleThoughts = (id: string) => {
    setExpandedThoughts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userId: USER_ID }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: data.reply,
        thoughts: data.thoughts,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: '抱歉，目前無法連線。請稍後再試。',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(18, 18, 42, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--color-border)',
        maxHeight: '600px',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏠</span>
          <div>
            <h2 className="font-bold text-base" style={{ color: 'var(--color-text-primary)' }}>
              Cyclone 管家
            </h2>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              共學團專屬 AI 管家
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--color-neon-green)' }}
          />
          <span className="text-xs" style={{ color: 'var(--color-neon-green)' }}>
            線上
          </span>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: '380px' }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'agent' && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base"
                style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
              >
                👩‍💼
              </div>
            )}

            <div className={`flex flex-col gap-1 max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                style={
                  msg.role === 'user'
                    ? {
                        background: 'var(--color-primary)',
                        color: '#fff',
                        borderBottomRightRadius: '4px',
                      }
                    : msg.isError
                    ? {
                        background: 'rgba(233, 69, 96, 0.15)',
                        border: '1px solid rgba(233, 69, 96, 0.4)',
                        color: 'var(--color-accent-light)',
                        borderBottomLeftRadius: '4px',
                      }
                    : {
                        background: 'var(--color-bg-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-primary)',
                        borderBottomLeftRadius: '4px',
                      }
                }
              >
                {msg.content}
              </div>

              {/* Thoughts toggle */}
              {msg.role === 'agent' && msg.thoughts && msg.thoughts.length > 0 && (
                <div className="w-full">
                  <button
                    onClick={() => toggleThoughts(msg.id)}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors"
                    style={{
                      color: 'var(--color-text-muted)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <span>{expandedThoughts.has(msg.id) ? '▲' : '▼'}</span>
                    <span>{expandedThoughts.has(msg.id) ? '收起思考過程' : '查看思考過程'}</span>
                  </button>
                  {expandedThoughts.has(msg.id) && (
                    <div
                      className="mt-1.5 px-3 py-2 rounded-xl text-xs space-y-1"
                      style={{
                        background: 'rgba(108, 99, 255, 0.08)',
                        border: '1px solid rgba(108, 99, 255, 0.2)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {msg.thoughts.map((t, i) => (
                        <p key={i}>• {t}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <span className="text-xs px-1" style={{ color: 'var(--color-text-muted)' }}>
                {msg.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base"
              style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border)' }}
            >
              👩‍💼
            </div>
            <div
              className="px-4 py-3 rounded-2xl"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid var(--color-border)',
                borderBottomLeftRadius: '4px',
              }}
            >
              <div className="flex gap-1 items-center">
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--color-text-muted)', animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--color-text-muted)', animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ background: 'var(--color-text-muted)', animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="px-4 py-3 border-t flex items-center gap-3"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="跟管家說點什麼..."
          className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors disabled:opacity-50"
          style={{
            background: 'var(--color-bg-dark)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="flex items-center justify-center w-10 h-10 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: 'var(--color-primary)',
            color: '#fff',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
