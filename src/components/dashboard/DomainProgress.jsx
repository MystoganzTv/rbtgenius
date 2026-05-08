import { MIN_DOMAIN_ATTEMPTS } from "@/lib/backend-core";
import { useLanguage } from "@/hooks/use-language";
import { translateTopic, translateUi } from "@/lib/i18n";
import { PRACTICE_TOPIC_TOTALS } from "@/lib/question-bank";

const domains = [
  { key: "measurement", label: "Measurement", color: "#5E7CF7" },
  { key: "assessment", label: "Assessment", color: "#6D81E8" },
  { key: "skill_acquisition", label: "Skill Acquisition", color: "#4DAA94" },
  { key: "behavior_reduction", label: "Behavior Reduction", color: "#8C9AB3" },
  { key: "documentation", label: "Documentation", color: "#A07BB7" },
  {
    key: "professional_conduct",
    label: "Ethics",
    color: "#8B78D8",
  },
];

export default function DomainProgress({ mastery = {}, attemptCounts = {} }) {
  const { language } = useLanguage();

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {translateUi("Domain Performance", language)}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {translateUi(
              `Scores become reliable after at least ${MIN_DOMAIN_ATTEMPTS} attempts per domain.`,
              language,
            )}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {domains.map((domain) => {
          const value = mastery[domain.key] || 0;
          const attempts = attemptCounts[domain.key] || 0;
          const totalAvailable = PRACTICE_TOPIC_TOTALS[domain.key] || 0;
          const hasEnoughData = attempts >= MIN_DOMAIN_ATTEMPTS;
          const displayValue = hasEnoughData ? `${value}%` : "Not enough data";
          const progressWidth = hasEnoughData
            ? value
            : totalAvailable > 0
              ? Math.min(100, Math.round((attempts / totalAvailable) * 100))
              : 0;

          return (
            <div key={domain.key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {translateTopic(domain.key, language)}
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {translateUi(displayValue, language)}
                </span>
              </div>
              {!hasEnoughData ? (
                <p className="mb-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {translateUi(`${attempts} of ${totalAvailable} answered`, language)}
                </p>
              ) : null}

              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[#1E5EFF]/15">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${progressWidth}%`,
                    backgroundColor: hasEnoughData ? domain.color : "#475569",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
