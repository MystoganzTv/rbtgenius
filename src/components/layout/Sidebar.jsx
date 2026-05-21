import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Shield,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { translateUi } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";
import { WhatsNewModal, useWhatsNew, VERSION } from "@/components/WhatsNewModal";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Practice", icon: HelpCircle, page: "Practice" },
  { name: "Flashcards", icon: Sparkles, page: "Flashcards" },
  { name: "Mock Exams", icon: ClipboardCheck, page: "MockExams", premium: true },
  { name: "Analytics", icon: BarChart3, page: "Analytics", premium: true },
  { name: "Pricing", icon: CreditCard, page: "Pricing" },
];

const adminItems = [
  { name: "Members", icon: Shield, page: "AdminMembers", badge: "ADMIN" },
];

export default function Sidebar({ currentPage, isAdmin = false, plan = "free" }) {
  const [collapsed, setCollapsed] = useState(false);
  const { language } = useLanguage();
  const { open: whatsNewOpen, setOpen: setWhatsNewOpen } = useWhatsNew();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-100 bg-white transition-all duration-300 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]",
        collapsed ? "w-[72px]" : "w-[260px]",
      )}
    >
      <div className="flex h-16 items-center border-b border-slate-100 px-4 dark:border-[#1E5EFF]/15">
        <Link
          to={createPageUrl("Dashboard")}
          className="flex min-w-0 items-center gap-2.5"
        >
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#1E5EFF]">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>

          {!collapsed ? (
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
                RBT
              </span>
              <span className="text-lg font-bold tracking-tight text-[#1E5EFF]">
                Genius
              </span>
              <Sparkles className="-mt-1 h-3.5 w-3.5 text-[#FFB800]" />
            </div>
          ) : null}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <div
          className={cn(
            "mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500",
            collapsed ? "text-center" : "px-3",
          )}
        >
          {collapsed ? "•" : translateUi("Learning", language)}
        </div>

        {navItems.map((item) => {
          const isActive = currentPage === item.page;

          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all duration-200",
                isActive
                  ? "bg-[#1E5EFF]/8 text-[#1E5EFF]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-[#0D1628] dark:hover:text-slate-100",
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] flex-shrink-0",
                  isActive && "text-[#1E5EFF]",
                )}
              />

              {!collapsed ? <span>{translateUi(item.name, language)}</span> : null}

              {!collapsed && (item.badge || (item.premium && plan === "free")) ? (
                <span
                  className={cn(
                    "ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold text-white",
                    item.badge
                      ? "bg-gradient-to-r from-[#1E5EFF] to-[#6366F1]"
                      : "bg-[#FFB800] text-slate-900",
                  )}
                >
                  {item.badge || "PRO"}
                </span>
              ) : null}

              {isActive ? (
                <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#1E5EFF]" />
              ) : null}
            </Link>
          );
        })}

        {isAdmin ? (
          <>
            <div
              className={cn(
                "my-4",
                collapsed ? "px-4" : "px-3",
              )}
            >
              <div className="h-px w-full bg-slate-200 dark:bg-slate-800" />
            </div>

            <div
              className={cn(
                "mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500",
                collapsed ? "text-center" : "px-3",
              )}
            >
              {collapsed ? "•" : translateUi("Admin", language)}
            </div>

            {adminItems.map((item) => {
              const isActive = currentPage === item.page;

              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-all duration-200",
                    isActive
                      ? "bg-[#1E5EFF]/8 text-[#1E5EFF]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-[#0D1628] dark:hover:text-slate-100",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-[18px] w-[18px] flex-shrink-0",
                      isActive && "text-[#1E5EFF]",
                    )}
                  />

                  {!collapsed ? <span>{translateUi(item.name, language)}</span> : null}

                  {!collapsed && item.badge ? (
                    <span className="ml-auto rounded-full bg-[#0D1628] px-2 py-0.5 text-[10px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                      {item.badge}
                    </span>
                  ) : null}

                  {isActive ? (
                    <div className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#1E5EFF]" />
                  ) : null}
                </Link>
              );
            })}
          </>
        ) : null}
      </nav>

      <div className="border-t border-slate-100 p-3 dark:border-[#1E5EFF]/15 space-y-1">
        {/* What's New trigger */}
        <button
          type="button"
          onClick={() => setWhatsNewOpen(true)}
          className={cn(
            "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-[#0D1628] dark:hover:text-slate-300",
            collapsed && "justify-center px-0"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-[#FFB800]" />
          {!collapsed && (
            <span className="flex items-center gap-1.5">
              {language === "es" ? "Novedades" : "What's New"}
              <span className="rounded-full bg-[#1E5EFF] px-1.5 py-0.5 text-[9px] font-bold text-white">
                v{VERSION}
              </span>
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className="flex w-full items-center justify-center rounded-xl py-2 text-slate-400 transition-all hover:bg-slate-50 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-[#0D1628] dark:hover:text-slate-200"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <WhatsNewModal open={whatsNewOpen} onClose={() => setWhatsNewOpen(false)} />
    </aside>
  );
}
