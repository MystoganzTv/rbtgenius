import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  Lightbulb,
  Loader2,
  SendHorizonal,
  XCircle,
} from "lucide-react";
import BilingualText from "@/components/i18n/BilingualText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/hooks/use-language";
import { toast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import {
  localizeQuestion,
  localizeText,
  translateDifficulty,
  translateTopic,
  translateUi,
} from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer = null,
  isSubmitted = false,
  isFlagged = false,
  correctAnswer = null,
  explanation = "",
  entitlements = null,
  onEntitlementsChange,
  onSelectAnswer,
  onAnswer,
  onNext,
  onToggleFlag,
}) {
  const { language } = useLanguage();
  const [explanationVisible, setExplanationVisible] = useState(false);
  const explanationPreference = useRef(null); // null=auto, true=user wants shown, false=user wants hidden
  const [aiConversationId, setAiConversationId] = useState(null);
  const [aiMessages, setAiMessages] = useState([]); // [{role, content}]
  const [aiReply, setAiReply] = useState("");
  const [aiReplyVisible, setAiReplyVisible] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiFollowUp, setAiFollowUp] = useState("");

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
  const localizedExplanation =
    explanation && explanation !== question?.explanation
      ? localizeText(explanation, language)
      : localizedQuestion?.localizedExplanation || localizeText(explanation, language);
  const localizedQuestionText = localizedQuestion?.localizedText?.primary || "";
  const aiPrompt = useMemo(() => {
    const options = (localizedQuestion?.options || [])
      .map((option) => `${option.label}) ${option.localizedText?.primary || ""}`)
      .join("\n");
    const correctOption = (localizedQuestion?.options || []).find(
      (option) => option.label === correctAnswer,
    );
    const replyLanguage = language === "es" ? "Spanish" : "English";

    return [
      `Help me with this RBT practice question in ${replyLanguage}.`,
      "Keep the tone supportive and concise.",
      "Explain why the best answer is correct, then briefly say why the other options are not the best fit.",
      "Do not mention BCBA or BACB unless the question itself requires it.",
      "",
      `Question: ${localizedQuestionText}`,
      "Options:",
      options,
      `Correct answer: ${correctAnswer}) ${correctOption?.localizedText?.primary || ""}`,
      localizedExplanation?.primary
        ? `Current explanation: ${localizedExplanation.primary}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }, [
    correctAnswer,
    language,
    localizedExplanation?.primary,
    localizedQuestion?.options,
    localizedQuestionText,
  ]);

  useEffect(() => {
    const auto = Boolean(isSubmitted && explanation);
    setExplanationVisible(explanationPreference.current !== null ? (explanationPreference.current && auto) : auto);
  }, [explanation, isSubmitted, question?.id]);

  useEffect(() => {
    setAiConversationId(null);
    setAiReply("");
    setAiMessages([]);
    setAiReplyVisible(false);
    setAiLoading(false);
    setAiError("");
    setAiFollowUp("");
  }, [question?.id]);

  const buildLocalAiReply = () => {
    const correctOption = (localizedQuestion?.options || []).find(o => o.label === correctAnswer);
    const wrongOptions = (localizedQuestion?.options || []).filter(o => o.label !== correctAnswer);
    const lines = [];
    if (correctOption) {
      lines.push(`Correct answer: ${correctAnswer}) ${correctOption.localizedText?.primary || ""}`);
      lines.push("");
    }
    if (localizedExplanation?.primary) {
      lines.push(localizedExplanation.primary);
      lines.push("");
    }
    if (wrongOptions.length > 0) {
      lines.push("Why the other options are not the best fit:");
      wrongOptions.forEach(o => {
        lines.push(`- ${o.label}) ${o.localizedText?.primary || ""} — does not match what the scenario describes.`);
      });
    }
    lines.push("");
    lines.push("Ask me anything about this question or concept.");
    return lines.filter((l, i, arr) => !(l === "" && arr[i - 1] === "")).join("\n");
  };

  const handleAskAi = async () => {
    if (aiLoading) return;

    if (aiReply) {
      setAiReplyVisible((current) => !current);
      return;
    }

    setAiLoading(true);
    setAiError("");

    try {
      // Show local context-aware reply immediately, then open conversation for follow-ups
      const localReply = buildLocalAiReply();
      setAiReply(localReply);
      setAiMessages([{ role: "assistant", content: localReply }]);
      setAiReplyVisible(true);

      // Create conversation in background for follow-up questions
      const created = await api.createTutorConversation({ name: `Q${questionNumber}` });
      const conversationId = created?.conversation?.id || null;
      setAiConversationId(conversationId);
      onEntitlementsChange?.(created?.entitlements || entitlements);
    } catch (error) {
      const isLimit = error?.data?.code === "plan_limit_reached";
      const isPremium = Boolean(entitlements?.is_premium);
      const description = isLimit
        ? translateUi(
            isPremium
              ? "Premium includes a generous daily AI tutor allowance. You have reached today's limit."
              : "Free accounts include 5 AI tutor messages per day.",
            language,
          )
        : error?.message || translateUi("Please try again.", language);
      setAiError(description);
      toast({
        title: isLimit
          ? translateUi("Daily AI tutor limit reached", language)
          : translateUi("Unable to send message", language),
        description,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiFollowUp = async (e) => {
    e?.preventDefault();
    const text = aiFollowUp.trim();
    if (!text || aiLoading || !aiConversationId) return;
    setAiFollowUp("");
    setAiMessages((prev) => [...prev, { role: "user", content: text }]);
    setAiLoading(true);
    setAiError("");
    try {
      const payload = await api.sendTutorMessage(aiConversationId, { content: text });
      const updatedConversation = payload?.conversation;
      const assistantMessage = [...(updatedConversation?.messages || [])].reverse().find((m) => m.role === "assistant");
      const nextReply = String(assistantMessage?.content || "").replaceAll("**", "").trim();
      if (nextReply) {
        setAiMessages((prev) => [...prev, { role: "assistant", content: nextReply }]);
        setAiReply(nextReply);
      }
      onEntitlementsChange?.(payload?.entitlements || entitlements);
    } catch (error) {
      const description = error?.message || translateUi("Please try again.", language);
      setAiError(description);
    } finally {
      setAiLoading(false);
    }
  };

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
        <BilingualText
          content={localizedQuestion?.localizedText}
          className="mb-6"
          primaryClassName="text-base font-medium leading-relaxed text-slate-900 dark:text-slate-50"
          secondaryClassName="leading-relaxed text-slate-500 dark:text-slate-400"
        />

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
                <BilingualText
                  content={option.localizedText}
                  primaryClassName={cn("text-sm", optionTextStyle)}
                  secondaryClassName="text-slate-500 dark:text-slate-400"
                />
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
                    {explanationVisible ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    {explanationVisible
                      ? translateUi("Hide Explanation", language)
                      : translateUi("Show Explanation", language)}
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-[#1E5EFF]/20 bg-[#1E5EFF]/5 text-[#1E5EFF] hover:bg-[#1E5EFF]/10"
                  onClick={handleAskAi}
                  disabled={aiLoading}
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  {aiLoading
                    ? translateUi("Preparing AI help...", language)
                    : aiReply
                      ? aiReplyVisible
                        ? translateUi("Hide AI Reply", language)
                        : translateUi("Show AI Reply", language)
                      : translateUi("Ask AI", language)}
                </Button>
              </div>

              {explanationVisible && explanation ? (
                <div className="space-y-3 rounded-xl border border-[#1E5EFF]/10 bg-white p-4 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
                  <div className="mb-1 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-[#FFB800]" />
                    <span className="text-xs font-semibold text-[#1E5EFF]">
                      {translateUi("Explanation", language)}
                    </span>
                  </div>
                  <BilingualText
                    content={localizedExplanation}
                    primaryClassName="text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                    secondaryClassName="leading-relaxed text-slate-500 dark:text-slate-400"
                  />
                </div>
              ) : null}

              {(aiReplyVisible || aiLoading || aiError) ? (
                <div className="space-y-3 rounded-xl border border-[#1E5EFF]/10 bg-[#1E5EFF]/5 p-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-[#1E5EFF]" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1E5EFF]">
                      {translateUi("AI Coach", language)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {aiMessages.map((msg, i) => (
                      <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
                        {msg.role === "user" ? (
                          <div className="max-w-[85%] rounded-xl bg-[#1E5EFF] px-3 py-2 text-sm text-white">
                            {msg.content}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                            {msg.content}
                          </p>
                        )}
                      </div>
                    ))}
                    {aiLoading && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Loader2 className="h-3 w-3 animate-spin text-[#1E5EFF]" />
                        <span>{translateUi("Thinking...", language)}</span>
                      </div>
                    )}
                    {aiError && !aiLoading && (
                      <p className="text-sm text-rose-500">{aiError}</p>
                    )}
                  </div>

                  {aiConversationId && !aiLoading && (
                    <form onSubmit={handleAiFollowUp} className="flex gap-2 pt-1">
                      <Input
                        value={aiFollowUp}
                        onChange={(e) => setAiFollowUp(e.target.value)}
                        placeholder={translateUi("Ask a follow-up question...", language)}
                        className="h-8 text-sm dark:border-[#1E5EFF]/20 dark:bg-[#0D1E3A]"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-8 bg-[#1E5EFF] px-3 hover:bg-[#1E5EFF]/90"
                        disabled={!aiFollowUp.trim()}
                      >
                        <SendHorizonal className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  )}
                </div>
              ) : null}
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
