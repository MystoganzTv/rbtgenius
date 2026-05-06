import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, BookOpen, Brain, Clock, Target } from "lucide-react";
import PremiumGate from "@/components/billing/PremiumGate";
import StatCard from "@/components/dashboard/StatCard";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { translateTopic, translateUi } from "@/lib/i18n";
import { isPremiumPlan } from "@/lib/plan-access";
import { MIN_DOMAIN_ATTEMPTS } from "@/lib/backend-core";
import { PRACTICE_TOPIC_TOTALS, TOTAL_PRACTICE_QUESTIONS } from "@/lib/question-bank";
import { TASK_LIST_SECTIONS } from "@/lib/task-list";

const topicLabels = {
  measurement: "Measurement",
  assessment: "Assessment",
  skill_acquisition: "Skill Acquisition",
  behavior_reduction: "Behavior Reduction",
  documentation: "Documentation",
  professional_conduct: "Ethics",
};

const topicKeys = Object.keys(topicLabels);
const COLORS = ["#1E5EFF", "#6366F1", "#10B981", "#FFB800", "#F43F5E", "#8B5CF6"];

export default function Analytics() {
  const { language } = useLanguage();
  const { data: profileData } = useQuery({
    queryKey: ["profile-data"],
    queryFn: api.getProfile,
  });

  const entitlements = profileData?.entitlements;

  const analyticsQuery = useQuery({
    queryKey: ["analytics-data"],
    queryFn: api.getAnalytics,
    enabled: isPremiumPlan(entitlements?.plan),
  });

  const progress = analyticsQuery.data?.progress;
  const attempts = analyticsQuery.data?.attempts || [];
  const exams = analyticsQuery.data?.exams || [];

  const totalQuestions = progress?.total_questions_completed || 0;
  const totalCorrect = progress?.total_correct || 0;
  const answeredAccuracy =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const bankAccuracy = progress?.bank_accuracy || 0;
  const studyHours = progress?.study_hours || 0;
  const readiness = progress?.readiness_score || 0;
  const bankCoveragePercent =
    TOTAL_PRACTICE_QUESTIONS > 0
      ? Math.round((totalQuestions / TOTAL_PRACTICE_QUESTIONS) * 100)
      : 0;
  const t = (value) => translateUi(value, language);

  const topicData = useMemo(
    () =>
      topicKeys
        .map((key) => {
          const topicAttempts = attempts.filter((attempt) => attempt.topic === key);
          return {
            name: translateTopic(key, language),
            value: topicAttempts.length,
            correct: topicAttempts.filter((attempt) => attempt.is_correct).length,
          };
        })
        .filter((item) => item.value > 0),
    [attempts, language],
  );

  const domainCoverageData = useMemo(
    () =>
      topicKeys.map((key) => {
        const answered = progress?.domain_attempt_counts?.[key] || 0;
        const total = PRACTICE_TOPIC_TOTALS[key] || 0;
        const correct = attempts.filter(
          (attempt) => attempt.topic === key && attempt.is_correct,
        ).length;
        const answeredAccuracyForDomain =
          answered > 0 ? Math.round((correct / answered) * 100) : 0;

        return {
          name: translateTopic(key, language),
          answered,
          total,
          coverage: total > 0 ? Math.round((answered / total) * 100) : 0,
          answeredAccuracy: answeredAccuracyForDomain,
          hasEnoughData: answered >= MIN_DOMAIN_ATTEMPTS,
        };
      }),
    [attempts, language, progress],
  );

  const examScoreData = useMemo(
    () =>
      exams.map((exam, index) => ({
        exam: `Exam ${index + 1}`,
        score: exam.score || 0,
      })),
    [exams],
  );

  if (!entitlements) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-12 dark:border-slate-800 dark:bg-slate-950">
          <div className="h-8 w-48 rounded bg-slate-100 dark:bg-slate-900" />
          <div className="mt-3 h-4 w-72 rounded bg-slate-100 dark:bg-slate-900" />
        </div>
      </div>
    );
  }

  if (!isPremiumPlan(entitlements.plan)) {
    return (
      <PremiumGate
        feature="analytics"
        bullets={[
          t("Readiness tracking that stays more stable over time"),
          t("Topic distribution from your real attempt history"),
          t("Mock exam trends and deeper performance breakdowns"),
        ]}
      />
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{t("Analytics")}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("Review patterns across your attempts, domains, and mock exams.")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Study Hours"
          value={studyHours.toFixed(1)}
          subtitle="Total tracked"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Bank Accuracy"
          value={`${bankAccuracy}%`}
          subtitle={`${totalCorrect} correct out of ${TOTAL_PRACTICE_QUESTIONS}`}
          icon={Target}
          color="green"
        />
        <StatCard
          title="Readiness"
          value={`${readiness}%`}
          subtitle="Coverage-adjusted"
          icon={Brain}
          color="purple"
        />
        <StatCard
          title="Coverage"
          value={`${bankCoveragePercent}%`}
          subtitle={`${totalQuestions}/${TOTAL_PRACTICE_QUESTIONS} answered`}
          icon={BookOpen}
          color="gold"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("Domain Coverage")}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t("Answered out of each domain's share of the full question bank.")}
            </p>
            {analyticsQuery.isLoading ? (
              <span className="text-xs text-slate-400">{t("Loading...")}</span>
            ) : null}
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={domainCoverageData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.15} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11, fill: "#64748B" }}
              />
              <Tooltip
                formatter={(value, _name, props) => {
                  const item = props?.payload;
                  if (!item) {
                    return [`${value}%`, t("Coverage")];
                  }

                  return [
                    t(`${item.answered} of ${item.total} answered${
                      item.hasEnoughData
                        ? ` • ${item.answeredAccuracy}% answered accuracy`
                        : ""
                    }`),
                    t("Coverage"),
                  ];
                }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #1E293B",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="coverage" fill="#1E5EFF" radius={[0, 6, 6, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {domainCoverageData.map((item) => (
              <div
                key={item.name}
                className="rounded-xl border border-slate-200/70 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="font-medium text-slate-700 dark:text-slate-200">{item.name}</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">
                  {t(`${item.answered}/${item.total} answered`)}
                </p>
                <p className="text-slate-500 dark:text-slate-400">
                  {t(
                    item.hasEnoughData
                      ? `${item.answeredAccuracy}% answered accuracy`
                      : `Need ${MIN_DOMAIN_ATTEMPTS - item.answered} more for stable accuracy`,
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("Questions by Topic")}
          </h3>
          {topicData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={topicData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {topicData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #1E293B",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center">
              <p className="text-sm text-slate-400">
                {t("Keep answering questions to unlock this view.")}
              </p>
            </div>
          )}

          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {topicData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("RBT Exam Outline — Section Mastery")}
            </h3>
            <span className="text-xs text-slate-400">
              {t("Aligned to the current exam outline")}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {TASK_LIST_SECTIONS.map((section) => {
              const mastery = progress?.task_list_section_mastery?.[section.code] || 0;
              const attempts = progress?.task_list_section_attempts?.[section.code] || 0;
              const hasEnough = attempts >= MIN_DOMAIN_ATTEMPTS;
              const sectionTitle = language === "es" ? section.title_es : section.title;
              return (
                <div
                  key={section.code}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {t(`Section ${section.code}`)}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {sectionTitle}
                      </p>
                    </div>
                    <p className="shrink-0 text-2xl font-black text-slate-900 dark:text-white">
                      {hasEnough ? `${mastery}%` : "—"}
                    </p>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: hasEnough ? `${mastery}%` : "0%" }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                    {hasEnough
                      ? t(`${attempts} answered`)
                      : t(`Need ${MIN_DOMAIN_ATTEMPTS - attempts} more for stable mastery`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("Mock Exam Score Trend")}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Award className="h-3.5 w-3.5" />
              {t(`${exams.length} exams tracked`)}
            </div>
          </div>
          {examScoreData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={examScoreData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.15} />
                <XAxis dataKey="exam" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #1E293B",
                    fontSize: "12px",
                  }}
                />
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1E5EFF" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#1E5EFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#1E5EFF"
                  fill="url(#scoreGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center">
              <p className="text-sm text-slate-400">
                {t("Complete your first mock exam to start building this chart.")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
