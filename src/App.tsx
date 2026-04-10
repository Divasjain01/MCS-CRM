import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  ProtectedRoute,
  PublicOnlyRoute,
  RoleProtectedRoute,
} from "@/components/auth/RouteGuards";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AdminIntegrationsPage from "@/pages/admin/Integrations";
import AdminSettingsPage from "@/pages/admin/Settings";
import AdminUsersPage from "@/pages/admin/Users";
import DashboardPage from "@/pages/Dashboard";
import ForgotPasswordPage from "@/pages/ForgotPassword";
import ImportsPage from "@/pages/Imports";
import LeadDetailPage from "@/pages/LeadDetail";
import LeadsPage from "@/pages/Leads";
import LoginPage from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import PipelinePage from "@/pages/Pipeline";
import ProductsPage from "@/pages/Products";
import UnauthorizedPage from "@/pages/Unauthorized";
import UpdatePasswordPage from "@/pages/UpdatePassword";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicOnlyRoute>
                  <ForgotPasswordPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/" element={<RootRedirect />} />

            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/leads/pipeline" element={<PipelinePage />} />
              <Route path="/leads/:id" element={<LeadDetailPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/imports" element={<ImportsPage />} />
              <Route
                path="/admin/users"
                element={
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <AdminUsersPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/admin/integrations"
                element={
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <AdminIntegrationsPage />
                  </RoleProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <RoleProtectedRoute allowedRoles={["admin"]}>
                    <AdminSettingsPage />
                  </RoleProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
