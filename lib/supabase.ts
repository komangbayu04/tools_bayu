import { createClient } from "@supabase/supabase-js";
import type { StateStorage } from "zustand/middleware";

// The publishable (anon) key + project URL are safe to ship in the client
// bundle — they're public by design and data is protected by Row Level
// Security. Env vars take precedence so other environments can override.
const FALLBACK_URL = "https://frqwamdqfnuvihmregja.supabase.co";
const FALLBACK_ANON_KEY = "sb_publishable_N07WAghUlpHLaK2ydAqooA_6v7Xvbxb";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;

/**
 * Supabase is optional: if env vars are missing we fall back to localStorage so
 * the app still runs locally without a backend configured.
 */
export const supabaseEnabled = Boolean(url && key);

export const supabase = supabaseEnabled
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ─── Auth-aware state ─────────────────────────────────────────────
// Every store is scoped to the currently signed-in user. We resolve the auth
// session once and expose a promise so the storage adapter can wait for it
// before reading/writing (avoids a race where a store hydrates as "logged out"
// during the initial session check).

let currentUserId: string | null = null;
let resolveReady: () => void;
const userReady = new Promise<void>((r) => {
  resolveReady = r;
});

if (supabase) {
  supabase.auth
    .getSession()
    .then(({ data }) => {
      currentUserId = data.session?.user?.id ?? null;
    })
    .finally(() => resolveReady());

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUserId = session?.user?.id ?? null;
  });
} else {
  resolveReady!();
}

const localStorageAvailable = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

// localStorage mirror key is namespaced per-user so two accounts on the same
// browser never see each other's cached data.
const mirrorKey = (name: string) => `${currentUserId ?? "anon"}:${name}`;

/**
 * A Zustand StateStorage backed by a Supabase `app_state` (user_id + key →
 * jsonb) table, scoped to the signed-in user. Reads/writes are async; Zustand's
 * persist middleware handles async hydration. A per-user localStorage mirror
 * gives the UI instant data on reload while the cloud copy syncs.
 */
export const supabaseStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    await userReady;

    const mirror = localStorageAvailable() ? window.localStorage.getItem(mirrorKey(name)) : null;

    // Not signed in (or no backend): use the local mirror only.
    if (!supabase || !currentUserId) return mirror;

    try {
      const { data, error } = await supabase
        .from("app_state")
        .select("value")
        .eq("user_id", currentUserId)
        .eq("key", name)
        .maybeSingle();

      if (error) {
        console.warn("[supabase] getItem failed, using local mirror:", error.message);
        return mirror;
      }
      if (!data) return mirror; // nothing in cloud yet → keep local/seed data

      const serialized = JSON.stringify(data.value);
      if (localStorageAvailable()) window.localStorage.setItem(mirrorKey(name), serialized);
      return serialized;
    } catch (e) {
      console.warn("[supabase] getItem threw, using local mirror:", e);
      return mirror;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    await userReady;

    if (localStorageAvailable()) window.localStorage.setItem(mirrorKey(name), value);

    // Don't write to the cloud when there's no signed-in user.
    if (!supabase || !currentUserId) return;

    try {
      const { error } = await supabase.from("app_state").upsert(
        {
          user_id: currentUserId,
          key: name,
          value: JSON.parse(value),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,key" }
      );
      if (error) console.warn("[supabase] setItem failed:", error.message);
    } catch (e) {
      console.warn("[supabase] setItem threw:", e);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    await userReady;
    if (localStorageAvailable()) window.localStorage.removeItem(mirrorKey(name));
    if (!supabase || !currentUserId) return;
    try {
      await supabase.from("app_state").delete().eq("user_id", currentUserId).eq("key", name);
    } catch (e) {
      console.warn("[supabase] removeItem threw:", e);
    }
  },
};
