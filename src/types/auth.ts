import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import type { UserRole } from "@/types/crm";

export interface AuthProfile {
  id: string;
  email: string;
  loginUid?: string | null;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string | null;
  phone?: string | null;
}

export interface SignInPayload {
  identifier: string;
  password: string;
}

export interface ResetPasswordPayload {
  email: string;
}

export interface UpdatePasswordPayload {
  password: string;
}

export interface AuthContextValue {
  session: Session | null;
  authUser: SupabaseUser | null;
  profile: AuthProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (payload: ResetPasswordPayload) => Promise<void>;
  updatePassword: (payload: UpdatePasswordPayload) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
