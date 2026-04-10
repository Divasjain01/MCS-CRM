import { createClient } from "@supabase/supabase-js";
import { appEnv } from "@/config/env";
import type { Database } from "@/types/database";

const fallbackUrl = "https://placeholder.supabase.co";
const fallbackAnonKey =
  "placeholder-anon-key-placeholder-anon-key-placeholder";

export const supabase = createClient<Database>(
  appEnv.supabaseUrl || fallbackUrl,
  appEnv.supabaseAnonKey || fallbackAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
