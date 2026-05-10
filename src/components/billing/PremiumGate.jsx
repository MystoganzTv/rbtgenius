import { Crown, Lock, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { localizeText, translateUi } from "@/lib/i18n";
import { getGateCopy } from "@/lib/plan-access";
import { OFFICIAL_CONCEPT_COUNT, TOTAL_PRACTICE_QUESTIONS } from "@/lib/questions";
import { PREMIUM_DAILY_TUTOR_LIMIT } from "@/lib/plan-access";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";

export default function PremiumGate({
  feature = "premium",
  title,
  description,
  bullets = [],
}) {
  const { isAuthenticated } = useAuth();
  const { language } = useLanguage();
  const copy = getGateCopy(feature);
  const resolvedTitle = title || copy.title;
  const resolvedDescription = description || copy.description;
  const resolvedBullets = bullets.length > 0
    ? bullets
    : [
        `Unlimited practice across ${TOTAL_PRACTICE_QUESTIONS} questions and ${OFFICIAL_CONCEPT_COUNT} concepts`,
        "Full analytics and mock exams",
        `${PREMIUM_DAILY_TUTOR_LIMIT} AI tutor messages each day`,
      ];

  return (
    <Card className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#1E5EFF] via-[#4F7CFF] to-[#FFB800] text-white shadow-lg shadow-[#1E5EFF]/20">
          <Crown className="h-8 w-8" />
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#1E5EFF]/15 bg-[#1E5EFF]/8 px-4 py-2 text-sm font-medium text-[#1E5EFF] dark:border-[#1E5EFF]/20 dark:bg-[#1E5EFF]/12 dark:text-[#8EB0FF]">
          <Lock className="h-4 w-4" />
          {translateUi("Premium feature", language)}
        </div>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
          {translateUi(resolvedTitle, language)}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-slate-500 dark:text-slate-400">
          {localizeText(resolvedDescription, language).primary}
        </p>

        <div className="mt-6 w-full space-y-3 text-left">
          {resolvedBullets.map((bullet) => (
            <div
              key={bullet}
              className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A] dark:text-slate-200"
            >
              <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#1E5EFF]" />
              <span>{localizeText(bullet, language).primary}</span>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isAuthenticated ? (
            <Link to={createPageUrl("Pricing")}>
              <Button className="rounded-2xl bg-[#1E5EFF] px-6 hover:bg-[#1E5EFF]/90">
                {translateUi("View Premium Plans", language)}
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login?mode=register">
                <Button className="rounded-2xl bg-[#1E5EFF] px-6 hover:bg-[#1E5EFF]/90">
                  {translateUi("Create Free Account", language)}
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" className="rounded-2xl px-6">
                  {translateUi("Log In", language)}
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
