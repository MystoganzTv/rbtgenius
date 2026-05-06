import { TOTAL_PRACTICE_QUESTIONS } from "@/lib/question-bank";
import { useLanguage } from "@/hooks/use-language";
import { translateUi } from "@/lib/i18n";

export default function ReadinessGauge({
  score = 0,
  questionCount = 0,
  examCount = 0,
  averageExamScore = 0,
}) {
  const { language } = useLanguage();
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const hasStrongSignal = questionCount >= 20 || examCount > 0;

  const getColor = () => {
    if (score >= 80) {
      return "#5E7CF7";
    }

    if (score >= 60) {
      return "#7C7FF8";
    }

    return "#F0A94B";
  };

  const getLabel = () => {
    if (!hasStrongSignal) {
      return "Early Estimate";
    }

    if (examCount > 0 && averageExamScore >= 80) {
      return "Ready for the Exam";
    }

    if (score >= 80) {
      return "Exam Ready";
    }

    if (score >= 60) {
      return "Almost There";
    }

    return "Keep Studying";
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
      <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {translateUi("Exam Readiness", language)}
      </h3>

      <div className="flex flex-col items-center">
        <div className="relative h-32 w-32">
          <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(148,163,184,0.22)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={getColor()}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">{score}%</span>
          </div>
        </div>

        <span className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
          {translateUi(getLabel(), language)}
        </span>
        <p className="mt-1 text-center text-xs text-slate-400 dark:text-slate-500">
          {translateUi(
            examCount > 0
            ? `Guided by ${examCount} mock exam${examCount === 1 ? "" : "s"} and your ${TOTAL_PRACTICE_QUESTIONS}-question bank coverage`
            : hasStrongSignal
              ? `Coverage-adjusted from your ${TOTAL_PRACTICE_QUESTIONS}-question bank`
              : "Early estimate based on very limited bank coverage",
            language,
          )}
        </p>
      </div>
    </div>
  );
}
