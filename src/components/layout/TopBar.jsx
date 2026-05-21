import { Crown, LogOut, Menu, Moon, Sun, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { isPremiumPlan } from "@/lib/plan-access";
import { translateUi } from "@/lib/i18n";
import { createPageUrl } from "@/utils";

const planLabels = {
  free: "Free Plan",
  premium_monthly: "Premium Monthly",
  premium_yearly: "Premium Yearly",
};

export default function TopBar({
  onMenuClick,
  user = null,
  plan = "free",
  onLogout,
}) {
  const { isDark, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const fullName = user?.full_name || user?.name || "Student";
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-100 bg-white/80 px-6 backdrop-blur-xl transition-colors dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]/80">
      <div className="flex items-center gap-3">
        {onMenuClick ? (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl lg:hidden dark:hover:bg-[#0D1628]"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </Button>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-xl text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-[#0D1628] dark:hover:text-slate-200"
          onClick={toggleTheme}
        >
          {isDark ? (
            <Sun className="h-[18px] w-[18px]" />
          ) : (
            <Moon className="h-[18px] w-[18px]" />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-xl py-1.5 pl-2 pr-3 transition-all hover:bg-slate-50 dark:hover:bg-[#0D1628]">
              <Avatar className="h-8 w-8 bg-gradient-to-br from-[#1E5EFF] to-[#6366F1]">
                <AvatarFallback className="bg-transparent text-xs font-semibold text-white">
                  {initials || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-100">{fullName}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {translateUi(planLabels[plan] ?? planLabels.free, language)}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48 rounded-xl">
            <Link to={createPageUrl("Profile")}>
              <DropdownMenuItem className="rounded-lg">
                <User className="mr-2 h-4 w-4" /> {translateUi("Profile", language)}
              </DropdownMenuItem>
            </Link>
            <Link to={createPageUrl("Pricing")}>
              <DropdownMenuItem className="rounded-lg text-[#FFB800]">
                <Crown className="mr-2 h-4 w-4" />{" "}
                {translateUi(
                  isPremiumPlan(plan) ? "Manage Plan" : "Upgrade to Premium",
                  language,
                )}
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-lg text-red-500"
              onClick={onLogout}
            >
              <LogOut className="mr-2 h-4 w-4" /> {translateUi("Sign Out", language)}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
