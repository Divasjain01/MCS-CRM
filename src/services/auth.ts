import type { User as SupabaseUser } from "@supabase/supabase-js";
import { appEnv, isSupabaseConfigured } from "@/config/env";
import { normalizeLoginId } from "@/lib/auth-identifiers";
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
  loginUid:
    typeof user.user_metadata.login_uid === "string"
      ? user.user_metadata.login_uid
      : null,
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
  loginUid: profile.login_uid,
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
      "id, email, login_uid, full_name, role, is_active, avatar_url, phone, created_at, updated_at",
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

  if (!identifier) {
    throw new Error("Enter your email or user ID.");
  }

  let email = identifier.toLowerCase();

  if (!identifier.includes("@")) {
    const normalizedLoginUid = normalizeLoginId(identifier);

    if (!normalizedLoginUid) {
      throw new Error("Enter a valid user ID.");
    }

    const { data, error } = await supabase.rpc("resolve_login_email", {
      requested_login_uid: normalizedLoginUid,
    });

    if (error) {
      throw error;
    }

    if (!data || typeof data !== "string") {
      throw new Error("No active account was found for that user ID.");
    }

    email = data.toLowerCase();
  }

  return supabase.auth.signInWithPassword({
    email,
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
