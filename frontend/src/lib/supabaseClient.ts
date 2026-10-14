import { createClient, SupabaseClient, User, Session } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

const normalizeSupabaseUrl = (url: string): string => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) return "";
    return parsed.origin;
  } catch {
    return "";
  }
};

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== "your-project-url" &&
    supabaseAnonKey !== "your-anon-key" &&
    supabaseUrl.includes(".supabase.co")
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Sign up with email, password, and optional full name via Supabase Auth
 */
export async function supabaseSignUp(email: string, password: string, fullName?: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || "",
      },
    },
  });
  if (error) throw error;
  return data;
}

/**
 * Sign in with email and password via Supabase Auth
 */
export async function supabaseSignIn(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out active user
 */
export async function supabaseSignOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Send password reset email
 */
export async function supabaseResetPassword(email: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/#reset-password` : undefined;
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  if (error) throw error;
  return data;
}

/**
 * Update password (e.g. after clicking reset link)
 */
export async function supabaseUpdatePassword(newPassword: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
  return data;
}

/**
 * Retrieve current active session
 */
export async function getSupabaseSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Retrieve current user
 */
export async function getSupabaseUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}
