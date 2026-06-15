import { createClient } from "@supabase/supabase-js";
import type { StateStorage } from "zustand/middleware";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase is optional: if env vars are missing we fall back to localStorage so
 * the app still runs locally without a backend configured.
 */
export const supabaseEnabled = Boolean(url && key);

export const supabase = supabaseEnabled
  ? createClient(url!, key!, { auth: { persistSession: false } })
  : null;

// Single namespace key so every store lives under one app instance. When auth
// is added later this can become the authenticated user's id.
const APP_NAMESPACE = "bayu";

const storageKey = (name: string) => `${APP_NAMESPACE}:${name}`;

const localStorageAvailable = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

/**
 * A Zustand StateStorage backed by a single Supabase `app_state` (key → jsonb)
 * table. Reads/writes are async; Zustand's persist middleware handles the
 * async hydration. localStorage is used as a synchronous mirror so the UI has
 * data instantly on reload while the cloud copy syncs in the background.
 */
export const supabaseStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    // Serve the local mirror first for an instant paint.
    const mirror = localStorageAvailable() ? window.localStorage.getItem(name) : null;

    if (!supabase) return mirror;

    try {
      const { data, error } = await supabase
        .from("app_state")
        .select("value")
        .eq("key", storageKey(name))
        .maybeSingle();

      if (error) {
        console.warn("[supabase] getItem failed, using local mirror:", error.message);
        return mirror;
      }
      if (!data) return mirror; // nothing in cloud yet → keep local/seed data

      const serialized = JSON.stringify(data.value);
      if (localStorageAvailable()) window.localStorage.setItem(name, serialized);
      return serialized;
    } catch (e) {
      console.warn("[supabase] getItem threw, using local mirror:", e);
      return mirror;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    // Always keep the local mirror up to date for instant reloads.
    if (localStorageAvailable()) window.localStorage.setItem(name, value);

    if (!supabase) return;

    try {
      const { error } = await supabase.from("app_state").upsert(
        {
          key: storageKey(name),
          value: JSON.parse(value),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      if (error) console.warn("[supabase] setItem failed:", error.message);
    } catch (e) {
      console.warn("[supabase] setItem threw:", e);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    if (localStorageAvailable()) window.localStorage.removeItem(name);
    if (!supabase) return;
    try {
      await supabase.from("app_state").delete().eq("key", storageKey(name));
    } catch (e) {
      console.warn("[supabase] removeItem threw:", e);
    }
  },
};
