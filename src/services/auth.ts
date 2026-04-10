import type { User as SupabaseUser } from "@supabase/supabase-js";
import { appEnv, isSupabaseConfigured } from "@/config/env";
import { supabase } from "@/lib/supabase";
import type {
  AuthProfile,
  ResetPasswordPayload,
  SignInPayload,
  UpdatePasswordPayload,
} from "@/types/auth";
import type { Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

const ensureSupabaseConfigured = () => {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase environment variables are missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to continue.",
    );
  }
};

const buildDisplayName = (user: SupabaseUser) => {
  const metadataName =
    typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata.name === "string"
        ? user.user_metadata.name
        : "";

  if (metadataName.trim()) {
    return metadataName.trim();
  }

  return user.email?.split("@")[0] || user.phone || "M Cube User";
};

export const buildFallbackProfile = (user: SupabaseUser): AuthProfile => ({
  id: user.id,
  email: user.email ?? "",
  fullName: buildDisplayName(user),
  role: user.user_metadata.role ?? "sales",
  isActive: true,
  phone: user.phone ?? null,
  avatarUrl:
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null,
});

const mapProfile = (profile: ProfileRow): AuthProfile => ({
  id: profile.id,
  email: profile.email ?? "",
  fullName: profile.full_name ?? profile.email ?? profile.phone ?? "M Cube User",
  role: profile.role,
  isActive: profile.is_active,
  phone: profile.phone,
  avatarUrl: profile.avatar_url,
});

export const fetchProfile = async (
  user: SupabaseUser,
): Promise<AuthProfile> => {
  ensureSupabaseConfigured();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, role, is_active, avatar_url, phone, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.warn(
      "Falling back to auth metadata because profile lookup failed.",
      error,
    );
    return buildFallbackProfile(user);
  }

  if (!data) {
    return buildFallbackProfile(user);
  }

  return mapProfile(data);
};

export const signInWithPassword = async (payload: SignInPayload) => {
  ensureSupabaseConfigured();
  const identifier = payload.identifier.trim();

  if (identifier.includes("@")) {
    return supabase.auth.signInWithPassword({
      email: identifier.toLowerCase(),
      password: payload.password,
    });
  }

  const phone = identifier.replace(/[^\d+]/g, "");
  return supabase.auth.signInWithPassword({
    phone,
    password: payload.password,
  });
};

export const signOutUser = async () => {
  ensureSupabaseConfigured();
  return supabase.auth.signOut();
};

export const sendPasswordReset = async ({ email }: ResetPasswordPayload) => {
  ensureSupabaseConfigured();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appEnv.appUrl}/auth/update-password`,
  });
};

export const updatePassword = async ({ password }: UpdatePasswordPayload) => {
  ensureSupabaseConfigured();
  return supabase.auth.updateUser({ password });
};
