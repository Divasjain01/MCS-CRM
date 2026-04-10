const trim = (value: string | undefined) => value?.trim() ?? "";

export const appEnv = {
  supabaseUrl: trim(import.meta.env.VITE_SUPABASE_URL),
  supabaseAnonKey: trim(import.meta.env.VITE_SUPABASE_ANON_KEY),
  appUrl: trim(import.meta.env.VITE_APP_URL) || window.location.origin,
};

export const isSupabaseConfigured =
  appEnv.supabaseUrl.length > 0 && appEnv.supabaseAnonKey.length > 0;
