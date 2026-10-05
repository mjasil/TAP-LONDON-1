"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

async function callNova(userMessage: string, history: Message[]): Promise<string> {
  try {
    const res = await fetch("/api/nova", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage, history }),
    });
    const data = await res.json();
    if (data?.reply) return data.reply;
    return "No reply received. Please try again.";
  } catch (e: any) {
    return `Connection error: ${e.message}`;
  }
}

export default function NovaAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm NOVA 🗺️ Ask me about places, food or plans in London. Tell me your area and interests for better suggestions." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const reply = await callNova(userMsg.content, messages);
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection issue. Try again! 🗺️" }]);
    } finally {
      setLoading(false);
    }
  }

  const quickQuestions = [
    "Halal food in central London?",
    "How do I use the Tube?",
    "Hidden gems in London?",
    "What events are confirmed this weekend?",
  ];

  return (
    <>

      <button className="nova-btn" onClick={() => setOpen(v => !v)} aria-label="Open NOVA AI">
        <img src="/ailogo.png" alt="NOVA" style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={e => { (e.currentTarget as any).style.display="none"; (e.currentTarget.nextSibling as any).style.display="flex"; }} />
        <div style={{ display: "none", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: "1.5rem" }}>🗺️</div>
      </button>

      {open && (
        <div className="nova-popup">
          {/* Header */}
          <div className="nova-header">
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(201,168,76,0.2)", border: "2px solid #c9a84c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>🗺️</div>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontWeight: 700, color: "#c9a84c" }}>NOVA</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.66rem", color: "rgba(255,255,255,0.5)" }}>TAP LONDON AI Guide</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", width: "30px", height: "30px", borderRadius: "50%", cursor: "pointer", fontSize: "1rem" }}>✕</button>
          </div>

          {/* Messages */}
          <div className="nova-messages">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "nova-msg-user" : "nova-msg-ai"}>
                {m.content.split(/(https?:\/\/[^\s]+)/g).map((part, j) =>
                  part.startsWith('https://') ? <a key={j} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#a8842f', textDecoration: 'underline', overflowWrap: 'anywhere' }}>{part}</a> : part
                )}
              </div>
            ))}
            {loading && (
              <div className="nova-msg-ai">
                <div className="nova-typing">
                  <div className="nova-dot" />
                  <div className="nova-dot" />
                  <div className="nova-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && !loading && (
            <div className="nova-quick">
              {quickQuestions.map(q => (
                <button key={q} className="nova-quick-btn" onClick={() => { setInput(q); inputRef.current?.focus(); }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="nova-input-row">
            <input
              ref={inputRef}
              className="nova-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Ask anything about London..."
            />
            <button className="nova-send" onClick={sendMessage} disabled={loading || !input.trim()}>
              {loading ? "⏳" : "➤"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
