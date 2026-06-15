"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/icon";
import { useSitemapStore, type SitemapPage } from "@/lib/aiStore";
import { useFinanceStore } from "@/lib/store";

// ─── Types ────────────────────────────────────────────────────────
type Role = "user" | "assistant";

interface TransactionPayload {
  type: "income" | "expense";
  amount: number;
  description: string;
  categoryId: string;
  date: string;
  month: string;
  note?: string;
}

interface SitemapPayload {
  name: string;
  pages: { name: string; sections: { name: string; description: string }[] }[];
}

interface ChatAction {
  type: "navigate" | "add_transaction" | "add_sitemap";
  url?: string;
  transaction?: TransactionPayload;
  sitemap?: SitemapPayload;
}

interface Message {
  id: string;
  role: Role;
  content: string;
  action?: ChatAction;
  actionDone?: boolean;
  loading?: boolean;
}

// ─── Formatters ───────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  c1: "Freelance", c2: "Project Bonus", c3: "Software & Tools",
  c4: "Food & Beverage", c5: "Transport", c6: "Housing",
  c7: "Health", c8: "Entertainment",
};

function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

// ─── Action confirmation card ─────────────────────────────────────
function ActionCard({ action, onNavigate }: { action: ChatAction; onNavigate: (url: string) => void }) {
  if (action.type === "add_transaction" && action.transaction) {
    const tx = action.transaction;
    const isExpense = tx.type === "expense";
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: isExpense ? "#fca5a5" : "#86efac", background: isExpense ? "#fef2f2" : "#f0fdf4" }}
      >
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b" style={{ borderColor: isExpense ? "#fca5a5" : "#86efac" }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: isExpense ? "#ef4444" : "#16a34a" }}>
            <Icon name={isExpense ? "arrow-down" : "arrow-up"} size={12} style={{ color: "white" }} />
          </div>
          <span className="text-[12px] font-bold" style={{ color: isExpense ? "#991b1b" : "#14532d" }}>
            {isExpense ? "Pengeluaran Dicatat ✓" : "Pemasukan Dicatat ✓"}
          </span>
        </div>
        <div className="px-3.5 py-2.5 flex flex-col gap-1">
          <p className="text-[18px] font-black" style={{ color: isExpense ? "#dc2626" : "#16a34a" }}>
            {isExpense ? "−" : "+"}{formatRupiah(tx.amount)}
          </p>
          <p className="text-[13px] font-semibold" style={{ color: isExpense ? "#7f1d1d" : "#14532d" }}>{tx.description}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: isExpense ? "#fee2e2" : "#dcfce7", color: isExpense ? "#b91c1c" : "#15803d" }}>
              {CATEGORY_LABELS[tx.categoryId] ?? tx.categoryId}
            </span>
            <span className="text-[11px]" style={{ color: isExpense ? "#b91c1c" : "#15803d" }}>{tx.date}</span>
          </div>
        </div>
        <button
          onClick={() => onNavigate("/finance")}
          className="flex items-center gap-1.5 px-3.5 py-2 w-full text-[12px] font-semibold border-t transition hover:opacity-80"
          style={{ borderColor: isExpense ? "#fca5a5" : "#86efac", color: isExpense ? "#dc2626" : "#16a34a" }}
        >
          <Icon name="arrow-right" size={11} /> Lihat di Finance
        </button>
      </motion.div>
    );
  }

  if (action.type === "add_sitemap" && action.sitemap) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border overflow-hidden"
        style={{ borderColor: "var(--color-primary)", background: "var(--color-primary-light)" }}
      >
        <div className="flex items-center gap-2 px-3.5 py-2.5 border-b" style={{ borderColor: "var(--color-primary)" }}>
          <Icon name="check-circle" size={15} style={{ color: "var(--color-primary-ink)" }} />
          <span className="text-[12px] font-bold" style={{ color: "var(--color-primary-ink)" }}>Sitemap Dibuat ✓</span>
        </div>
        <div className="px-3.5 py-2.5">
          <p className="text-[14px] font-bold mb-0.5" style={{ color: "var(--color-primary-ink)" }}>{action.sitemap.name}</p>
          <p className="text-[12px]" style={{ color: "var(--color-primary-ink)" }}>{action.sitemap.pages.length} halaman · {action.sitemap.pages.reduce((n, p) => n + p.sections.length, 0)} sections</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {action.sitemap.pages.slice(0, 5).map((p) => (
              <span key={p.name} className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--color-primary)", color: "var(--color-on-primary)" }}>{p.name}</span>
            ))}
          </div>
        </div>
        <button
          onClick={() => onNavigate("/ai-studio/creative/sitemap")}
          className="flex items-center gap-1.5 px-3.5 py-2 w-full text-[12px] font-semibold border-t transition hover:opacity-80"
          style={{ borderColor: "var(--color-primary)", color: "var(--color-primary-ink)" }}
        >
          <Icon name="arrow-right" size={11} /> Buka di Sitemap Generator
        </button>
      </motion.div>
    );
  }

  if (action.type === "navigate" && action.url) {
    return (
      <motion.button
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={() => onNavigate(action.url!)}
        className="self-start flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold border transition hover:scale-[1.02]"
        style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)", borderColor: "var(--color-primary)" }}
      >
        <Icon name="arrow-right" size={12} /> Buka Halaman
      </motion.button>
    );
  }

  return null;
}

// ─── Suggestions ──────────────────────────────────────────────────
const SUGGESTIONS = [
  "Tambah pengeluaran makan siang 35rb",
  "Catat pemasukan freelance 2jt",
  "Buatkan sitemap untuk coffee shop",
  "Apa saja yang bisa kamu lakukan?",
];

// ─── Message bubble ───────────────────────────────────────────────
function MessageBubble({ msg, onNavigate }: { msg: Message; onNavigate: (url: string) => void }) {
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
      <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"} max-w-[85%]`}>
        {msg.content && (
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
        )}
        {msg.action && !msg.loading && (
          <ActionCard action={msg.action} onNavigate={onNavigate} />
        )}
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hei! Saya asisten AI kamu 👋 Saya bisa langsung catat pengeluaran, buat sitemap, dan lainnya. Cukup ketik apa yang kamu mau.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { addSitemap } = useSitemapStore();
  const { addTransaction } = useFinanceStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const handleNavigate = useCallback((url: string) => {
    router.push(url);
    setOpen(false);
  }, [router]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const loadingMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setLoading(true);

    const history = [...messages, userMsg]
      .filter((m) => !m.loading && m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json() as { message?: string; error?: string; action?: ChatAction };

      if (data.error) {
        setMessages((prev) =>
          prev.map((m) => m.id === loadingMsg.id ? { ...m, content: `Error: ${data.error}`, loading: false } : m)
        );
      } else {
        // Execute actions client-side immediately
        if (data.action?.type === "add_transaction" && data.action.transaction) {
          addTransaction({ ...data.action.transaction, month: data.action.transaction.date.slice(0, 7) });
        }
        if (data.action?.type === "add_sitemap" && data.action.sitemap) {
          const pages: SitemapPage[] = data.action.sitemap.pages.map((p) => ({
            id: crypto.randomUUID(),
            name: p.name,
            sections: p.sections.map((s) => ({ id: crypto.randomUUID(), name: s.name, description: s.description })),
          }));
          addSitemap(data.action.sitemap.name, pages);
        }

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
  }, [loading, messages, open, addTransaction, addSitemap]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
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
              <div className="w-8 h-8 rounded-[10px] flex items-center justify-center" style={{ background: "var(--color-primary)" }}>
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
                <MessageBubble key={msg.id} msg={msg} onNavigate={handleNavigate} />
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
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

      {/* Floating bubble */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 flex items-center justify-center rounded-[18px] shadow-xl transition"
        style={{
          width: 52, height: 52,
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
