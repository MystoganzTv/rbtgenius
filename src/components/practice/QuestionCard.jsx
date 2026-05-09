import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  Lightbulb,
  XCircle,
} from "lucide-react";
import BilingualText from "@/components/i18n/BilingualText";
import TranslateTextButton from "@/components/i18n/TranslateTextButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import {
  localizeQuestion,
  localizeText,
  translateDifficulty,
  translateTopic,
  translateUi,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { extractKeyTerms, getGlossaryEntry } from "@/lib/aba-glossary";

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer = null,
  isSubmitted = false,
  isFlagged = false,
  correctAnswer = null,
  explanation = "",
  onSelectAnswer,
  onAnswer,
  onNext,
  onToggleFlag,
}) {
  const { language } = useLanguage();
  const [explanationVisible, setExplanationVisible] = useState(false);
  const explanationPreference = useRef(null);

  const handleSubmit = () => {
    if (!selectedAnswer) {
      return;
    }

    onAnswer?.(selectedAnswer);
  };

  const handleNext = () => {
    onNext?.();
  };

  const isCorrect = selectedAnswer === correctAnswer;
  const localizedQuestion = localizeQuestion(question, language);
  const spanishQuestion = useMemo(() => localizeQuestion(question, "es"), [question]);
  const localizedExplanation =
    explanation && explanation !== question?.explanation
      ? localizeText(explanation, language)
      : localizedQuestion?.localizedExplanation || localizeText(explanation, language);
  useEffect(() => {
    const auto = Boolean(isSubmitted && explanation);
    setExplanationVisible(explanationPreference.current !== null ? (explanationPreference.current && auto) : auto);
  }, [explanation, isSubmitted, question?.id]);


  // Key terms for glossary (shown after answering)
  const keyTerms = useMemo(() =>
    isSubmitted ? extractKeyTerms(
      (question?.text || "") + " " + (explanation || "")
    ) : [],
  [isSubmitted, question?.text, explanation]);


  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 dark:border-[#1E5EFF]/15 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            {translateUi("Question", language)} {questionNumber} / {totalQuestions}
          </span>
          <Badge
            variant="secondary"
            className="border border-[#1E5EFF]/10 bg-[#1E5EFF]/5 text-[10px] text-[#1E5EFF]"
          >
            {translateTopic(question?.topic, language)}
          </Badge>
          {question?.bacb_concept ? (
            <Badge variant="secondary" className="text-[10px]">
              {question.bacb_concept}
            </Badge>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px]",
              question?.difficulty === "beginner"
                ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                : question?.difficulty === "intermediate"
                  ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300"
                  : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
            )}
          >
            {translateDifficulty(question?.difficulty, language)}
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "rounded-xl px-2.5 text-xs",
              isFlagged
                ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-950/60"
                : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900",
            )}
            onClick={onToggleFlag}
          >
            <Flag className={cn("h-3.5 w-3.5", isFlagged && "fill-current")} />
            {isFlagged ? translateUi("Flagged", language) : translateUi("Flag", language)}
          </Button>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-6 flex items-start gap-3">
          <BilingualText
            content={localizedQuestion?.localizedText}
            className="flex-1"
            primaryClassName="text-base font-medium leading-relaxed text-slate-900 dark:text-slate-50"
            secondaryClassName="leading-relaxed text-slate-500 dark:text-slate-400"
          />
          <TranslateTextButton
            title="Translation"
            language={language}
            englishText={question?.text}
            spanishText={spanishQuestion?.localizedText?.primary}
            className="mt-0.5 flex-shrink-0"
            contentType="question"
            question={question}
          />
        </div>

        <div className="space-y-3">
          {(localizedQuestion?.options || []).map((option) => {
            const isThis = selectedAnswer === option.label;
            const isCorrectAnswer = option.label === correctAnswer;
            let optionStyle =
              "border-slate-200 hover:border-[#1E5EFF]/30 hover:bg-[#1E5EFF]/3 dark:border-[#1E5EFF]/15 dark:hover:bg-[#1E5EFF]/10";
            let optionTextStyle = "text-slate-900 dark:text-slate-100";

            if (isSubmitted) {
              if (isCorrectAnswer) {
                optionStyle =
                  "border-emerald-400 bg-emerald-50 dark:!border-emerald-400 dark:!bg-emerald-950";
                optionTextStyle = "text-emerald-950 dark:!text-emerald-50";
              } else if (isThis && !isCorrect) {
                optionStyle =
                  "border-red-400 bg-red-50 dark:!border-red-400 dark:!bg-red-950";
                optionTextStyle = "text-red-950 dark:!text-red-50";
              } else {
                optionStyle =
                  "border-slate-100 bg-slate-50/40 opacity-60 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A]/70";
                optionTextStyle = "text-slate-600 dark:text-slate-400";
              }
            } else if (isThis) {
              optionStyle =
                "border-[#1E5EFF] bg-[#1E5EFF]/5 shadow-sm shadow-[#1E5EFF]/10";
            }

            return (
              <button
                key={option.label}
                type="button"
                onClick={() => !isSubmitted && onSelectAnswer?.(option.label)}
                disabled={isSubmitted}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E5EFF]/15 focus-visible:ring-offset-0",
                  optionStyle,
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                    isSubmitted && isCorrectAnswer
                      ? "bg-emerald-500 text-white"
                      : isSubmitted && isThis && !isCorrect
                        ? "bg-red-500 text-white"
                        : isThis
                          ? "bg-[#1E5EFF] text-white"
                          : "bg-slate-100 text-slate-500 dark:bg-[#0D1E3A] dark:text-slate-400",
                  )}
                >
                  {isSubmitted && isCorrectAnswer ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isSubmitted && isThis && !isCorrect ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    option.label
                  )}
                </span>
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <BilingualText
                    content={option.localizedText}
                    className="flex-1"
                    primaryClassName={cn("text-sm", optionTextStyle)}
                    secondaryClassName="text-slate-500 dark:text-slate-400"
                  />
                  <TranslateTextButton
                    title="Translation"
                    language={language}
                    englishText={option.text}
                    spanishText={spanishQuestion?.options?.find((spanishOption) => spanishOption.label === option.label)?.localizedText?.primary}
                    className="mt-0.5 flex-shrink-0"
                    contentType="option"
                    question={question}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-100 px-6 py-4 dark:border-[#1E5EFF]/15">
        {!isSubmitted ? (
          <Button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="w-full rounded-xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
          >
            {translateUi("Submit Answer", language)}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A]/70">
              <div className="flex flex-wrap gap-2">
                {explanation ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setExplanationVisible((current) => {
                      const next = !current;
                      explanationPreference.current = next;
                      return next;
                    })}
                  >
                    {explanationVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    {explanationVisible
                      ? translateUi("Hide Explanation", language)
                      : translateUi("Show Explanation", language)}
                  </Button>
                ) : null}
              </div>

              {explanationVisible && explanation ? (
                <div className="space-y-3 rounded-xl border border-[#1E5EFF]/10 bg-white p-4 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-[#FFB800]" />
                      <span className="text-xs font-semibold text-[#1E5EFF]">
                        {translateUi("Explanation", language)}
                      </span>
                    </div>
                    <TranslateTextButton
                      title="Explanation"
                      language={language}
                      englishText={question?.explanation || explanation}
                      spanishText={spanishQuestion?.localizedExplanation?.primary || localizedExplanation?.primary}
                      className="h-7 w-7 flex-shrink-0"
                      contentType="explanation"
                      question={question}
                    />
                  </div>
                  <BilingualText
                    content={localizedExplanation}
                    primaryClassName="text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                    secondaryClassName="leading-relaxed text-slate-500 dark:text-slate-400"
                  />
                </div>
              ) : null}

              {isSubmitted && keyTerms.length > 0 && (
                <div className="space-y-1 rounded-xl border border-[#1E5EFF]/15 bg-[#1E5EFF]/5 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1E5EFF] dark:text-[#8EB0FF]">
                    {translateUi("ABA Glossary", language)}
                  </p>
                  {keyTerms.map((term) => {
                    const entry = getGlossaryEntry(term);
                    if (!entry) return null;
                    return (
                      <div key={term} className="flex flex-wrap items-baseline gap-1 text-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{term}</span>
                        <span className="text-slate-500 dark:text-slate-400">→ {entry}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              onClick={handleNext}
              className="w-full gap-2 rounded-xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
            >
              {translateUi("Next Question", language)} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

    </div>
  );
}