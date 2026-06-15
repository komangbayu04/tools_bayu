"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { useSitemapStore, type SitemapPage } from "@/lib/aiStore";

// ─── Types ─────────────────────────────────────────────────────────
type Role = "user" | "assistant";
interface Message {
  id: string;
  role: Role;
  content: string;
  action?: ChatAction;
  loading?: boolean;
}
interface ChatAction {
  type: "navigate" | "add_sitemap";
  url?: string;
  sitemap?: { name: string; pages: { name: string; sections: { name: string; description: string }[] }[] };
}

// ─── Suggested prompts ─────────────────────────────────────────────
const SUGGESTIONS = [
  "Buatkan sitemap untuk toko online fashion",
  "Buatkan sitemap untuk portofolio desainer",
  "Buka Design Assistant",
  "Apa saja fitur yang tersedia?",
];

// ─── Single chat message bubble ────────────────────────────────────
function MessageBubble({ msg, onActionClick }: { msg: Message; onActionClick: (action: ChatAction) => void }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}
    >
      {!isUser && (
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
        >
          <Icon name="sparkles" size={13} />
        </div>
      )}
      <div className="flex flex-col gap-1.5 max-w-[82%]">
        <div
          className="rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed"
          style={
            isUser
              ? { background: "var(--color-primary)", color: "var(--color-on-primary)" }
              : { background: "var(--color-canvas)", color: "var(--color-ink)", border: "1px solid var(--color-hairline)" }
          }
        >
          {msg.loading ? (
            <div className="flex gap-1 items-center py-0.5">
              {[0, 0.15, 0.3].map((d) => (
                <motion.div
                  key={d}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "var(--color-muted-soft)" }}
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ duration: 0.7, delay: d, repeat: Infinity }}
                />
              ))}
            </div>
          ) : (
            msg.content
          )}
        </div>

        {/* Action button */}
        {msg.action && !msg.loading && (
          <motion.button
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => onActionClick(msg.action!)}
            className="self-start flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold border transition hover:scale-[1.02]"
            style={{
              background: "var(--color-primary-light)",
              color: "var(--color-primary-ink)",
              borderColor: "var(--color-primary)",
            }}
          >
            <Icon
              name={msg.action.type === "navigate" ? "arrow-right" : "layout-grid"}
              size={12}
            />
            {msg.action.type === "navigate"
              ? "Buka Halaman"
              : `Lihat Sitemap "${msg.action.sitemap?.name}"`}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main floating chat ────────────────────────────────────────────
export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hei! Saya asisten AI kamu 👋 Bisa bantu buat sitemap, analisis desain, navigasi fitur, atau apapun yang kamu butuhkan.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { addSitemap } = useSitemapStore();

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const handleAction = useCallback((action: ChatAction) => {
    if (action.type === "navigate" && action.url) {
      router.push(action.url);
      setOpen(false);
    }
    if (action.type === "add_sitemap" && action.sitemap) {
      const pages: SitemapPage[] = action.sitemap.pages.map((p) => ({
        id: crypto.randomUUID(),
        name: p.name,
        sections: p.sections.map((s) => ({ id: crypto.randomUUID(), name: s.name, description: s.description })),
      }));
      addSitemap(action.sitemap.name, pages);
      router.push("/ai-studio/creative/sitemap");
      setOpen(false);
    }
  }, [router, addSitemap]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const loadingMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    // Build history for API (exclude welcome & loading)
    const history = [...messages, userMsg]
      .filter((m) => !m.loading && m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) =>
          prev.map((m) => m.id === loadingMsg.id ? { ...m, content: `Error: ${data.error}`, loading: false } : m)
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? { ...m, content: data.message ?? "", loading: false, action: data.action }
              : m
          )
        );
        if (!open) setUnread((n) => n + 1);
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) => m.id === loadingMsg.id ? { ...m, content: "Koneksi gagal. Coba lagi.", loading: false } : m)
      );
    } finally {
      setLoading(false);
    }
  }, [loading, messages, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-20 right-5 z-50 flex flex-col rounded-[22px] border overflow-hidden"
            style={{
              width: 360,
              height: 520,
              background: "var(--color-surface-card)",
              borderColor: "var(--color-hairline)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.18), 0 2px 12px rgba(0,0,0,0.08)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 border-b flex-shrink-0"
              style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}
            >
              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center"
                style={{ background: "var(--color-primary)" }}
              >
                <Icon name="sparkles" size={15} style={{ color: "var(--color-on-primary)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13.5px] font-bold" style={{ color: "var(--color-ink)" }}>AI Assistant</p>
                <p className="text-[11px]" style={{ color: "var(--color-muted-soft)" }}>Powered by GPT-4o</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-canvas)] transition"
                style={{ color: "var(--color-muted-soft)" }}
              >
                <Icon name="x" size={14} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} onActionClick={handleAction} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions (only when no user messages yet) */}
            {messages.filter((m) => m.role === "user").length === 0 && (
              <div className="px-4 pb-3 flex flex-wrap gap-1.5 flex-shrink-0">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-[11.5px] font-medium px-3 py-1.5 rounded-full border transition hover:bg-[var(--color-canvas)]"
                    style={{ borderColor: "var(--color-hairline)", color: "var(--color-muted)", background: "var(--color-surface)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div
              className="flex items-end gap-2 px-3 py-3 border-t flex-shrink-0"
              style={{ borderColor: "var(--color-hairline)", background: "var(--color-surface)" }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan… (Enter untuk kirim)"
                rows={1}
                disabled={loading}
                className="flex-1 resize-none rounded-[14px] border px-3.5 py-2.5 text-[13px] outline-none focus:ring-2 leading-relaxed"
                style={{
                  background: "var(--color-canvas)",
                  borderColor: "var(--color-hairline)",
                  color: "var(--color-ink)",
                  maxHeight: 96,
                  overflowY: "auto",
                }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 96) + "px";
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0 transition disabled:opacity-40"
                style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}
              >
                <Icon name={loading ? "spinner" : "send"} size={15} spin={loading} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating bubble button */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 w-13 h-13 rounded-[18px] flex items-center justify-center shadow-xl transition"
        style={{
          width: 52,
          height: 52,
          background: open ? "var(--color-ink)" : "var(--color-primary)",
          color: "var(--color-on-primary)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        aria-label="AI Chat"
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={open ? "close" : "open"}
            initial={{ scale: 0.7, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.7, opacity: 0, rotate: 30 }}
            transition={{ duration: 0.15 }}
          >
            <Icon name={open ? "x" : "sparkles"} size={20} />
          </motion.span>
        </AnimatePresence>

        {/* Unread badge */}
        {unread > 0 && !open && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: "#ef4444", color: "white" }}
          >
            {unread}
          </motion.span>
        )}
      </motion.button>
    </>
  );
}
