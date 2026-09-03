import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, LogOut, Menu, X } from "lucide-react";
import {
  ADMIN_NAV_GROUPS,
  adminTabLabel,
  isTabAllowed,
  type AdminTab,
} from "@/lib/adminNav";
import type { AdminUser, PanelPermission } from "@/lib/adminSession";

const SIDEBAR_KEY = "niat_admin_sidebar_collapsed";

type Props = {
  activeTab: AdminTab;
  allowed: Array<PanelPermission | "access">;
  badges?: Partial<Record<AdminTab, number>>;
  user: AdminUser | null;
  actions?: ReactNode;
  onSelect: (tab: AdminTab) => void;
  onLogout: () => void;
};

const AdminSidebar = ({ activeTab, allowed, badges, user, actions, onSelect, onLogout }: Props) => {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SIDEBAR_KEY) === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    sessionStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const groups = ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => isTabAllowed(item.id, allowed)),
  })).filter((group) => group.items.length > 0);

  const select = (tab: AdminTab) => {
    onSelect(tab);
    setMobileOpen(false);
  };

  const nav = (compact: boolean) => (
    <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
      {groups.map((group) => (
        <div key={group.id}>
          {!compact && (
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = activeTab === item.id;
              const badge = badges?.[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  title={compact ? item.label : item.hint}
                  onClick={() => select(item.id)}
                  className={`relative w-full flex items-center gap-3 rounded-lg text-left transition-colors ${
                    compact ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
                  } ${
                    active
                      ? "bg-secondary/15 text-secondary"
                      : "text-white/55 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-secondary" : "text-white/40"}`} />
                  {!compact && (
                    <>
                      <span className="min-w-0 flex-1 text-[13px] font-semibold truncate">{item.label}</span>
                      {badge ? (
                        <span className="flex-shrink-0 min-w-[1.5rem] text-center text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary/20 text-secondary">
                          {badge.toLocaleString("en-IN")}
                        </span>
                      ) : null}
                    </>
                  )}
                  {compact && badge ? (
                    <span className="absolute top-1 right-1 min-w-[1.1rem] h-4 px-1 rounded-full bg-secondary text-[9px] font-bold text-[#1a0505] leading-4 text-center">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const footer = (compact: boolean) => (
    <div className={`border-t border-white/10 p-3 ${compact ? "flex flex-col items-center gap-2" : "space-y-2"}`}>
      {!compact && (
        <div className="px-1">
          <p className="text-xs font-semibold text-white truncate">{user?.name || user?.username || "Admin"}</p>
          <p className="text-[10px] text-white/35 truncate">
            {user?.role === "super_admin" ? "Super admin" : "Staff"}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={onLogout}
        title="Logout"
        className={`flex items-center gap-2 rounded-lg text-xs font-semibold text-white/50 hover:text-white hover:bg-white/[0.05] transition-colors ${
          compact ? "justify-center w-10 h-10" : "w-full px-3 py-2"
        }`}
      >
        <LogOut className="w-3.5 h-3.5" />
        {!compact && "Logout"}
      </button>
    </div>
  );

  const brand = (compact: boolean, withBorder = true) => (
    <div className={`flex items-center gap-3 ${withBorder ? "border-b border-white/10" : ""} ${compact ? "justify-center px-2 py-4" : "px-4 py-4"}`}>
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#8B1A1A] to-[#6B1212] ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
        <img src="/niat-logo-tight.webp" alt="NIAT" width={20} height={20} className="w-5 h-5 object-contain" />
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="font-heading text-sm font-bold text-white leading-tight">NIAT Admin</p>
          <p className="text-[10px] text-white/35 truncate">Educator Awards 2026</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 flex-shrink-0 border-r border-white/10 bg-[#100808] transition-[width] duration-200 ${
          collapsed ? "w-[76px]" : "w-[248px]"
        }`}
      >
        {brand(collapsed)}
        {nav(collapsed)}
        <div className={`px-2 pb-2 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-white/35 hover:text-white hover:bg-white/[0.05]"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>
        {footer(collapsed)}
      </aside>

      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-3 min-h-14 px-3 border-b border-white/10 bg-[#6B1212]/95 backdrop-blur-lg">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white/80 hover:bg-white/10"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <p className="font-heading text-sm font-bold text-white truncate">{adminTabLabel(activeTab)}</p>
            <p className="text-[10px] text-white/45 truncate">{user?.name || user?.username || "Admin"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
          <Link to="/" className="text-[11px] font-semibold text-white/55 hover:text-white">
            Site
          </Link>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            className="absolute inset-0 bg-black/70"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 flex flex-col w-[272px] max-w-[86vw] h-full bg-[#100808] border-r border-white/10 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pr-2">
              {brand(false, false)}
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white/50 hover:text-white"
                aria-label="Close navigation"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {nav(false)}
            {footer(false)}
          </aside>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;
