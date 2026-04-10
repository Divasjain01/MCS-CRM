import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function DashboardLayout() {
  const [isDark, setIsDark] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      </div>
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[280px] border-r p-0 sm:max-w-none md:hidden">
          <Sidebar
            collapsed={false}
            mobile
            onNavigate={() => setMobileSidebarOpen(false)}
            onToggleCollapse={() => undefined}
          />
        </SheetContent>
      </Sheet>
      <div
        className={cn(
          "transition-all duration-300",
          "md:min-h-screen",
          sidebarCollapsed ? "md:ml-[70px]" : "md:ml-[260px]",
        )}
      >
        <TopBar
          isDark={isDark}
          onThemeToggle={() => setIsDark((prev) => !prev)}
          onOpenMobileNav={() => setMobileSidebarOpen(true)}
        />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
