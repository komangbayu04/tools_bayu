"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseEnabled, primeCloudCache } from "@/lib/supabase";
import { rehydrateAllStores } from "@/lib/store";
import { Icon } from "@/components/ui/icon";

interface AuthContextValue {
  user: User | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  // "checking" = initial auth check; "hydrating" = loading store data post-login
  const [phase, setPhase] = useState<"checking" | "hydrating" | "ready">("checking");

  useEffect(() => {
    if (!supabase) {
      setPhase("ready");
      return;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session ?? null;
      setSession(s);
      if (s) {
        setPhase("hydrating");
        // One bulk fetch of all state, then rehydrate every store from cache.
        await primeCloudCache();
        await rehydrateAllStores();
      }
      setPhase("ready");
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      // Only re-hydrate when the user identity actually changes. Token refreshes
      // (hourly) and user-metadata updates keep the same data, so skipping them
      // avoids needlessly reloading every store and flashing the loading screen.
      if (event === "SIGNED_IN" && s) {
        setPhase("hydrating");
        await primeCloudCache();
        await rehydrateAllStores();
        setPhase("ready");
      } else if (event === "SIGNED_OUT") {
        setPhase("ready");
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
    if (typeof window !== "undefined") window.location.reload();
  };

  if (!supabaseEnabled) {
    return (
      <AuthContext.Provider value={{ user: null, signOut }}>{children}</AuthContext.Provider>
    );
  }

  if (phase === "checking") {
    return <LoadingScreen label="Memeriksa sesi…" />;
  }

  if (phase === "hydrating") {
    return <LoadingScreen label="Memuat data…" />;
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <AuthContext.Provider value={{ user: session.user, signOut }}>{children}</AuthContext.Provider>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4" style={{ background: "var(--color-global-bg)" }}>
      <div
        className="w-10 h-10 rounded-full border-2 animate-spin"
        style={{ borderColor: "var(--color-primary)", borderTopColor: "transparent" }}
      />
      <p className="text-[13px] font-medium" style={{ color: "var(--color-muted)" }}>{label}</p>
    </div>
  );
}

// ─── Login / Signup screen ────────────────────────────────────────
function LoginScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      // On success, onAuthStateChange flips the app to the dashboard.
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else if (data.session) {
        // Auto-confirmed → signed in immediately.
      } else {
        setInfo("Akun dibuat. Cek email untuk konfirmasi, lalu login.");
        setMode("login");
      }
    }
    setBusy(false);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-5"
      style={{ background: "var(--color-global-bg)" }}
    >
      <div className="w-full max-w-[380px]">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center shadow-sm">
            <span className="text-[var(--color-on-primary)] font-bold text-2xl leading-none">B</span>
          </div>
          <div>
            <h1 className="text-[20px] font-bold tracking-tight" style={{ color: "var(--color-ink)" }}>
              Bayu&apos;s Dashboard
            </h1>
            <p className="text-[13px] mt-1" style={{ color: "var(--color-muted)" }}>
              {mode === "login" ? "Masuk untuk melanjutkan" : "Buat akun baru"}
            </p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl p-6 flex flex-col gap-4"
          style={{ background: "var(--color-surface-card)", border: "1px solid var(--color-hairline)" }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold" style={{ color: "var(--color-muted)" }}>
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kamu@email.com"
              className="px-3.5 py-2.5 rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-hairline)",
                color: "var(--color-ink)",
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-semibold" style={{ color: "var(--color-muted)" }}>
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="px-3.5 py-2.5 rounded-xl text-[14px] outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-hairline)",
                color: "var(--color-ink)",
              }}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-[12.5px] rounded-lg px-3 py-2" style={{ background: "rgba(216,90,74,0.1)", color: "#D85A4A" }}>
              <Icon name="alert-triangle" size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}
          {info && (
            <div className="text-[12.5px] rounded-lg px-3 py-2" style={{ background: "var(--color-primary-light)", color: "var(--color-primary-ink)" }}>
              {info}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 py-2.5 rounded-xl text-[14px] font-semibold text-[var(--color-on-primary)] transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "var(--color-primary)" }}
          >
            {busy ? "Memproses…" : mode === "login" ? "Masuk" : "Daftar"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setError(null);
              setInfo(null);
            }}
            className="text-[12.5px] text-center transition-colors hover:underline"
            style={{ color: "var(--color-muted)" }}
          >
            {mode === "login" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
          </button>
        </form>
      </div>
    </div>
  );
}
