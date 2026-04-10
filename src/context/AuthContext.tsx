import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/config/env";
import { supabase } from "@/lib/supabase";
import {
  fetchProfile,
  sendPasswordReset as requestPasswordReset,
  signInWithPassword,
  signOutUser,
  updatePassword as updateUserPassword,
} from "@/services/auth";
import type {
  AuthContextValue,
  AuthProfile,
  ResetPasswordPayload,
  SignInPayload,
  UpdatePasswordPayload,
} from "@/types/auth";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hydrateProfile = useCallback(async (user: SupabaseUser | null) => {
    setAuthUser(user);

    if (!user) {
      setProfile(null);
      return;
    }

    if (!isSupabaseConfigured) {
      setProfile(null);
      return;
    }

    const nextProfile = await fetchProfile(user);
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const initialise = async () => {
      const {
        data: { session: nextSession },
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      setSession(nextSession);
      await hydrateProfile(nextSession?.user ?? null);

      if (isMounted) {
        setIsLoading(false);
      }
    };

    void initialise();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(true);

      void hydrateProfile(nextSession?.user ?? null).finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [hydrateProfile]);

  const signIn = useCallback(async (payload: SignInPayload) => {
    const { error } = await signInWithPassword(payload);

    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await signOutUser();

    if (error) {
      throw error;
    }
  }, []);

  const sendPasswordReset = useCallback(async (payload: ResetPasswordPayload) => {
    const { error } = await requestPasswordReset(payload);

    if (error) {
      throw error;
    }
  }, []);

  const updatePassword = useCallback(async (payload: UpdatePasswordPayload) => {
    const { error } = await updateUserPassword(payload);

    if (error) {
      throw error;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!authUser || !isSupabaseConfigured) {
      return;
    }

    const nextProfile = await fetchProfile(authUser);
    setProfile(nextProfile);
  }, [authUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authUser,
      profile,
      isAuthenticated: Boolean(session?.user),
      isAdmin: profile?.role === "admin",
      isLoading,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
    }),
    [
      authUser,
      isLoading,
      profile,
      refreshProfile,
      sendPasswordReset,
      session,
      signIn,
      signOut,
      updatePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
