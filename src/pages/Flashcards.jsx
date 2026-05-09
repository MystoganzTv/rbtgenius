import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Filter,
  RotateCcw,
  Shuffle,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import BilingualText from "@/components/i18n/BilingualText";
import TranslateTextButton from "@/components/i18n/TranslateTextButton";
import { useLanguage } from "@/hooks/use-language";
import { localizeQuestion, translateDifficulty, translateTopic, translateUi } from "@/lib/i18n";
import { FREE_FLASHCARD_LIMIT, isPremiumPlan } from "@/lib/plan-access";
import { OFFICIAL_CONCEPT_COUNT } from "@/lib/question-bank";
import { createPageUrl } from "@/utils";

async function loadQuestions() {
  return api.listQuestions({ mode: "flashcards" });
}

async function storeAttempt(attempt) {
  return api.createAttempt(attempt);
}

export default function Flashcards() {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState([]);
  const [reviewCards, setReviewCards] = useState([]);
  const [filterTopic, setFilterTopic] = useState("all");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [cardHeight, setCardHeight] = useState(420);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const frontContentRef = useRef(null);
  const backContentRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: profileData } = useQuery({
    queryKey: ["profile-data"],
    queryFn: api.getProfile,
  });

  const { data: allQuestions = [], isLoading } = useQuery({
    queryKey: ["flashcard-questions"],
    queryFn: loadQuestions,
    initialData: [],
  });

  const attemptMutation = useMutation({
    mutationFn: storeAttempt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics-data"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
  });

  const isPremium = isPremiumPlan(profileData?.entitlements?.plan);
  const availableQuestions = useMemo(
    () => (isPremium ? allQuestions : allQuestions.slice(0, FREE_FLASHCARD_LIMIT)),
    [allQuestions, isPremium],
  );

  const filteredQuestions = useMemo(
    () =>
      availableQuestions.filter((question) => {
        const topicMatch = filterTopic === "all" || question.topic === filterTopic;
        const difficultyMatch =
          filterDifficulty === "all" || question.difficulty === filterDifficulty;

        return topicMatch && difficultyMatch && !masteredCards.includes(question.id);
      }),
    [availableQuestions, filterDifficulty, filterTopic, masteredCards],
  );
  const reviewedCardIds = useMemo(
    () => [...new Set([...masteredCards, ...reviewCards])],
    [masteredCards, reviewCards],
  );
  const flashcardLimitReached =
    !isPremium && availableQuestions.length > 0 && reviewedCardIds.length >= availableQuestions.length;

  const currentCard = filteredQuestions[currentIndex] || null;
  const localizedCurrentCard = useMemo(
    () => localizeQuestion(currentCard, language),
    [currentCard, language],
  );
  const spanishCurrentCard = useMemo(() => localizeQuestion(currentCard, "es"), [currentCard]);

  useEffect(() => {
    if (filteredQuestions.length === 0) {
      setCurrentIndex(0);
      setIsFlipped(false);
      return;
    }

    if (currentIndex > filteredQuestions.length - 1) {
      setCurrentIndex(0);
    }

    setIsFlipped(false);
  }, [currentIndex, filteredQuestions.length]);

  useLayoutEffect(() => {
    if (!currentCard) {
      return;
    }

    const measureHeight = () => {
      const frontHeight = frontContentRef.current?.scrollHeight ?? 0;
      const backHeight = backContentRef.current?.scrollHeight ?? 0;
      const nextHeight = Math.max(frontHeight + 112, backHeight + 112, 360);
      setCardHeight(nextHeight);
    };

    measureHeight();
    window.addEventListener("resize", measureHeight);

    return () => window.removeEventListener("resize", measureHeight);
  }, [currentCard]);

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((current) =>
      filteredQuestions.length > 0 && current < filteredQuestions.length - 1
        ? current + 1
        : 0,
    );
  };

  const handleMastered = async () => {
    if (!currentCard) {
      return;
    }

    if (flashcardLimitReached) {
      setLimitDialogOpen(true);
      return;
    }

    const nextReviewedCount = new Set([...reviewedCardIds, currentCard.id]).size;
    setMasteredCards((current) => [...current, currentCard.id]);
    setSessionStats((current) => ({
      ...current,
      correct: current.correct + 1,
    }));

    await attemptMutation.mutateAsync({
      question_id: currentCard.id,
      selected_answer: currentCard.correct_answer,
      is_correct: true,
      topic: currentCard.topic,
      source: "flashcards",
    });

    if (!isPremium && nextReviewedCount >= availableQuestions.length) {
      setLimitDialogOpen(true);
      return;
    }

    nextCard();
  };

  const handleNeedReview = async () => {
    if (!currentCard) {
      return;
    }

    if (flashcardLimitReached) {
      setLimitDialogOpen(true);
      return;
    }

    const nextReviewedCount = new Set([...reviewedCardIds, currentCard.id]).size;
    setReviewCards((current) =>
      current.includes(currentCard.id) ? current : [...current, currentCard.id],
    );
    setSessionStats((current) => ({
      ...current,
      incorrect: current.incorrect + 1,
    }));

    await attemptMutation.mutateAsync({
      question_id: currentCard.id,
      selected_answer: "",
      is_correct: false,
      topic: currentCard.topic,
      source: "flashcards",
    });

    if (!isPremium && nextReviewedCount >= availableQuestions.length) {
      setLimitDialogOpen(true);
      return;
    }

    nextCard();
  };

  const handleShuffle = () => {
    if (filteredQuestions.length === 0) {
      return;
    }

    setCurrentIndex(Math.floor(Math.random() * filteredQuestions.length));
    setIsFlipped(false);
  };

  const handleReset = () => {
    setMasteredCards([]);
    setReviewCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStats({ correct: 0, incorrect: 0 });
  };

  const progress =
    availableQuestions.length > 0
      ? (masteredCards.length / availableQuestions.length) * 100
      : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#1E5EFF] border-t-transparent" />
          <p className="text-slate-500">{translateUi("Loading flashcards...", language)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200/80 bg-white/95 px-5 py-4 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.25)] dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]/95 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {translateUi("Flashcards", language)}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {translateUi(
              `Review ${allQuestions.length} active questions across ${OFFICIAL_CONCEPT_COUNT} concepts in memorization mode with quick answer explanations.`,
              language,
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleShuffle} variant="outline" className="gap-2 rounded-xl">
            <Shuffle className="h-4 w-4" />
            {translateUi("Shuffle", language)}
          </Button>
          <Button onClick={handleReset} variant="outline" className="gap-2 rounded-xl">
            <RotateCcw className="h-4 w-4" />
            {translateUi("Reset", language)}
          </Button>
        </div>
      </div>

      {currentCard ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
          <div className="order-1 space-y-4">
            <Card className="border-[#1E5EFF]/10 p-4 shadow-[0_18px_55px_-40px_rgba(30,94,255,0.25)]">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Filter className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {translateUi("Filters:", language)}
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Select value={filterTopic} onValueChange={setFilterTopic}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder={translateUi("Topic", language)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{translateUi("All Topics", language)}</SelectItem>
                      <SelectItem value="measurement">{translateTopic("measurement", language)}</SelectItem>
                      <SelectItem value="assessment">{translateTopic("assessment", language)}</SelectItem>
                      <SelectItem value="skill_acquisition">{translateTopic("skill_acquisition", language)}</SelectItem>
                      <SelectItem value="behavior_reduction">{translateTopic("behavior_reduction", language)}</SelectItem>
                      <SelectItem value="documentation">{translateTopic("documentation", language)}</SelectItem>
                      <SelectItem value="professional_conduct">
                        {translateTopic("professional_conduct", language)}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder={translateUi("Difficulty", language)} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{translateUi("All", language)}</SelectItem>
                      <SelectItem value="beginner">{translateDifficulty("beginner", language)}</SelectItem>
                      <SelectItem value="intermediate">{translateDifficulty("intermediate", language)}</SelectItem>
                      <SelectItem value="advanced">{translateDifficulty("advanced", language)}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {!isPremium ? (
              <Card className="border-[#1E5EFF]/15 bg-[#1E5EFF]/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                      {translateUi(`Free flashcards: ${FREE_FLASHCARD_LIMIT} cards per session`, language)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {translateUi(
                        "Upgrade to Premium to unlock the full flashcard bank and keep reviewing without session limits.",
                        language,
                      )}
                    </p>
                  </div>
                  <Button
                    className="rounded-xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
                    onClick={() => window.location.assign(createPageUrl("Pricing"))}
                  >
                    {translateUi("Go Premium", language)}
                  </Button>
                </div>
              </Card>
            ) : null}

            <div className="w-full">
              <div className="mb-3 flex items-center justify-between">
                <Badge variant="outline" className="text-xs">
                  {translateUi("Card", language)} {currentIndex + 1} / {filteredQuestions.length}
                </Badge>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-[#1E5EFF]/10 text-[#1E5EFF]">
                    {translateTopic(currentCard.topic, language)}
                  </Badge>
                  <Badge variant="outline">{translateDifficulty(currentCard.difficulty, language)}</Badge>
                </div>
              </div>

              <div
                className="relative cursor-pointer [perspective:1000px]"
                style={{ height: `${cardHeight}px` }}
                onClick={() => setIsFlipped((current) => !current)}
              >
                <div
                  className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]"
                  style={{ transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
                >
                  <Card className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1E5EFF] to-[#6366F1] p-8 text-white [backface-visibility:hidden]">
                    <div ref={frontContentRef} className="text-center">
                      <p className="mb-4 text-xs uppercase tracking-wider opacity-80">
                        {translateUi("Question", language)}
                      </p>
                      <div className="flex items-start gap-3 text-left">
                        <BilingualText
                          content={localizedCurrentCard?.localizedText}
                          className="flex-1"
                          primaryClassName="text-2xl font-bold leading-relaxed"
                          secondaryClassName="text-white/70"
                        />
                        <TranslateTextButton
                          title="Question"
                          language={language}
                          englishText={currentCard?.text}
                          spanishText={spanishCurrentCard?.localizedText?.primary}
                          className="mt-1 flex-shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                          contentType="question"
                          question={currentCard}
                        />
                      </div>
                      <p className="mt-8 text-xs opacity-60">
                        {translateUi("Click to view the answer", language)}
                      </p>
                    </div>
                  </Card>

                  <Card
                    className="absolute inset-0 overflow-hidden border-2 border-[#1E5EFF] bg-white p-8 [backface-visibility:hidden] dark:bg-[#0B1628]"
                    style={{ transform: "rotateY(180deg)" }}
                  >
                    <div className="flex h-full flex-col justify-between pr-1">
                      <div ref={backContentRef}>
                        <p className="mb-4 text-xs uppercase tracking-wider text-[#1E5EFF]">
                          {translateUi("Correct Answer", language)}
                        </p>
                        <div className="mb-6 space-y-3">
                          {localizedCurrentCard?.options?.map((option) => (
                            <div
                              key={option.label}
                              className={`rounded-lg p-3 text-slate-900 dark:text-slate-100 ${
                                option.label === currentCard.correct_answer
                                  ? "border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                                  : "bg-slate-50 opacity-50 dark:bg-[#0D1E3A]"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1">
                                  <span className="font-semibold">{option.label}.</span>{" "}
                                  <BilingualText
                                    content={option.localizedText}
                                    className="inline-block align-middle"
                                    primaryClassName="inline"
                                    secondaryClassName="inline text-xs"
                                  />
                                </div>
                                <TranslateTextButton
                                  title="Translation"
                                  language={language}
                                  englishText={currentCard?.options?.find((englishOption) => englishOption.label === option.label)?.text}
                                  spanishText={spanishCurrentCard?.options?.find((spanishOption) => spanishOption.label === option.label)?.localizedText?.primary}
                                  className="h-7 w-7 flex-shrink-0"
                                  contentType="option"
                                  question={currentCard}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {currentCard.explanation ? (
                          <div className="space-y-3 rounded-lg bg-blue-50 p-4 dark:bg-[#0D1E3A]">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold text-[#1E5EFF]">
                                {translateUi("Explanation", language)}:
                              </p>
                              <TranslateTextButton
                                title="Explanation"
                                language={language}
                                englishText={currentCard?.explanation}
                                spanishText={spanishCurrentCard?.localizedExplanation?.primary}
                                className="h-7 w-7 flex-shrink-0"
                                contentType="explanation"
                                question={currentCard}
                              />
                            </div>
                            <BilingualText
                              content={localizedCurrentCard?.localizedExplanation}
                              primaryClassName="text-sm text-slate-700 dark:text-slate-200"
                              secondaryClassName="text-slate-500 dark:text-slate-400"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <Button
                  onClick={handleNeedReview}
                  variant="outline"
                  size="lg"
                  className="gap-2 border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                >
                  <ThumbsDown className="h-5 w-5 text-amber-600" />
                  {translateUi("Need Review", language)}
                </Button>
                <Button
                  onClick={handleMastered}
                  size="lg"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <ThumbsUp className="h-5 w-5" />
                  {translateUi("Mastered!", language)}
                </Button>
              </div>
            </div>
          </div>

          <aside className="order-2 xl:sticky xl:top-24">
            <div className="space-y-4 rounded-[2rem] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_55px_-40px_rgba(15,23,42,0.25)] dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]/95">
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
                <Card className="border-slate-200/80 p-4 dark:border-[#1E5EFF]/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">{translateUi("Total Cards", language)}</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                        {availableQuestions.length}
                      </p>
                    </div>
                    <Zap className="h-7 w-7 text-[#1E5EFF]" />
                  </div>
                </Card>
                <Card className="border-slate-200/80 p-4 dark:border-[#1E5EFF]/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">{translateUi("Mastered", language)}</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {masteredCards.length}
                      </p>
                    </div>
                    <Trophy className="h-7 w-7 text-emerald-600" />
                  </div>
                </Card>
                <Card className="border-slate-200/80 p-4 dark:border-[#1E5EFF]/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">{translateUi("Current Session", language)}</p>
                      <p className="text-2xl font-bold text-[#1E5EFF]">
                        {sessionStats.correct}
                      </p>
                    </div>
                    <ThumbsUp className="h-7 w-7 text-[#1E5EFF]" />
                  </div>
                </Card>
                <Card className="border-slate-200/80 p-4 dark:border-[#1E5EFF]/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500">{translateUi("Need Review", language)}</p>
                      <p className="text-2xl font-bold text-amber-600">
                        {reviewCards.length}
                      </p>
                    </div>
                    <ThumbsDown className="h-7 w-7 text-amber-600" />
                  </div>
                </Card>
              </div>

              <div className="rounded-2xl border border-[#1E5EFF]/10 bg-[#1E5EFF]/5 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {translateUi("Overall Progress", language)}
                  </span>
                  <span className="text-sm font-bold text-[#1E5EFF]">
                    {Math.round(progress)}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </div>
          </aside>
        </div>
      ) : (
        <>
          {!isPremium ? (
            <Card className="border-[#1E5EFF]/15 bg-[#1E5EFF]/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {translateUi(`Free flashcards: ${FREE_FLASHCARD_LIMIT} cards per session`, language)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {translateUi(
                      "Upgrade to Premium to unlock the full flashcard bank and keep reviewing without session limits.",
                      language,
                    )}
                  </p>
                </div>
                <Button
                  className="rounded-xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
                  onClick={() => window.location.assign(createPageUrl("Pricing"))}
                >
                  {translateUi("Go Premium", language)}
                </Button>
              </div>
            </Card>
          ) : null}

          <Card className="p-12 text-center">
            <Trophy className="mx-auto mb-4 h-16 w-16 text-[#FFB800]" />
            <h2 className="mb-2 text-2xl font-bold text-slate-900">
              Congratulations!
            </h2>
            <p className="mb-6 text-slate-600">
              {isPremium
                ? "You have completed every card for these filters."
                : `You finished your ${FREE_FLASHCARD_LIMIT} free flashcards for this session.`}
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                onClick={handleReset}
                className="bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
              >
                Start New Session
              </Button>
              {!isPremium ? (
                <Button
                  variant="outline"
                  onClick={() => window.location.assign(createPageUrl("Pricing"))}
                >
                  Upgrade to Premium
                </Button>
              ) : null}
            </div>
          </Card>
        </>
      )}

      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Free flashcard limit reached</DialogTitle>
            <DialogDescription>
              You have completed your {FREE_FLASHCARD_LIMIT} free flashcards for this session.
              Upgrade to Premium to unlock the full flashcard bank.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A] dark:text-slate-300">
            Premium removes flashcard session limits and also unlocks unlimited practice, full mock exams, and analytics.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setLimitDialogOpen(false)}
            >
              Keep Reviewing
            </Button>
            <Button
              className="rounded-xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
              onClick={() => {
                setLimitDialogOpen(false);
                window.location.assign(createPageUrl("Pricing"));
              }}
            >
              Upgrade to Premium
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
