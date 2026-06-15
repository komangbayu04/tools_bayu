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
    // The cache belongs to a specific user; drop it so the next prime refetches.
    cloudCache = null;
  });
} else {
  resolveReady!();
}

const localStorageAvailable = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

// Writing to the localStorage mirror must NEVER abort cloud persistence. A large
// store (e.g. moodboard with base64 media) can exceed the ~5MB quota and throw
// QuotaExceededError — if that bubbled up it would prevent the cloud write and
// silently lose data. We swallow it: the cloud copy remains the source of truth.
const safeLocalSet = (key: string, value: string): void => {
  if (!localStorageAvailable()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    console.warn("[supabase] localStorage mirror write skipped (quota?):", e);
  }
};

// localStorage mirror key is namespaced per-user so two accounts on the same
// browser never see each other's cached data.
const mirrorKey = (name: string) => `${currentUserId ?? "anon"}:${name}`;

// ─── Bulk cloud cache ─────────────────────────────────────────────
// All of a user's state lives in many `app_state` rows. Reading them one key
// at a time means one network round-trip per store (14+) on every login, which
// dominates load time. Instead we fetch every row in a SINGLE query up front
// and serve subsequent per-store reads from this in-memory cache.
let cloudCache: Map<string, string> | null = null;

export function resetCloudCache() {
  cloudCache = null;
}

export async function primeCloudCache(): Promise<void> {
  await userReady;
  const cache = new Map<string, string>();
  if (!supabase || !currentUserId) {
    cloudCache = cache;
    return;
  }
  try {
    const { data, error } = await supabase
      .from("app_state")
      .select("key, value")
      .eq("user_id", currentUserId);
    if (error) {
      console.warn("[supabase] primeCloudCache failed, falling back to mirror:", error.message);
      cloudCache = cache;
      return;
    }
    for (const row of data ?? []) {
      const serialized = JSON.stringify((row as { value: unknown }).value);
      const k = (row as { key: string }).key;
      cache.set(k, serialized);
      safeLocalSet(mirrorKey(k), serialized);
    }
  } catch (e) {
    console.warn("[supabase] primeCloudCache threw, falling back to mirror:", e);
  }
  cloudCache = cache;
}

// ─── Media uploads (Supabase Storage) ─────────────────────────────
// Large binary media (moodboard images/videos) must NOT live inside the
// key-value JSON blob — it bloats every read and can exceed storage limits.
// Upload it to a Storage bucket and keep only the public URL in app_state.
// Returns null on any failure so callers can fall back to inline base64.
const MEDIA_BUCKET = "moodboard";

export async function uploadMedia(file: File): Promise<string | null> {
  await userReady;
  if (!supabase || !currentUserId) return null;
  try {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${currentUserId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (error) {
      console.warn("[supabase] uploadMedia failed, will fall back to base64:", error.message);
      return null;
    }
    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return data?.publicUrl ?? null;
  } catch (e) {
    console.warn("[supabase] uploadMedia threw, will fall back to base64:", e);
    return null;
  }
}

// ─── Debounced cloud writes ───────────────────────────────────────
// The localStorage mirror is updated synchronously (instant local persistence),
// while cloud upserts for the same key are coalesced so a burst of edits (e.g.
// dragging a layer, typing) becomes a single network write.
const WRITE_DEBOUNCE_MS = 500;
const writeTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingWrites = new Map<string, string>();

async function flushWrite(name: string): Promise<void> {
  const value = pendingWrites.get(name);
  writeTimers.delete(name);
  pendingWrites.delete(name);
  if (value === undefined || !supabase || !currentUserId) return;
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
}

// Flush any queued writes before the tab is hidden/closed so nothing is lost.
if (typeof window !== "undefined") {
  const flushAll = () => {
    for (const name of Array.from(pendingWrites.keys())) {
      const t = writeTimers.get(name);
      if (t) clearTimeout(t);
      void flushWrite(name);
    }
  };
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushAll();
  });
  window.addEventListener("pagehide", flushAll);
}

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

    // Served from the single bulk fetch — no per-store network round-trip.
    if (cloudCache) return cloudCache.get(name) ?? mirror;

    // Cache not primed yet (rare): fall back to a single-key fetch.
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
      safeLocalSet(mirrorKey(name), serialized);
      return serialized;
    } catch (e) {
      console.warn("[supabase] getItem threw, using local mirror:", e);
      return mirror;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    await userReady;

    // Instant local persistence + keep the in-memory cache coherent.
    // The in-memory cache always holds the full value even if the localStorage
    // mirror is skipped due to quota, so reads within the session stay complete.
    safeLocalSet(mirrorKey(name), value);
    cloudCache?.set(name, value);

    // Don't write to the cloud when there's no signed-in user.
    if (!supabase || !currentUserId) return;

    // Coalesce bursts of writes to the same key into one debounced upsert.
    pendingWrites.set(name, value);
    const existing = writeTimers.get(name);
    if (existing) clearTimeout(existing);
    writeTimers.set(name, setTimeout(() => void flushWrite(name), WRITE_DEBOUNCE_MS));
  },

  removeItem: async (name: string): Promise<void> => {
    await userReady;
    if (localStorageAvailable()) window.localStorage.removeItem(mirrorKey(name));
    cloudCache?.delete(name);
    const t = writeTimers.get(name);
    if (t) clearTimeout(t);
    writeTimers.delete(name);
    pendingWrites.delete(name);
    if (!supabase || !currentUserId) return;
    try {
      await supabase.from("app_state").delete().eq("user_id", currentUserId).eq("key", name);
    } catch (e) {
      console.warn("[supabase] removeItem threw:", e);
    }
  },
};
