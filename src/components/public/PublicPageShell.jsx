import { Link } from "react-router-dom";
import { GraduationCap, Moon, Sparkles, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import BilingualText from "@/components/i18n/BilingualText";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/lib/AuthContext";
import { localizeText, translateUi } from "@/lib/i18n";
import { createPageUrl } from "@/utils";

export default function PublicPageShell({ title, description, children }) {
  const { isDark, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const localizedTitle = localizeText(title, language);
  const localizedDescription = localizeText(description, language);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-foreground dark:bg-background">
      <header className="border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1E5EFF]">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <span className="truncate text-base font-bold text-slate-900 dark:text-slate-50 sm:text-lg">RBT</span>
              <span className="truncate text-base font-bold text-[#1E5EFF] sm:text-lg">Genius</span>
              <Sparkles className="h-3.5 w-3.5 text-[#FFB800]" />
            </div>
          </Link>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              onClick={toggleTheme}
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </Button>
            {isAuthenticated ? (
              <Link to={createPageUrl("Dashboard")}>
                <Button className="rounded-xl bg-[#1E5EFF] px-3 text-sm hover:bg-[#1E5EFF]/90 sm:px-4 sm:text-base">
                  <span className="hidden sm:inline">
                    {translateUi("Go to Dashboard", language)}
                  </span>
                  <span className="sm:hidden">{translateUi("Dashboard", language)}</span>
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="outline" className="rounded-xl px-3 text-sm sm:px-4 sm:text-base">
                  {translateUi("Log In", language)}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.25)] dark:border-[#1E5EFF]/15 dark:bg-[#0B1628] sm:p-8">
          <div className="max-w-3xl">
            <BilingualText
              content={localizedTitle}
              className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl"
              secondaryClassName="text-base text-slate-400 dark:text-slate-500"
            />
            {description ? (
              <BilingualText
                content={localizedDescription}
                className="mt-4 text-base leading-7 text-slate-500 dark:text-slate-400"
                secondaryClassName="text-sm leading-6 text-slate-400 dark:text-slate-500"
              />
            ) : null}
          </div>

          <div className="mt-8 space-y-8 text-sm leading-7 text-slate-600 dark:text-slate-300">
            {children}
          </div>
        </div>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
