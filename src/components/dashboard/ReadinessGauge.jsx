import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { translateUi } from "@/lib/i18n";

export default function ReadinessGauge({
  score = 0,
  questionCount = 0,
  examCount = 0,
  averageExamScore = 0,
  label = null,
  cappedBy = null,
}) {
  const { language } = useLanguage();
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (cappedBy) return "#F0A94B";
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#5E7CF7";
    if (score >= 50) return "#7C7FF8";
    return "#F0A94B";
  };

  const displayLabel = label || (
    score >= 85 ? "Strong Pass Probability"
    : score >= 70 ? "Likely Exam Ready"
    : score >= 50 ? "Needs Reinforcement"
    : "At Risk"
  );

  const getSubtext = () => {
    if (examCount > 0)
      return `${translateUi("Guided by", language)} ${examCount} ${examCount === 1 ? translateUi("mock exam", language) : translateUi("mock exams", language)} ${translateUi("and practice accuracy", language)}`;
    if (questionCount >= 20)
      return translateUi("Practice-only estimate · Take a mock exam for a stronger signal", language);
    return translateUi("Very early estimate · Answer more questions and take a mock exam", language);
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
      <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {translateUi("Exam Readiness", language)}
      </h3>

      <div className="flex flex-col items-center">
        <div className="relative h-32 w-32">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(148,163,184,0.22)" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke={getColor()} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">{score}%</span>
          </div>
        </div>

        <span className={`mt-3 text-sm font-semibold ${
          score >= 85 ? "text-emerald-600 dark:text-emerald-400"
          : score >= 70 ? "text-[#5E7CF7] dark:text-[#8EB0FF]"
          : score >= 50 ? "text-violet-600 dark:text-violet-400"
          : "text-amber-600 dark:text-amber-400"
        }`}>
          {translateUi(displayLabel, language)}
        </span>

        <p className="mt-1 text-center text-xs text-slate-400 dark:text-slate-500">
          {getSubtext()}
        </p>

        {cappedBy && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-500/25 dark:bg-amber-500/10">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {translateUi("Score capped at 78%", language)} — {translateUi(cappedBy, language)} {translateUi("needs more practice before the exam.", language)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
