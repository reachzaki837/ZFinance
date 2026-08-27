import { useState, useRef, useEffect } from "react";
import { SendHorizonal, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { chatResponses } from "@/data/mockData";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

const SUGGESTIONS = [
  "Why did costs rise last week?",
  "Which category had the highest spend?",
  "What was our best revenue week?",
  "Are there any anomalies I should worry about?",
];

const FALLBACK_RESPONSE =
  "Based on your financial data for the current week, everything looks within normal parameters. Revenue is trending upward at 12.4% week-over-week, and expense growth remains controlled at 3.1%. Would you like a deeper dive into any specific category?";

export function AskZFinance() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function sendMessage(text: string) {
    if (!text.trim() || typing) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const response = chatResponses[text.trim()] || FALLBACK_RESPONSE;
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "ai", content: response };
      setMessages((prev) => [...prev, aiMsg]);
      setTyping(false);
    }, 1500);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-112px)] max-w-3xl mx-auto">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {isEmpty && !typing ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, var(--color-success)))" }}
            >
              <Sparkles size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-[var(--font-display)] text-[var(--color-ink)] mb-1">
                Ask anything about your finances
              </h2>
              <p className="text-sm text-[var(--color-muted)]">
                Your financial data stays local — nothing is sent to external servers.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-sm px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all duration-200 font-[var(--font-display)]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) =>
              msg.role === "user" ? (
                <div key={msg.id} className="flex justify-end">
                  <div
                    className="max-w-[72%] px-4 py-3 rounded-2xl rounded-tr-sm text-sm font-[var(--font-body)] text-white leading-relaxed"
                    style={{ background: "var(--color-accent)" }}
                  >
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex justify-start">
                  <div className="flex items-start gap-3 max-w-[82%]">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, var(--color-success)))" }}
                    >
                      <Sparkles size={14} className="text-white" />
                    </div>
                    <Card className="flex-1 px-4 py-3 text-sm text-[var(--color-ink)] leading-relaxed font-[var(--font-body)]">
                      {msg.content}
                    </Card>
                  </div>
                </div>
              )
            )}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "linear-gradient(135deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 60%, var(--color-success)))" }}
                  >
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <Card className="px-4 py-3">
                    <div className="flex gap-1.5 items-center h-4">
                      <span className="dot-bounce" />
                      <span className="dot-bounce" />
                      <span className="dot-bounce" />
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips (when there are messages) */}
      {!isEmpty && (
        <div className="flex flex-wrap gap-1.5 py-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              disabled={typing}
              className="text-xs px-3 py-1.5 rounded-xl border border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all duration-200 font-[var(--font-display)] disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="pb-4 pt-2">
        <div className="flex gap-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-2 card-shadow">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            placeholder="Ask about your finances…"
            className="flex-1 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] focus:outline-none px-2 font-[var(--font-body)]"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || typing}
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--color-accent)" }}
          >
            <SendHorizonal size={15} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
