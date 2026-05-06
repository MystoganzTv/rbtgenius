import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bot,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { translateUi } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";

const primaryTabs = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Practice", icon: HelpCircle, page: "Practice" },
  { name: "Exams", icon: ClipboardCheck, page: "MockExams" },
  { name: "Flashcards", icon: Sparkles, page: "Flashcards" },
  { name: "More", icon: MoreHorizontal, page: null },
];

const moreItems = [
  { name: "AI Tutor", icon: Bot, page: "AITutor", badge: "AI" },
  { name: "Analytics", icon: BarChart3, page: "Analytics" },
  { name: "Pricing", icon: CreditCard, page: "Pricing" },
];

export default function MobileLayout({ children, currentPageName }) {
  const location = useLocation();
  const { language } = useLanguage();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close "More" drawer on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  // Haptic feedback on tab press (Capacitor)
  const triggerHaptic = async () => {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Not running in Capacitor — ignore
    }
  };

  const primaryPageNames = new Set(primaryTabs.map((t) => t.page).filter(Boolean));
  const morePageNames = new Set(moreItems.map((t) => t.page));
  const activeTab =
    primaryPageNames.has(currentPageName)
      ? currentPageName
      : morePageNames.has(currentPageName)
        ? "More"
        : "Dashboard";

  return (
    <div className="mobile-shell">
      {/* Status bar spacer */}
      <div className="mobile-status-bar" />

      {/* Top bar */}
      <header className="mobile-topbar">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#1E5EFF]">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
              RBT{" "}
              <span className="text-[#1E5EFF]">Genius</span>
            </span>
          </div>
        </div>
        <div className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
          {user?.email?.split("@")[0] ?? "Student"}
        </div>
      </header>

      {/* Main scrollable content */}
      <main className="mobile-content">
        {children}
      </main>

      {/* "More" drawer overlay */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="mobile-more-drawer">
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <span className="text-[17px] font-bold text-slate-900 dark:text-white">
                More
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
              >
                <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <div className="px-4 pb-4 grid grid-cols-3 gap-3">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPageName === item.page;
                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={triggerHaptic}
                    className={cn(
                      "more-grid-item",
                      isActive && "more-grid-item--active",
                    )}
                  >
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl mb-2",
                      isActive
                        ? "bg-[#1E5EFF]"
                        : "bg-slate-100 dark:bg-slate-800",
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        isActive ? "text-white" : "text-slate-600 dark:text-slate-300",
                      )} />
                    </div>
                    <span className={cn(
                      "text-[12px] font-600 text-center leading-tight",
                      isActive
                        ? "text-[#1E5EFF]"
                        : "text-slate-700 dark:text-slate-300",
                    )}>
                      {item.badge ? (
                        <span className="flex items-center gap-1 justify-center">
                          {item.name}
                          <span className="rounded-full bg-[#1E5EFF] px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                            {item.badge}
                          </span>
                        </span>
                      ) : item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Bottom tab bar */}
      <nav className="mobile-tabbar">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isMore = tab.page === null;
          const isActive = isMore ? activeTab === "More" : currentPageName === tab.page;

          const inner = (
            <div
              className={cn("mobile-tab", isActive && "mobile-tab--active")}
            >
              <div className={cn(
                "mobile-tab-icon-wrap",
                isActive && "mobile-tab-icon-wrap--active",
              )}>
                <Icon className={cn(
                  "h-[22px] w-[22px] transition-colors",
                  isActive ? "text-[#1E5EFF]" : "text-slate-400 dark:text-slate-500",
                )} />
              </div>
              <span className={cn(
                "mobile-tab-label",
                isActive ? "text-[#1E5EFF]" : "text-slate-400 dark:text-slate-500",
              )}>
                {tab.name}
              </span>
            </div>
          );

          if (isMore) {
            return (
              <button
                key="more"
                onClick={() => {
                  triggerHaptic();
                  setMoreOpen((v) => !v);
                }}
                className="flex-1 focus:outline-none"
              >
                {inner}
              </button>
            );
          }

          return (
            <Link
              key={tab.page}
              to={createPageUrl(tab.page)}
              onClick={triggerHaptic}
              className="flex-1 focus:outline-none"
            >
              {inner}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
