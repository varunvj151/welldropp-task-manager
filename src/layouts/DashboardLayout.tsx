import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  LineChart,
  User,
  LogOut,
  Menu,
  X,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
// @ts-ignore
import logoImg from "../assets/images/logo_1781876381313.jpg";
import InstallBanner from "../components/InstallBanner";

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar on tablet screen size and listen to window resize
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close mobile drawer when Escape key is pressed
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getSidebarItems = (): SidebarItem[] => {
    if (!user) return [];
    if (user.role === "admin") {
      return [
        { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
        { name: "Tasks", path: "/admin/tasks", icon: CheckSquare },
        { name: "Workers", path: "/admin/workers", icon: Users },
        { name: "Reports", path: "/admin/reports", icon: LineChart },
        { name: "Profile", path: "/admin/profile", icon: User },
      ];
    } else {
      return [
        { name: "Dashboard", path: "/worker/dashboard", icon: LayoutDashboard },
        { name: "My Tasks", path: "/worker/tasks", icon: CheckSquare },
        { name: "My Profile", path: "/worker/profile", icon: User },
      ];
    }
  };

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const sidebarItems = getSidebarItems();
  const currentPath = location.pathname;

  return (
    <div className="h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 flex overflow-hidden">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className={`hidden md:flex flex-col bg-slate-900 text-slate-100 flex-shrink-0 h-full transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-64"}`}>
        {/* Header (fixed) */}
        <div className="p-6 flex items-center justify-between gap-3 flex-shrink-0 border-b border-slate-800/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={logoImg}
              alt="WellDropp Logo"
              className="w-8 h-8 rounded-lg shrink-0 object-cover"
              referrerPolicy="no-referrer"
            />
            {!sidebarCollapsed && (
              <span className="text-xl font-bold text-white tracking-tight truncate">WellDropp</span>
            )}
          </div>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors hidden md:block cursor-pointer shrink-0"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation Section (scrolls independently) */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User / Logout Area (fixed at bottom) */}
        <div className="p-4 border-t border-slate-800 flex-shrink-0 bg-slate-950/20">
          <div className={`flex items-center gap-3 py-2 ${sidebarCollapsed ? "justify-center px-0" : "px-2"}`}>
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user?.name ? user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "DM"}
            </div>
            {!sidebarCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-white truncate">{user?.name || "Durgamani"}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold capitalize truncate leading-none mt-1">{user?.role || "Admin"}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`mt-2 w-full flex items-center gap-3 py-1.5 text-xs font-semibold rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer ${
              sidebarCollapsed ? "justify-center px-0" : "px-2"
            }`}
            title={sidebarCollapsed ? "Logout Session" : undefined}
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Logout Session</span>}
          </button>
        </div>
      </aside>

      {/* --- MOBILE DRAWERS --- */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black z-40 md:hidden"
            />
            {/* Side Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0.1, duration: 0.25 }}
              className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-100 z-50 flex flex-col md:hidden border-r border-slate-800 h-full"
            >
              <div className="p-6 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <img
                    src={logoImg}
                    alt="WellDropp Logo"
                    className="w-8 h-8 rounded-lg shrink-0 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-xl font-bold text-white tracking-tight">WellDropp</span>
                  <button
                    onClick={toggleTheme}
                    className="p-1 ml-1 rounded-xl text-slate-450 hover:bg-slate-805 hover:text-white transition-all cursor-pointer"
                    title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                    aria-label="Toggle Theme"
                  >
                    {theme === "light" ? (
                      <Moon className="w-4 h-4 text-indigo-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  <X className="w-5 h-5 cursor-pointer" />
                </button>
              </div>

              {/* Mobile scrollable navigation menu */}
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {sidebarItems.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-600 text-white font-semibold"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile pinned profile and logout bottom panel */}
              <div className="p-4 border-t border-slate-800 flex-shrink-0 bg-slate-950/20">
                <div className="flex items-center gap-3 px-2 py-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-xs">
                    {user?.name ? user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "DM"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-white truncate">{user?.name}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold capitalize truncate leading-none mt-1">{user?.role}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="mt-2 w-full flex items-center gap-3 px-2 py-1.5 text-xs font-semibold rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
                  Logout Session
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* --- CONTENT CONTAINER --- */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* TOP HEADER (fixed) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-8 flex items-center justify-between z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white capitalize truncate">
              {currentPath.split("/").pop()?.replace(/-/g, " ") || "WellDropp"}
            </h2>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:inline truncate">
              {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="hidden md:block p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-105 dark:hover:bg-slate-800 transition-all cursor-pointer"
              title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              aria-label="Toggle Theme"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5 text-indigo-600" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
            </button>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{user?.name}</p>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 capitalize leading-none">{user?.role}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {user?.name ? user.name[0] : "U"}
            </div>
          </div>
        </header>

        {/* CONTAINER OUTLET (scrolls independently) */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>

      {/* PWA Install Banner */}
      <InstallBanner />
    </div>
  );
}

