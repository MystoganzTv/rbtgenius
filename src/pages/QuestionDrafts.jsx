import { CheckCircle2, FileText, Shield } from "lucide-react";
import DataSheet from "@/components/practice/DataSheet";
import QuestionChart from "@/components/practice/QuestionChart";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/lib/AuthContext";
import { draftAppliedQuestions, getAppliedTranslationEs } from "@/lib/questions";
import { translateUi } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Admin-only preview of applied questions marked `status: "draft"`. Drafts are
// written but not yet reviewed by a BCBA, and the question bank keeps them away
// from students. This page shows each one exactly as a student would see it,
// with the answer, explanation and source, so a reviewer can approve it.

const cardClass =
  "border-slate-200/80 bg-white/95 dark:!border-slate-700/80 dark:!bg-slate-900/95";

function DraftCard({ question, number, language }) {
  const spanish = language === "es" ? getAppliedTranslationEs(question.id) : null;
  const text = spanish?.text || question.text;
  const explanation = spanish?.explanation || question.explanation;
  const t = (value) => translateUi(value, language);

  return (
    <Card className={cn(cardClass, "p-6")}>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          #{number}
        </span>
        <span className="rounded-md bg-[#1E5EFF]/10 px-2 py-1 font-medium text-[#1E5EFF] dark:text-sky-300">
          {question.task_list_code}
        </span>
        <span className="rounded-md bg-amber-100 px-2 py-1 font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          {t("Draft · pending BCBA review")}
        </span>
        <code className="text-slate-400">{question.id}</code>
      </div>

      <p className="mb-5 text-base leading-relaxed text-slate-900 dark:text-slate-50">{text}</p>

      {question.chart ? (
        <QuestionChart chart={question.chart} questionId={question.id} language={language} className="mb-5" />
      ) : null}
      {question.data_sheet ? (
        <DataSheet sheet={question.data_sheet} questionId={question.id} language={language} className="mb-5" />
      ) : null}

      <ul className="space-y-2">
        {question.options.map((option) => {
          const correct = option.label === question.correct_answer;
          return (
            <li
              key={option.label}
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                correct
                  ? "border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-200"
                  : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300",
              )}
            >
              <span className="font-semibold">{option.label}</span>
              <span className="flex-1">{spanish?.options?.[option.label] || option.text}</span>
              {correct ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" aria-label={t("Correct answer")} /> : null}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
        <p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">{t("Explanation")}</p>
        <p>{explanation}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
          {question.reference || t("No reference")}
        </p>
      </div>
    </Card>
  );
}

export default function QuestionDrafts() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = (value) => translateUi(value, language);

  if (user?.role !== "admin") {
    return (
      <Card className={cn(cardClass, "mx-auto max-w-3xl p-10 text-center")}>
        <Shield className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <h1 className="text-2xl font-bold">{t("Admin access only")}</h1>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {t("Question Drafts")}
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          {t("These questions are written but not yet reviewed. Students never see them. A BCBA should check each one against its reference before it is published.")}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          {t("To publish an approved question, delete its status line in shared/questions/question-bank-applied.js and run npm run sync:questions.")}
        </p>
      </header>

      {draftAppliedQuestions.length === 0 ? (
        <Card className={cn(cardClass, "p-10 text-center text-slate-500")}>{t("No drafts waiting for review.")}</Card>
      ) : (
        draftAppliedQuestions.map((question, index) => (
          <DraftCard key={question.id} question={question} number={index + 1} language={language} />
        ))
      )}
    </div>
  );
}
