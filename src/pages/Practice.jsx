import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  Flag,
  HelpCircle,
  ListChecks,
  ShieldAlert,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import QuestionCard from "@/components/practice/QuestionCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import {
  FREE_DAILY_PRACTICE_LIMIT,
  isPremiumPlan,
} from "@/lib/plan-access";
import {
  isRbtQuestion,
  OFFICIAL_CONCEPT_COUNT,
  PRACTICE_BATCH_SIZE,
  RBT_ALLOWED_DIFFICULTIES,
  topicLabels,
  TOTAL_PRACTICE_QUESTIONS,
} from "@/lib/questions/index.js";
import { translateDifficulty, translateTopic, translateUi } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

const reviewFilters = [
  { id: "all", label: "All" },
  { id: "incorrect", label: "Incorrect" },
  { id: "flagged", label: "Flagged" },
  { id: "unanswered", label: "Unanswered" },
];

function normalizeQuestionList(value) {
  const questions = Array.isArray(value)
    ? value
    : Array.isArray(value?.questions)
      ? value.questions
      : [];

  return questions.filter(isRbtQuestion);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function normalizeDifficultyFilter(value) {
  return value === "all" || RBT_ALLOWED_DIFFICULTIES.includes(value) ? value : "all";
}
function getResponseState(questionId, responses) {
  return responses?.[questionId] || {};
}

function matchesReviewFilter(question, responses, reviewFilter) {
  if (reviewFilter === "all") {
    return true;
  }

  const state = getResponseState(question.id, responses);
  const isAnswered = Boolean(state.submitted);
  const isIncorrect = isAnswered && !state.isCorrect;
  const isFlagged = Boolean(state.flagged);

  if (reviewFilter === "incorrect") {
    return isIncorrect;
  }

  if (reviewFilter === "flagged") {
    return isFlagged;
  }

  if (reviewFilter === "unanswered") {
    return !isAnswered;
  }

  return true;
}

function QuestionNavigator({
  open,
  onOpenChange,
  questions,
  responses,
  currentQuestionId,
  onSelectQuestion,
}) {
  const { language } = useLanguage();
  const answeredCount = questions.filter(
    (question) => getResponseState(question.id, responses).submitted,
  ).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{translateUi("Question Navigator", language)}</SheetTitle>
          <SheetDescription>
            {translateUi(
              "Jump to any question and review your flagged or unanswered items.",
              language,
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A]">
              <p className="text-slate-500 dark:text-slate-400">{translateUi("Total", language)}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-50">
                {questions.length}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-emerald-700">{translateUi("Answered", language)}</p>
              <p className="mt-1 text-lg font-semibold text-emerald-800">
                {answeredCount}
              </p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-amber-700">{translateUi("Flagged", language)}</p>
              <p className="mt-1 text-lg font-semibold text-amber-800">
                {
                  questions.filter(
                    (question) => getResponseState(question.id, responses).flagged,
                  ).length
                }
              </p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {questions.map((question, index) => {
              const state = getResponseState(question.id, responses);
              const isCurrent = currentQuestionId === question.id;

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => {
                    onSelectQuestion(question.id);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "relative rounded-xl border px-0 py-2 text-sm font-semibold transition-colors",
                    isCurrent && "border-[#1E5EFF] bg-[#1E5EFF]/10 text-[#1E5EFF]",
                    !isCurrent &&
                      state.submitted &&
                      state.isCorrect &&
                      "border-emerald-200 bg-emerald-50 text-emerald-700",
                    !isCurrent &&
                      state.submitted &&
                      !state.isCorrect &&
                      "border-red-200 bg-red-50 text-red-700",
                    !isCurrent &&
                      !state.submitted &&
                      "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628] dark:text-slate-400 dark:hover:bg-slate-900",
                  )}
                >
                  {index + 1}
                  {state.flagged ? (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber-400" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Practice() {
  const { language } = useLanguage();
  const [topicFilter, setTopicFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [questionSeed, setQuestionSeed] = useState(null);
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [started, setStarted] = useState(false);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [entitlements, setEntitlements] = useState(null);
  const queryClient = useQueryClient();

  const { data: profileData } = useQuery({
    queryKey: ["profile-data"],
    queryFn: api.getProfile,
  });

  useEffect(() => {
    if (profileData?.entitlements) {
      setEntitlements(profileData.entitlements);
    }
  }, [profileData]);

  const { data: fetchedQuestions = [], isLoading } = useQuery({
    queryKey: [
      "practice-questions",
      questionSeed,
      topicFilter,
      difficultyFilter,
    ],
    queryFn: () =>
      api.listQuestions({
        mode: "practice",
        seed: questionSeed,
        topic: topicFilter,
        difficulty: difficultyFilter,
        limit: PRACTICE_BATCH_SIZE,
      }),
    initialData: [],
    enabled: started && Boolean(questionSeed) && sessionQuestions.length === 0,
  });

  useEffect(() => {
    if (!started || sessionQuestions.length > 0 || fetchedQuestions.length === 0) {
      return;
    }

    setSessionQuestions(fetchedQuestions);
  }, [fetchedQuestions, sessionQuestions.length, started]);

  const attemptMutation = useMutation({
    mutationFn: api.createAttempt,
    onSuccess: (payload) => {
      setEntitlements(payload?.entitlements || entitlements);
      queryClient.invalidateQueries({ queryKey: ["profile-data"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-data"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: (error) => {
      toast({
        title:
          error?.data?.code === "plan_limit_reached"
            ? "Daily practice limit reached"
            : "Unable to save your answer",
        description:
          error?.data?.code === "plan_limit_reached"
            ? `Free accounts can answer ${FREE_DAILY_PRACTICE_LIMIT} practice questions per day.`
            : error.message || "Please try again.",
      });
    },
  });

  const { data: savedSession } = useQuery({
    queryKey: ["practice-session"],
    queryFn: api.getPracticeSession,
  });

  const baseFilteredQuestions = useMemo(
    () =>
      sessionQuestions.filter((question) => {
        const topicMatch = topicFilter === "all" || question.topic === topicFilter;
        const difficultyMatch =
          difficultyFilter === "all" || question.difficulty === difficultyFilter;

        return topicMatch && difficultyMatch;
      }),
    [difficultyFilter, sessionQuestions, topicFilter],
  );

  const questions = useMemo(
    () =>
      baseFilteredQuestions.filter(
        (question) =>
          question.id === currentQuestionId ||
          matchesReviewFilter(question, responses, reviewFilter),
      ),
    [baseFilteredQuestions, currentQuestionId, responses, reviewFilter],
  );

  const currentQuestion =
    questions.find((question) => question.id === currentQuestionId) || questions[0] || null;
  const currentIndex = currentQuestion
    ? questions.findIndex((question) => question.id === currentQuestion.id)
    : 0;

  const answeredCount = baseFilteredQuestions.filter(
    (question) => getResponseState(question.id, responses).submitted,
  ).length;
  const correctCount = baseFilteredQuestions.filter((question) => {
    const state = getResponseState(question.id, responses);
    return state.submitted && state.isCorrect;
  }).length;
  const flaggedCount = baseFilteredQuestions.filter(
    (question) => getResponseState(question.id, responses).flagged,
  ).length;
  const incorrectCount = baseFilteredQuestions.filter((question) => {
    const state = getResponseState(question.id, responses);
    return state.submitted && !state.isCorrect;
  }).length;
  const accuracy =
    answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const practiceRemaining = entitlements?.usage?.practice_questions_remaining;
  const practiceLimitReached = practiceRemaining === 0;
  const isComplete =
    started &&
    baseFilteredQuestions.length > 0 &&
    answeredCount >= baseFilteredQuestions.length;

  useEffect(() => {
    if (sessionHydrated) {
      return;
    }

    if (savedSession) {
      const nextResponses = isPlainObject(savedSession.responses) ? savedSession.responses : {};
      const nextQuestions = normalizeQuestionList(savedSession.questions);

      setTopicFilter(savedSession.topicFilter || "all");
      setDifficultyFilter(normalizeDifficultyFilter(savedSession.difficultyFilter || "all"));
      setReviewFilter(savedSession.reviewFilter || "all");
      setCurrentQuestionId(savedSession.currentQuestionId || null);
      setQuestionSeed(savedSession.questionSeed || null);
      setSessionQuestions(nextQuestions);
      setResponses(nextResponses);
      setStarted(Boolean(savedSession.started));
    }

    setSessionHydrated(true);
  }, [savedSession, sessionHydrated]);

  useEffect(() => {
    if (!sessionHydrated || !started) {
      return;
    }

    api.savePracticeSession({
      started,
      topicFilter,
      difficultyFilter,
      reviewFilter,
      questionSeed,
      questions: sessionQuestions,
      currentQuestionId,
      responses,
    });
  }, [
    currentQuestionId,
    difficultyFilter,
    questionSeed,
    responses,
    reviewFilter,
    sessionQuestions,
    sessionHydrated,
    started,
    topicFilter,
  ]);

  useEffect(() => {
    if (!started || questions.length === 0) {
      return;
    }

    if (!currentQuestionId || !questions.some((question) => question.id === currentQuestionId)) {
      setCurrentQuestionId(questions[0].id);
    }
  }, [currentQuestionId, questions, started]);

  const resetSessionState = () => {
    setSessionQuestions([]);
    setResponses({});
    setCurrentQuestionId(null);
    setQuestionSeed(null);
    setReviewFilter("all");
    queryClient.setQueryData(["practice-session"], null);
    api.clearPracticeSession();
  };

  const startSession = () => {
    resetSessionState();
    setQuestionSeed(`practice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    setStarted(true);
  };

  const endSession = () => {
    resetSessionState();
    setStarted(false);
  };

  const handleSelectAnswer = (answer) => {
    if (!currentQuestion) {
      return;
    }

    setResponses((current) => ({
      ...current,
      [currentQuestion.id]: {
        ...current[currentQuestion.id],
        selectedAnswer: answer,
      },
    }));
  };

  const handleAnswer = async (answer) => {
    if (!currentQuestion) {
      return;
    }

    if (practiceLimitReached) {
      setLimitDialogOpen(true);
      toast({
        title: "Daily practice limit reached",
        description: `Free accounts can answer ${FREE_DAILY_PRACTICE_LIMIT} practice questions per day.`,
      });
      return;
    }

    try {
      const payload = await attemptMutation.mutateAsync({
        question_id: currentQuestion.id,
        selected_answer: answer,
        source: "practice",
      });

      setResponses((current) => ({
        ...current,
        [currentQuestion.id]: {
          ...current[currentQuestion.id],
          selectedAnswer: answer,
          submitted: true,
          isCorrect: Boolean(payload?.is_correct),
          correctAnswer: payload?.correct_answer || "",
          explanation: payload?.explanation || "",
        },
      }));

      if (
        !isPremiumPlan(payload?.entitlements?.plan) &&
        payload?.entitlements?.usage?.practice_questions_remaining === 0
      ) {
        setLimitDialogOpen(true);
      }
    } catch (error) {
      if (error?.data?.code === "plan_limit_reached") {
        setLimitDialogOpen(true);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentQuestionId(questions[currentIndex + 1].id);
      return;
    }

    if (questions.length > 0) {
      setCurrentQuestionId(questions[0].id);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentQuestionId(questions[currentIndex - 1].id);
    }
  };

  const handleToggleFlag = () => {
    if (!currentQuestion) {
      return;
    }

    setResponses((current) => ({
      ...current,
      [currentQuestion.id]: {
        ...current[currentQuestion.id],
        flagged: !current[currentQuestion.id]?.flagged,
      },
    }));
  };

  const currentResponse = currentQuestion
    ? getResponseState(currentQuestion.id, responses)
    : {};

  const handleStartSession = () => {
    if (!isPremiumPlan(entitlements?.plan) && practiceRemaining === 0) {
      setLimitDialogOpen(true);
      return;
    }

    startSession();
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1E5EFF]/8">
            <HelpCircle className="h-8 w-8 text-[#1E5EFF]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {translateUi("Practice Questions", language)}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {translateUi(
              "Choose your topic and difficulty to start practicing.",
              language,
            )}
          </p>
        </div>

        <div className="space-y-6 rounded-[1.75rem] border border-slate-100 bg-white p-8 shadow-[0_18px_55px_-38px_rgba(15,23,42,0.3)] dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {translateUi("Topic", language)}
              </label>
              <Select value={topicFilter} onValueChange={setTopicFilter}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={translateUi("All Topics", language)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{translateUi("All Topics", language)}</SelectItem>
                  {Object.entries(topicLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {translateTopic(key, language) || label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {translateUi("Difficulty", language)}
              </label>
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={translateUi("All Levels", language)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{translateUi("All Levels", language)}</SelectItem>
                  <SelectItem value="beginner">{translateDifficulty("beginner", language)}</SelectItem>
                  <SelectItem value="intermediate">{translateDifficulty("intermediate", language)}</SelectItem>
                  <SelectItem value="advanced">{translateDifficulty("advanced", language)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1E5EFF]/12 bg-[linear-gradient(135deg,rgba(30,94,255,0.08),rgba(30,94,255,0.03))] p-4 text-sm text-slate-700 dark:text-slate-200">
            {isPremiumPlan(entitlements?.plan)
              ? translateUi(
                  `Premium unlocks unlimited answers across ${TOTAL_PRACTICE_QUESTIONS} practice questions and ${OFFICIAL_CONCEPT_COUNT} concepts.`,
                  language,
                )
              : translateUi(
                  `Free accounts can answer ${FREE_DAILY_PRACTICE_LIMIT} practice questions per day.`,
                  language,
                )}
          </div>

          <Button
            onClick={handleStartSession}
            className="w-full gap-2 rounded-xl py-6 text-base shadow-lg shadow-[#1E5EFF]/20 hover:bg-[#1E5EFF]/90"
            style={{ backgroundColor: "#1E5EFF" }}
          >
            <Zap className="h-5 w-5" />
            {translateUi("Start Practice Session", language)}
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-12 text-center dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
          <div className="mx-auto mb-4 h-6 w-1/2 rounded bg-slate-100" />
          <div className="mx-auto h-4 w-1/3 rounded bg-slate-50" />
        </div>
      </div>
    );
  }

  if (baseFilteredQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <div className="rounded-2xl border border-slate-100 bg-white p-12 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
          <HelpCircle className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-medium text-slate-500 dark:text-slate-400">
            {translateUi("No questions available for this filter.", language)}
          </p>
          <Button variant="outline" className="mt-4 rounded-xl" onClick={endSession}>
            {translateUi("Change Filters", language)}
          </Button>
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <div className="rounded-2xl border border-slate-100 bg-white p-12 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-[#FFB800]" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {translateUi("Session Complete!", language)}
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {translateUi(
              `You answered ${correctCount} out of ${answeredCount} correctly.`,
              language,
            )}
          </p>
          <div
            className="mt-4 text-5xl font-bold"
            style={{
              color:
                accuracy >= 80 ? "#10B981" : accuracy >= 60 ? "#FFB800" : "#EF4444",
            }}
          >
            {accuracy}%
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge variant="outline">{flaggedCount} {translateUi("flagged", language)}</Badge>
            <Badge variant="outline">{incorrectCount} {translateUi("incorrect", language)}</Badge>
          </div>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" className="rounded-xl" onClick={endSession}>
              {translateUi("New Session", language)}
            </Button>
            <Button
              className="rounded-xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
              onClick={() => {
                setResponses({});
                setCurrentQuestionId(baseFilteredQuestions[0]?.id || null);
                setReviewFilter("all");
              }}
            >
              {translateUi("Retry Same Questions", language)}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0 || !currentQuestion) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <div className="rounded-2xl border border-slate-100 bg-white p-12 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
          <p className="font-medium text-slate-700 dark:text-slate-200">
            {translateUi("No questions match the current review filter.", language)}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {translateUi("Try switching back to all questions or another review state.", language)}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setReviewFilter("all")}
            >
              {translateUi("Show All", language)}
            </Button>
            <Button className="rounded-xl" onClick={() => setNavigatorOpen(true)}>
              {translateUi("Open Navigator", language)}
            </Button>
          </div>
        </div>
        <QuestionNavigator
          open={navigatorOpen}
          onOpenChange={setNavigatorOpen}
          questions={baseFilteredQuestions}
          responses={responses}
          currentQuestionId={currentQuestionId}
          onSelectQuestion={setCurrentQuestionId}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_340px]">
        <div className="order-2 space-y-4 xl:order-1">
          {practiceLimitReached ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              {translateUi(
                "You reached today's free practice limit. You can keep reviewing these questions, or upgrade for unlimited answers.",
                language,
              )}
            </div>
          ) : null}

          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[#0D1E3A]">
            <div
              className="h-full rounded-full bg-[#1E5EFF] transition-all duration-500"
              style={{
                width: `${(answeredCount / baseFilteredQuestions.length) * 100}%`,
              }}
            />
          </div>

          <QuestionCard
            key={currentQuestion.id}
            question={currentQuestion}
            questionNumber={currentIndex + 1}
            totalQuestions={questions.length}
            selectedAnswer={currentResponse.selectedAnswer || null}
            isSubmitted={Boolean(currentResponse.submitted)}
            isFlagged={Boolean(currentResponse.flagged)}
            correctAnswer={currentResponse.correctAnswer || ""}
            explanation={currentResponse.explanation || ""}
            entitlements={entitlements}
            onEntitlementsChange={setEntitlements}
            onSelectAnswer={handleSelectAnswer}
            onToggleFlag={handleToggleFlag}
            onAnswer={handleAnswer}
            onNext={handleNext}
            onPrevious={currentIndex > 0 ? handlePrevious : null}
          />
        </div>

        <aside className="order-1 xl:order-2">
          <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 xl:sticky xl:top-24 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {translateUi("This Session", language)}
                </h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {translateUi(
                    "Session-only stats. Your dashboard tracks the bigger picture separately.",
                    language,
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                {practiceRemaining !== null && practiceRemaining !== undefined ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#FFB800]/20 bg-[#FFB800]/10 px-3 py-1 font-semibold text-[#C88700] dark:border-[#FFB800]/25 dark:bg-[#FFB800]/12 dark:text-[#FFD36B]">
                    <Crown className="h-3 w-3" />
                    {translateUi(`${practiceRemaining} free answers left today`, language)}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-[#1E5EFF]/10 bg-[#1E5EFF]/5 p-4">
                <div className="flex items-center gap-2 text-[#1E5EFF]">
                  <Target className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {translateUi("Accuracy", language)}
                  </span>
                </div>
                <p className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-50">
                  {accuracy}%
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {translateUi("Current session score", language)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A]/80">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <HelpCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {translateUi("Answered", language)}
                  </span>
                </div>
                <p className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-50">
                  {answeredCount}/{baseFilteredQuestions.length}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {translateUi("Questions completed in this session", language)}
                </p>
              </div>

              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                <div className="flex items-center gap-2 text-rose-500 dark:text-rose-300">
                  <ShieldAlert className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {translateUi("Incorrect", language)}
                  </span>
                </div>
                <p className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-50">
                  {incorrectCount}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {translateUi("Questions to revisit", language)}
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-300">
                  <Flag className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                    {translateUi("Flagged", language)}
                  </span>
                </div>
                <p className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-50">
                  {flaggedCount}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {translateUi("Marked for review", language)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setNavigatorOpen(true)}
              >
                <ListChecks className="h-4 w-4" />
                {translateUi("Navigator", language)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs"
                onClick={endSession}
              >
                {translateUi("End Session", language)}
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {reviewFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setReviewFilter(filter.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E5EFF]/15",
                    reviewFilter === filter.id
                      ? "border-[#1E5EFF] bg-[#1E5EFF]/10 text-[#1E5EFF]"
                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628] dark:text-slate-400 dark:hover:bg-slate-900",
                  )}
                >
                  {translateUi(filter.label, language)}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <QuestionNavigator
        open={navigatorOpen}
        onOpenChange={setNavigatorOpen}
        questions={baseFilteredQuestions}
        responses={responses}
        currentQuestionId={currentQuestionId}
        onSelectQuestion={setCurrentQuestionId}
      />

      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{translateUi("Free practice limit reached", language)}</DialogTitle>
            <DialogDescription>
              {translateUi(
                `You have used your ${FREE_DAILY_PRACTICE_LIMIT} free practice answers for today. Upgrade to Premium to keep answering without a daily cap.`,
                language,
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A] dark:text-slate-300">
            {translateUi(
              "Premium gives you unlimited practice, full mock exams, and complete analytics.",
              language,
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="rounded-xl" onClick={() => setLimitDialogOpen(false)}>
              {translateUi("Keep Reviewing", language)}
            </Button>
            <Button
              className="rounded-xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
              onClick={() => {
                setLimitDialogOpen(false);
                window.location.assign(createPageUrl("Pricing"));
              }}
            >
              {translateUi("Upgrade to Premium", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
