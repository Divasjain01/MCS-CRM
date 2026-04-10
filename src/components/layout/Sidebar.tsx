import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Kanban,
  LayoutDashboard,
  LogOut,
  Package,
  Plug,
  Settings,
  Upload,
  UserCog,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Pipeline", href: "/leads/pipeline", icon: Kanban },
  { label: "Products", href: "/products", icon: Package },
  { label: "Imports", href: "/imports", icon: Upload },
];

const adminNavItems: NavItem[] = [
  { label: "Users", href: "/admin/users", icon: UserCog },
  { label: "Integrations", href: "/admin/integrations", icon: Plug },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobile = false,
  onNavigate,
}: SidebarProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isAdmin = profile?.role === "admin";

  const handleLogout = async () => {
    setIsSigningOut(true);

    try {
      await signOut();
    } finally {
      setIsSigningOut(false);
    }
  };

  const SidebarNavItem = ({ item }: { item: NavItem }) => {
    const isActive =
      location.pathname === item.href ||
      (item.href !== "/dashboard" && location.pathname.startsWith(item.href));

    return (
      <NavLink
        to={item.href}
        className={cn("nav-item group", isActive && "active")}
        onClick={onNavigate}
      >
        <item.icon
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            isActive
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
          )}
        />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </NavLink>
    );
  };

  return (
    <aside
      className={cn(
        "border-r border-sidebar-border gradient-sidebar transition-all duration-300",
        mobile
          ? "relative h-full w-full"
          : "fixed left-0 top-0 z-40 h-screen",
        mobile ? "w-full" : collapsed ? "w-[70px]" : "w-[260px]",
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            "flex h-16 items-center border-b border-sidebar-border px-4",
            collapsed ? "justify-center" : "justify-between",
          )}
        >
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
                <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-sidebar-foreground">M Cube Spaces</h1>
                <p className="text-xs text-sidebar-foreground/50">CRM Portal</p>
              </div>
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
              <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {!collapsed && (
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
                Main Menu
              </p>
            )}
            {mainNavItems.map((item) => (
              <SidebarNavItem key={item.href} item={item} />
            ))}
          </nav>

          {isAdmin && (
            <>
              <Separator className="my-4 bg-sidebar-border" />
              <nav className="space-y-1 px-3">
                {!collapsed && (
                  <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/40">
                    Administration
                  </p>
                )}
                {adminNavItems.map((item) => (
                  <SidebarNavItem key={item.href} item={item} />
                ))}
              </nav>
            </>
          )}
        </ScrollArea>

        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center px-2",
            )}
            onClick={() => void handleLogout()}
            disabled={isSigningOut}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="ml-3">{isSigningOut ? "Signing out..." : "Logout"}</span>
            )}
          </Button>
        </div>

        {!mobile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-20 h-6 w-6 rounded-full border border-sidebar-border bg-sidebar hover:bg-sidebar-accent"
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <ChevronRight className="h-3 w-3 text-sidebar-foreground" />
            ) : (
              <ChevronLeft className="h-3 w-3 text-sidebar-foreground" />
            )}
          </Button>
        )}
      </div>
    </aside>
  );
}
