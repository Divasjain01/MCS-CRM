import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { UserRole } from "@/types/crm";
import { Button } from "@/components/ui/button";

function FullScreenState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          {icon}
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function AuthLoadingScreen() {
  return (
    <FullScreenState
      icon={<Loader2 className="h-6 w-6 animate-spin text-primary" />}
      title="Loading your workspace"
      description="Checking your session and preparing the CRM."
    />
  );
}

export function AuthSetupScreen() {
  return (
    <FullScreenState
      icon={<ShieldAlert className="h-6 w-6 text-warning" />}
      title="Supabase setup is required"
      description="Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables to enable authentication."
    />
  );
}

export function InactiveAccountScreen() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning/10">
          <ShieldAlert className="h-6 w-6 text-warning" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Account inactive</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account is currently inactive. Please contact an administrator to restore access.
          </p>
        </div>
        <Button variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (profile && !profile.isActive) {
    return <InactiveAccountScreen />;
  }

  return <>{children}</>;
}

export function RoleProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles: UserRole[];
}) {
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (profile && !profile.isActive) {
    return <InactiveAccountScreen />;
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
