import { Flame } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { translateUi } from "@/lib/i18n";

export default function StreakCard({ streak = 0, questionsToday = 0 }) {
  const { language } = useLanguage();
  const days = language === "es" ? ["L", "M", "X", "J", "V", "S", "D"] : ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date().getDay();
  const adjustedToday = today === 0 ? 6 : today - 1;
  const hasStudiedToday = questionsToday > 0;
  const streakLabel =
    streak > 0 ? `${streak} days` : hasStudiedToday ? "Started today" : "No streak yet";

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {translateUi("Study Streak", language)}
        </h3>
        <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A]">
          <Flame className="h-3.5 w-3.5 text-orange-500 dark:text-orange-300" />
          <span className="text-xs font-bold text-orange-600 dark:text-orange-300">
            {translateUi(streakLabel, language)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1">
        {days.map((day, index) => {
          const distanceBack = (adjustedToday - index + 7) % 7;
          const isToday = distanceBack === 0;
          const isCompleted = hasStudiedToday
            ? distanceBack >= 1 && distanceBack <= streak
            : streak > 0 && distanceBack <= streak;

          return (
            <div key={`${day}-${index}`} className="flex flex-col items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-all ${
                  isCompleted
                    ? "border border-[#4F7BFF]/35 bg-[#1E5EFF]/12 text-[#6E8FFF] dark:border-[#4F7BFF]/30 dark:bg-[#1E5EFF]/12 dark:text-[#91A8FF]"
                    : isToday
                      ? "border border-amber-400/40 bg-amber-500/8 text-amber-500 dark:border-amber-400/25 dark:bg-amber-500/10 dark:text-amber-300"
                      : "bg-slate-50 text-slate-400 dark:bg-[#0D1E3A] dark:text-slate-500"
                }`}
              >
                {isCompleted ? "✓" : day}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
