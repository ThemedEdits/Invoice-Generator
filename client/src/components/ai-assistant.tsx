import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useGroq } from "@/hooks/use-groq";
import { cn } from "@/lib/utils";
import {
  Sparkles, X, Send, Trash2, Loader2,
  ChevronDown, Bot, User,
} from "lucide-react";

const SUGGESTIONS = [
  "How do I create my first invoice template?",
  "Write professional line items for web design",
  "What payment terms should I use?",
  "Explain the invoice statuses in Invote",
];

export function AiAssistant() {
  const [open, setOpen]   = useState(false);
  const [input, setInput] = useState("");
  const { messages, loading, error, sendMessage, clearChat } = useGroq();

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current   && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    await sendMessage(text);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── Chat panel ──────────────────────────────────────────────────── */}
      <div
        ref={panelRef}
        className={cn(
          "fixed right-6 z-[999]",
          "w-[380px] max-w-[calc(100vw-3rem)]",
          "bg-[#0d0f14] border border-white/[0.08] rounded-2xl",
          "shadow-2xl shadow-black/60",
          "flex flex-col overflow-hidden",
          "transition-all duration-300 origin-bottom-right",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none",
        )}
        style={{
          bottom:    "5.5rem",
          maxHeight: "min(520px, calc(100vh - 7rem))",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-none">Invote Assistant</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Powered by Groq · Llama 3.3</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="Clear chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 min-h-0">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-white mb-1">How can I help?</p>
              <p className="text-xs text-slate-500 mb-5">
                Ask me anything about Invote, invoicing, or billing.
              </p>
              <div className="flex flex-col gap-2 w-full">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="text-left text-xs text-slate-400 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 hover:border-amber-400/30 hover:text-amber-400 hover:bg-amber-400/5 transition-all duration-150"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-2.5",
                msg.role === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                msg.role === "user"
                  ? "bg-amber-400/20 border border-amber-400/30"
                  : "bg-white/[0.06] border border-white/[0.08]",
              )}>
                {msg.role === "user"
                  ? <User className="w-3 h-3 text-amber-400" />
                  : <Bot  className="w-3 h-3 text-slate-400" />
                }
              </div>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-amber-400/15 border border-amber-400/20 text-amber-50 rounded-tr-sm"
                  : "bg-white/[0.04] border border-white/[0.06] text-slate-300 rounded-tl-sm",
              )}>
                <ReactMarkdown
  components={{
    p:      ({ children }: { children: React.ReactNode }) => <p className="mb-1 last:mb-0">{children}</p>,
    strong: ({ children }: { children: React.ReactNode }) => <strong className="text-white font-semibold">{children}</strong>,
    em:     ({ children }: { children: React.ReactNode }) => <em className="text-slate-300">{children}</em>,
    ul:     ({ children }: { children: React.ReactNode }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
    ol:     ({ children }: { children: React.ReactNode }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
    li:     ({ children }: { children: React.ReactNode }) => <li className="text-xs">{children}</li>,
    code:   ({ children }: { children: React.ReactNode }) => <code className="bg-white/10 rounded px-1 py-0.5 text-amber-300 font-mono text-[10px]">{children}</code>,
    h1:     ({ children }: { children: React.ReactNode }) => <p className="font-bold text-white mb-1">{children}</p>,
    h2:     ({ children }: { children: React.ReactNode }) => <p className="font-bold text-white mb-1">{children}</p>,
    h3:     ({ children }: { children: React.ReactNode }) => <p className="font-semibold text-slate-200 mb-0.5">{children}</p>,
  }}
>
  {msg.text}
</ReactMarkdown>
              </div>
            </div>
          ))}

          {/* Loading */}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                <Bot className="w-3 h-3 text-slate-400" />
              </div>
              <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 text-center bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 pb-3 pt-3 flex-shrink-0 border-t border-white/[0.06]">
          <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 focus-within:border-amber-400/40 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about Invote or invoicing…"
              rows={1}
              className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none resize-none max-h-24 leading-relaxed"
              style={{ scrollbarWidth: "none" }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className={cn(
                "flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200",
                input.trim() && !loading
                  ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
                  : "bg-white/[0.06] text-slate-600 cursor-not-allowed",
              )}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[9px] text-slate-600 text-center mt-2">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* ── Floating trigger ────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        aria-label="Open AI Assistant"
        className={cn(
          "fixed bottom-6 right-6 z-[1000]",
          "w-14 h-14 rounded-full flex items-center justify-center",
          "bg-amber-400 text-slate-900",
          "shadow-lg shadow-amber-400/30",
          "hover:bg-amber-300 hover:scale-110 active:scale-95",
          "transition-all duration-200",
        )}
      >
        {open
          ? <ChevronDown className="w-5 h-5" />
          : <Sparkles    className="w-5 h-5" />
        }
      </button>
    </>
  );
}