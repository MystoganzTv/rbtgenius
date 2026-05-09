import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Brain,
  ClipboardCheck,
  Crown,
  GraduationCap,
  LayoutDashboard,
  MessageSquareMore,
  Moon,
  Sparkles,
  Sun,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicSiteFooter from "@/components/public/PublicSiteFooter";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { ACCESS_COMPARISON } from "@/lib/plan-access";
import { translateUi } from "@/lib/i18n";
import { OFFICIAL_CONCEPT_COUNT, TOTAL_PRACTICE_QUESTIONS } from "@/lib/question-bank";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";

const featureCards = [
  {
    title: "Practice With the Full Bank",
    description: `Work through ${TOTAL_PRACTICE_QUESTIONS} active practice questions organized across ${OFFICIAL_CONCEPT_COUNT} core concepts.`,
    Icon: Target,
  },
  {
    title: "Take Realistic Mock Exams",
    description: `Simulate the exam experience with timed tests pulled from the same ${TOTAL_PRACTICE_QUESTIONS}-question bank.`,
    Icon: ClipboardCheck,
  },
  {
    title: "Track Meaningful Progress",
    description: "See overall progress, streaks, readiness, and domain performance without noisy session swings.",
    Icon: LayoutDashboard,
  },
];

const premiumPreviewPanels = [
  {
    label: "Study Preview",
    title: "Smarter exam prep",
    subtitle: `Practice, flashcards, mock exams, and AI support built on the same ${TOTAL_PRACTICE_QUESTIONS}-question bank across ${OFFICIAL_CONCEPT_COUNT} concepts.`,
    accentClassName:
      "bg-emerald-500/14 text-emerald-300",
    Icon: Brain,
    renderMobileContent: (isDark) => (
      <div>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`rounded-[1.15rem] p-3 ${
              isDark ? "bg-white/[0.04]" : "bg-white/92 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.18)]"
            }`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Question bank
            </p>
            <p className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{TOTAL_PRACTICE_QUESTIONS}</p>
            <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>active questions</p>
          </div>
          <div
            className={`rounded-[1.15rem] p-3 ${
              isDark ? "bg-white/[0.04]" : "bg-white/92 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.18)]"
            }`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Concepts
            </p>
            <p className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{OFFICIAL_CONCEPT_COUNT}</p>
            <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>tracked concepts</p>
          </div>
        </div>
        <div className={`mt-4 h-px ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${isDark ? "bg-[#2D6BFF]/14 text-[#8EB0FF]" : "bg-[#2D6BFF]/8 text-[#1E5EFF]"}`}>Practice</span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${isDark ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50 text-emerald-700"}`}>Flashcards</span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${isDark ? "bg-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-700"}`}>Mock Exams</span>
        </div>
      </div>
    ),
    renderContent: (isDark) => (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className={`rounded-[1.4rem] border p-4 backdrop-blur-sm ${
              isDark
                ? "border-white/10 bg-white/5"
                : "border-slate-200 bg-white/88 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.25)]"
            }`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Question Bank
            </p>
            <p className={`mt-3 text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{TOTAL_PRACTICE_QUESTIONS}</p>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>active questions</p>
          </div>
          <div
            className={`rounded-[1.4rem] border p-4 backdrop-blur-sm ${
              isDark
                ? "border-white/10 bg-white/5"
                : "border-slate-200 bg-white/88 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.25)]"
            }`}
          >
            <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Concepts
            </p>
            <p className={`mt-3 text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>{OFFICIAL_CONCEPT_COUNT}</p>
            <p className={`mt-1 text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>tracked concepts</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`rounded-[1.2rem] border px-4 py-3 text-sm font-medium ${isDark ? "border-[#2D6BFF]/30 bg-[#2D6BFF]/14 text-[#8EB0FF]" : "border-[#2D6BFF]/18 bg-[#2D6BFF]/8 text-[#1E5EFF]"}`}>
            Practice
          </div>
          <div className={`rounded-[1.2rem] border px-4 py-3 text-sm font-medium ${isDark ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300" : "border-emerald-300/40 bg-emerald-50 text-emerald-700"}`}>
            Flashcards
          </div>
          <div className={`rounded-[1.2rem] border px-4 py-3 text-sm font-medium ${isDark ? "border-amber-400/20 bg-amber-500/10 text-amber-300" : "border-amber-300/40 bg-amber-50 text-amber-700"}`}>
            Mock Exams
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "Premium Preview",
    title: "Mock exam confidence",
    subtitle: "Timed exams with clearer signals on whether you are ready to test.",
    accentClassName:
      "bg-[#2D6BFF]/14 text-[#8EB0FF]",
    Icon: ClipboardCheck,
    renderMobileContent: (isDark) => (
      <div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Mock readiness
            </p>
            <p className={`mt-2 text-3xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>212</p>
            <p className={`mt-1 text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>average scaled score</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-semibold ${isDark ? "bg-amber-500/16 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
            Keep practicing
          </span>
        </div>
        <div className={`mt-4 h-3 rounded-full p-0.5 ${isDark ? "bg-white/8" : "bg-slate-100"}`}>
          <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#FF8A3D] via-[#FFB800] to-emerald-400" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className={`rounded-[1rem] p-3 ${isDark ? "bg-white/[0.04]" : "bg-white/92 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.18)]"}`}>
            <p className="text-2xl font-black text-emerald-300">2</p>
            <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>passed</p>
          </div>
          <div className={`rounded-[1rem] p-3 ${isDark ? "bg-white/[0.04]" : "bg-white/92 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.18)]"}`}>
            <p className={`text-2xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>6</p>
            <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>taken</p>
          </div>
          <div className={`rounded-[1rem] p-3 ${isDark ? "bg-white/[0.04]" : "bg-white/92 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.18)]"}`}>
            <p className="text-2xl font-black text-amber-300">4</p>
            <p className={`text-[11px] ${isDark ? "text-slate-400" : "text-slate-500"}`}>review</p>
          </div>
        </div>
      </div>
    ),
    renderContent: (isDark) => (
      <div className="space-y-4">
        <div
          className={`rounded-[1.4rem] border p-5 backdrop-blur-sm ${
            isDark
              ? "border-white/10 bg-white/5"
              : "border-slate-200 bg-white/88 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.25)]"
          }`}
        >
          <div className="flex items-center justify-between text-sm">
            <span className={`font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>Average mock score</span>
            <span className={`rounded-full px-3 py-1 font-semibold ${isDark ? "bg-amber-500/16 text-amber-300" : "bg-amber-100 text-amber-700"}`}>
              Keep practicing
            </span>
          </div>
          <div className="mt-5">
            <div className={`h-4 rounded-full p-1 ${isDark ? "bg-white/8" : "bg-slate-100"}`}>
              <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#FF8A3D] via-[#FFB800] to-emerald-400" />
            </div>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className={`text-4xl font-black ${isDark ? "text-white" : "text-slate-900"}`}>212</p>
                <p className={`text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>scaled average score</p>
              </div>
              <div className={`text-right text-sm ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                <p>6 mock exams taken</p>
                <p>2 passed, 4 to review</p>
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-[1.2rem] border px-4 py-3 ${isDark ? "border-emerald-400/18 bg-emerald-500/8" : "border-emerald-300/40 bg-emerald-50"}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Passed
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-300">2</p>
          </div>
          <div className={`rounded-[1.2rem] border px-4 py-3 ${isDark ? "border-amber-400/18 bg-amber-500/8" : "border-amber-300/40 bg-amber-50"}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Need review
            </p>
            <p className="mt-2 text-2xl font-black text-amber-300">4</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    label: "Study Preview",
    title: "Ask the AI coach",
    subtitle: "Get quick explanations, study prompts, and targeted help when you get stuck.",
    accentClassName:
      "bg-violet-500/14 text-violet-300",
    Icon: MessageSquareMore,
    renderMobileContent: (isDark) => (
      <div>
        <div className={`max-w-[85%] rounded-2xl rounded-bl-md px-3 py-2 text-xs ${isDark ? "bg-white/8 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
          Why is differential reinforcement better than just saying “no”?
        </div>
        <div className="mt-3 ml-auto max-w-[82%] rounded-2xl rounded-br-md bg-[#2D6BFF] px-3 py-2 text-xs text-white">
          It teaches what to do instead, so the learner has a replacement behavior to reinforce.
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${isDark ? "bg-violet-500/10 text-violet-300" : "bg-violet-50 text-violet-700"}`}>Concepts</span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${isDark ? "bg-white/6 text-slate-300" : "bg-slate-100 text-slate-600"}`}>Explain</span>
          <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${isDark ? "bg-white/6 text-slate-300" : "bg-slate-100 text-slate-600"}`}>Prompts</span>
        </div>
      </div>
    ),
    renderContent: (isDark) => (
      <div className="space-y-4">
        <div
          className={`space-y-3 rounded-[1.4rem] border p-5 backdrop-blur-sm ${
            isDark
              ? "border-white/10 bg-white/5"
              : "border-slate-200 bg-white/88 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.25)]"
          }`}
        >
          <div className={`max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-sm ${isDark ? "bg-white/8 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
            Why is differential reinforcement better than just saying “no”?
          </div>
          <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-[#2D6BFF] px-4 py-3 text-sm text-white">
            Because it teaches what to do instead, not only what to stop. That makes the
            replacement behavior easier to reinforce consistently.
          </div>
          <div className={`flex items-center gap-2 pt-2 text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Unlimited premium AI support
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`rounded-[1.2rem] border px-4 py-3 text-sm font-medium ${isDark ? "border-violet-400/20 bg-violet-500/10 text-violet-300" : "border-violet-300/40 bg-violet-50 text-violet-700"}`}>
            RBT concepts
          </div>
          <div className={`rounded-[1.2rem] border px-4 py-3 text-sm font-medium ${isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
            Quick explanations
          </div>
          <div className={`rounded-[1.2rem] border px-4 py-3 text-sm font-medium ${isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-slate-200 bg-white text-slate-600"}`}>
            Study prompts
          </div>
        </div>
      </div>
    ),
  },
];

const offeringCards = [
  {
    eyebrow: "Available now",
    title: "Practice",
    description: `Work through the shared ${TOTAL_PRACTICE_QUESTIONS}-question bank with topic and difficulty filters.`,
    Icon: Target,
    className:
      "border-[#2D6BFF]/16 bg-[#2D6BFF]/7 text-[#1E5EFF] dark:border-[#2D6BFF]/24 dark:bg-[#2D6BFF]/10 dark:text-[#8EB0FF]",
  },
  {
    eyebrow: "Available now",
    title: "Flashcards",
    description: "Study the same shared bank in memory mode with quick answer explanations.",
    Icon: Brain,
    className:
      "border-emerald-300/35 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300",
  },
  {
    eyebrow: "Premium",
    title: "Mock Exams and Analytics",
    description: "Take timed 85-question mock exams and unlock readiness, coverage, and domain trends.",
    Icon: LayoutDashboard,
    className:
      "border-amber-300/40 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300",
  },
  {
    eyebrow: "Coming soon",
    title: "40-Hour Course",
    description: "Planned for a future release. It is not included in the current membership yet.",
    Icon: GraduationCap,
    className:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300",
  },
];

export default function Landing() {
  const { isDark, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);
  const [outgoingPreviewIndex, setOutgoingPreviewIndex] = useState(null);
  const outgoingPanel =
    outgoingPreviewIndex !== null ? premiumPreviewPanels[outgoingPreviewIndex] : null;

  const rotatePreview = (nextIndex) => {
    setActivePreviewIndex((current) => {
      const resolvedNext =
        typeof nextIndex === "number"
          ? nextIndex % premiumPreviewPanels.length
          : (current + 1) % premiumPreviewPanels.length;

      if (resolvedNext === current) {
        return current;
      }

      setOutgoingPreviewIndex(current);
      window.setTimeout(() => {
        setOutgoingPreviewIndex((previous) => (previous === current ? null : previous));
      }, 3200);

      return resolvedNext;
    });
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      rotatePreview();
    }, 6400);

    return () => window.clearInterval(intervalId);
  }, []);

  const renderDesktopWindowBar = (title, stateLabel) => (
    <div
      className={`flex items-center justify-between border-b px-5 py-3 ${
        isDark ? "border-white/8 bg-white/[0.025]" : "border-slate-200/80 bg-white/65"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
        <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
        <span className="h-3 w-3 rounded-full bg-[#28C840]" />
      </div>
      <div className="flex items-center gap-3">
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {title}
        </p>
        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
            isDark ? "border-white/10 bg-white/[0.03] text-slate-400" : "border-slate-200 bg-white/85 text-slate-500"
          }`}
        >
          {stateLabel}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-foreground dark:bg-background">
      <header className="border-b border-slate-200/70 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-[#1E5EFF]">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div className="flex min-w-0 items-center gap-1">
              <span className="truncate text-base font-bold text-slate-900 dark:text-slate-50 sm:text-lg">RBT</span>
              <span className="truncate text-base font-bold text-[#1E5EFF] sm:text-lg">Genius</span>
              <Sparkles className="h-3.5 w-3.5 text-[#FFB800]" />
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              onClick={toggleTheme}
            >
              {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </Button>
            {isAuthenticated ? (
              <Link to={createPageUrl("Dashboard")}>
                <Button className="rounded-xl bg-[#1E5EFF] px-3 text-sm hover:bg-[#1E5EFF]/90 sm:px-4 sm:text-base">
                  <span className="hidden sm:inline">Go to Dashboard</span>
                  <span className="sm:hidden">Dashboard</span>
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block">
                  <Button variant="ghost" className="rounded-xl">
                    Log In
                  </Button>
                </Link>
                <Link to="/login?mode=register">
                  <Button className="rounded-xl bg-[#1E5EFF] px-3 text-sm hover:bg-[#1E5EFF]/90 sm:px-4 sm:text-base">
                    <span className="hidden sm:inline">Create Account</span>
                    <span className="sm:hidden">Start</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1E5EFF]/15 bg-[#1E5EFF]/8 px-4 py-2 text-xs font-medium text-[#1E5EFF] dark:border-[#1E5EFF]/20 dark:bg-[#1E5EFF]/10 dark:text-[#8EB0FF] sm:text-sm">
              <Sparkles className="h-4 w-4" />
              {translateUi("Built for RBT exam prep", language)}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[0.96] text-slate-900 dark:text-slate-50 sm:mt-6 sm:text-5xl lg:text-6xl">
              {translateUi("Study with structure, not guesswork.", language)}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300 sm:mt-6 sm:text-xl">
              {translateUi(
                "RBT Genius helps future technicians practice consistently, review with flashcards, take realistic mock exams, and track progress across exam prep.",
                language,
              )}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
              {isAuthenticated ? (
                <Link to={createPageUrl("Dashboard")}>
                  <Button className="h-12 w-full rounded-2xl bg-[#1E5EFF] px-6 text-base shadow-lg shadow-[#1E5EFF]/20 hover:bg-[#1E5EFF]/90 sm:w-auto">
                    Continue to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login?mode=register">
                    <Button className="h-12 w-full rounded-2xl bg-[#1E5EFF] px-6 text-base shadow-lg shadow-[#1E5EFF]/20 hover:bg-[#1E5EFF]/90 sm:w-auto">
                      Start Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" className="h-12 w-full rounded-2xl px-6 text-base sm:w-auto">
                      I already have an account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="relative min-h-[380px] px-0 py-2 sm:min-h-[520px] sm:px-2 sm:py-6 lg:px-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_28%,rgba(45,107,255,0.10),transparent_23%),radial-gradient(circle_at_34%_74%,rgba(139,92,246,0.08),transparent_22%)] blur-3xl" />
            <div className="mx-auto mb-3 hidden max-w-[22rem] text-center sm:mb-4 sm:max-w-[34rem] sm:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FFB800]/20 bg-[#FFB800]/10 px-4 py-2 text-[11px] font-medium text-[#C88700] dark:border-[#FFB800]/25 dark:bg-[#FFB800]/12 dark:text-[#FFD36B] sm:text-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Study Preview
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400 sm:max-w-md">
                A quick look at what exists today: shared-bank practice, flashcards,
                premium mock exams, and readiness tracking.
              </p>
            </div>
            <div className="relative mx-auto max-w-[22rem] sm:hidden">
              {(() => {
                const activePanel = premiumPreviewPanels[activePreviewIndex];

                return (
                  <div
                    className={`rounded-[2rem] border p-3 ${
                      isDark
                        ? "border-slate-800 bg-[linear-gradient(180deg,#0b1224,#0a1020)]"
                        : "border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_30px_80px_-50px_rgba(15,23,42,0.18)]"
                    }`}
                  >
                    <div className="mb-3 flex justify-start">
                      <span className="inline-flex items-center gap-2 rounded-full border border-[#FFB800]/20 bg-[#FFB800]/10 px-4 py-2 text-[11px] font-medium text-[#C88700] dark:border-[#FFB800]/25 dark:bg-[#FFB800]/12 dark:text-[#FFD36B]">
                        <Sparkles className="h-3.5 w-3.5" />
                        Study Preview
                      </span>
                    </div>
                    <div
                      className={`overflow-hidden rounded-[1.75rem] ${
                        isDark
                          ? "bg-[linear-gradient(180deg,#0f1930,#0b1427)] shadow-[0_30px_80px_-50px_rgba(15,23,42,0.9)]"
                          : "bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_24px_60px_-42px_rgba(15,23,42,0.16)]"
                      }`}
                    >
                      <div
                        className={`rounded-[1.75rem] ${
                          isDark
                            ? "bg-[linear-gradient(180deg,rgba(18,31,58,0.94),rgba(10,18,35,0.9))] text-white backdrop-blur-xl"
                            : "bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] text-slate-900 backdrop-blur-xl"
                        }`}
                        style={{
                          animation:
                            "landing-preview-mobile-enter 560ms cubic-bezier(0.19, 1, 0.22, 1) both",
                        }}
                      >
                        <div
                          className={`flex items-center justify-between border-b px-4 py-3 ${
                            isDark ? "border-white/8" : "border-slate-200/80"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
                            <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
                            <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
                          </div>
                          <div className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            RBT Genius
                          </div>
                        </div>
                        <div className="flex min-h-[246px] flex-col p-4 pb-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${activePanel.accentClassName}`}
                            >
                              <activePanel.Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p
                                className={`text-sm font-semibold leading-tight ${
                                  isDark ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {activePanel.title}
                              </p>
                              <p
                                className={`text-xs leading-5 ${
                                  isDark ? "text-slate-300" : "text-slate-500"
                                }`}
                              >
                                {activePanel.subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex-1">
                            {(activePanel.renderMobileContent ?? activePanel.renderContent)(isDark)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="relative mx-auto hidden h-[470px] max-w-[34rem] sm:block">
              {premiumPreviewPanels.map(
                ({ label, title, subtitle, accentClassName, Icon, renderContent }, index) => {
                  if (index === outgoingPreviewIndex) {
                    return null;
                  }

                  const order =
                    (index - activePreviewIndex + premiumPreviewPanels.length) %
                    premiumPreviewPanels.length;
                  const isFrontCard = order === 0;

                  const cardStyles = [
                    "z-30 translate-x-0 translate-y-5 rotate-[-3deg] scale-100 opacity-100 shadow-[0_32px_72px_-42px_rgba(15,23,42,0.28)] sm:translate-y-8 sm:rotate-[-4.5deg] sm:shadow-[0_40px_100px_-52px_rgba(15,23,42,0.32)]",
                    "z-20 translate-x-4 translate-y-1 rotate-[3.5deg] scale-[0.98] opacity-[0.45] sm:translate-x-9 sm:rotate-[5.5deg] sm:scale-[0.972] sm:opacity-[0.58]",
                    "z-10 translate-x-8 translate-y-8 rotate-[6deg] scale-[0.955] opacity-[0.18] sm:translate-x-16 sm:translate-y-12 sm:rotate-[9deg] sm:scale-[0.94] sm:opacity-[0.34]",
                  ];

                  return (
                    <button
                      key={title}
                      type="button"
                      aria-label={`Show ${title} preview`}
                      onClick={() => rotatePreview(index)}
                      className={`absolute left-1/2 top-0 w-[96%] -translate-x-1/2 rounded-[1.9rem] border text-left transition-all will-change-transform sm:w-[92%] sm:rounded-[2.1rem] ${cardStyles[order]} ${
                        isFrontCard
                          ? isDark
                            ? "border-slate-300/12 bg-[linear-gradient(180deg,rgba(18,31,58,0.9),rgba(10,18,35,0.86))] text-white backdrop-blur-xl"
                            : "border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] text-slate-900 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.20)] backdrop-blur-xl"
                          : isDark
                            ? "border-slate-300/10 bg-[linear-gradient(180deg,rgba(23,36,68,0.24),rgba(11,19,38,0.18))] text-white backdrop-blur-md"
                            : "border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.58))] text-slate-700 shadow-[0_20px_50px_-46px_rgba(15,23,42,0.12)] backdrop-blur-md"
                      }`}
                      style={{
                        transitionTimingFunction: "cubic-bezier(0.19, 1, 0.22, 1)",
                        transitionDuration: "3000ms",
                      }}
                    >
                      <div className="overflow-hidden rounded-[1.9rem] sm:rounded-[2.1rem]">
                        {renderDesktopWindowBar(title, order === 0 ? "Now" : order === 1 ? "Next" : "Then")}
                        <div
                          className="flex min-h-[290px] flex-col p-5 pb-5 sm:min-h-[390px] sm:p-6 sm:pb-7"
                          style={{
                            animation:
                              order % 2 === 0
                                ? `landing-preview-drift ${isFrontCard ? "8.5s" : "10.5s"} ease-in-out infinite`
                                : `landing-preview-drift-alt ${isFrontCard ? "9.25s" : "11.25s"} ease-in-out infinite`,
                            animationDelay: `${index * 0.45}s`,
                          }}
                        >
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div
                              className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${accentClassName}`}
                            >
                              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] sm:text-[11px] sm:tracking-[0.24em] ${isDark ? "text-slate-500/90" : "text-slate-400"}`}>
                                {label}
                              </p>
                              <p className={`text-sm font-semibold leading-tight sm:text-base ${isDark ? "text-white" : "text-slate-900"}`}>
                                {title}
                              </p>
                              <p className={`max-w-md text-xs leading-5 sm:text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                                {subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex-1">
                            {isFrontCard ? (
                              renderContent(isDark)
                            ) : (
                              <div className="space-y-4">
                                <div className={`rounded-[1.3rem] p-4 sm:rounded-[1.55rem] sm:p-5 ${isDark ? "bg-white/[0.03]" : "bg-white/65"}`}>
                                  <div className="flex items-center justify-between">
                                    <div className={`h-3 w-28 rounded-full ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                                    <div className={`h-8 w-24 rounded-full ${isDark ? "bg-white/[0.05]" : "bg-white/90 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.9)]"}`} />
                                  </div>
                                  <div className="mt-4 space-y-3">
                                    <div className={`h-12 rounded-[1.2rem] ${isDark ? "bg-white/[0.06]" : "bg-slate-100"}`} />
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div className={`h-24 rounded-[1.2rem] ${isDark ? "bg-white/[0.04]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                                      <div className={`h-24 rounded-[1.2rem] ${isDark ? "bg-white/[0.04]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                                    </div>
                                  </div>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-3">
                                  <div className={`h-16 rounded-[1.1rem] ${isDark ? "bg-white/[0.04]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                                  <div className={`h-16 rounded-[1.1rem] ${isDark ? "bg-white/[0.04]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                                  <div className={`h-16 rounded-[1.1rem] ${isDark ? "bg-white/[0.04]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                },
              )}

              {outgoingPanel ? (
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute left-1/2 top-0 z-40 w-[96%] -translate-x-1/2 rounded-[1.9rem] border text-left sm:w-[92%] sm:rounded-[2.1rem] ${
                    isDark
                      ? "border-slate-300/12 bg-[linear-gradient(180deg,rgba(18,31,58,0.9),rgba(10,18,35,0.86))] text-white backdrop-blur-xl"
                      : "border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] text-slate-900 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.20)] backdrop-blur-xl"
                  }`}
                  style={{
                    animation:
                      "landing-preview-orbit-exit 3200ms cubic-bezier(0.19, 1, 0.22, 1) forwards",
                  }}
                >
                  <div className="overflow-hidden rounded-[1.9rem] sm:rounded-[2.1rem]">
                    {renderDesktopWindowBar(outgoingPanel.title, "Passing")}
                    <div className="flex min-h-[290px] flex-col p-5 pb-5 sm:min-h-[390px] sm:p-6 sm:pb-7">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div
                          className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${outgoingPanel.accentClassName}`}
                        >
                          <outgoingPanel.Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] sm:text-[11px] sm:tracking-[0.24em] ${isDark ? "text-slate-500/90" : "text-slate-400"}`}>
                            {outgoingPanel.label}
                          </p>
                          <p className={`text-sm font-semibold leading-tight sm:text-base ${isDark ? "text-white" : "text-slate-900"}`}>
                            {outgoingPanel.title}
                          </p>
                          <p className={`max-w-md text-xs leading-5 sm:text-sm ${isDark ? "text-slate-300" : "text-slate-500"}`}>
                            {outgoingPanel.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex-1 space-y-4">
                        <div className={`rounded-[1.3rem] p-4 sm:rounded-[1.55rem] sm:p-5 ${isDark ? "bg-white/[0.025]" : "bg-white/70"}`}>
                          <div className="flex items-center justify-between">
                            <div className={`h-3 w-28 rounded-full ${isDark ? "bg-white/10" : "bg-slate-200"}`} />
                            <div className={`h-8 w-24 rounded-full ${isDark ? "bg-white/[0.03]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                          </div>
                          <div className="mt-4 space-y-3">
                            <div className={`h-12 rounded-[1.2rem] ${isDark ? "bg-white/[0.05]" : "bg-slate-100"}`} />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className={`h-24 rounded-[1.2rem] ${isDark ? "bg-white/[0.03]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                              <div className={`h-24 rounded-[1.2rem] ${isDark ? "bg-white/[0.03]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className={`h-16 rounded-[1.1rem] ${isDark ? "bg-white/[0.03]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                          <div className={`h-16 rounded-[1.1rem] ${isDark ? "bg-white/[0.03]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                          <div className={`h-16 rounded-[1.1rem] ${isDark ? "bg-white/[0.03]" : "bg-white/85 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]"}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-4 md:mt-16 md:gap-5 md:grid-cols-3">
          {featureCards.map(({ title, description, Icon }) => (
            <div
              key={title}
              className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1E5EFF]/10 text-[#1E5EFF] dark:bg-[#1E5EFF]/12 dark:text-[#8EB0FF]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          ))}
        </section>


        {/* ── Mobile App Section ── */}
        <section className="mt-14 sm:mt-16">
          <div className={`rounded-[2rem] border p-5 sm:p-8 ${isDark ? "border-slate-800 bg-slate-950" : "border-slate-200/80 bg-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)]"}`}>
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-12">

              {/* Left copy */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  Native iOS &amp; Android App
                </div>
                <h2 className={`mt-5 text-2xl font-black tracking-tight sm:text-3xl ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                  Study anywhere — even offline.
                </h2>
                <p className={`mt-3 text-base leading-7 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  The RBT Genius native app gives you the full experience on your iPhone or Android device. Practice questions, flashcards, and mock exams — all in your pocket with the same account you use on the web.
                </p>

                <ul className="mt-6 space-y-3">
                  {[
                    "1,100+ practice questions available offline",
                    "85-question timed mock exams with pass/fail scoring",
                    "Tap-to-flip flashcards with topic filters",
                    "Haptic feedback and native iOS feel",
                  ].map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" /></svg>
                      </span>
                      <span className={`text-sm leading-5 ${isDark ? "text-slate-300" : "text-slate-600"}`}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <a
                    href="https://apps.apple.com/app/rbt-genius/id0000000000"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-3 rounded-2xl border px-5 py-3 transition-opacity hover:opacity-80 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50 shadow-sm"}`}
                  >
                    <svg className={`h-7 w-7 ${isDark ? "text-white" : "text-slate-900"}`} viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                    <div>
                      <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Download on the</p>
                      <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>App Store</p>
                    </div>
                  </a>
                  <a
                    href="https://play.google.com/store/apps/details?id=com.rbtgenius.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-3 rounded-2xl border px-5 py-3 transition-opacity hover:opacity-80 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-slate-50 shadow-sm"}`}
                  >
                    <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none"><path d="M3.18 23.76a2 2 0 01-.68-.62V.86a2 2 0 01.68-.62l.1-.05L13.37 12l-10.09 11.8-.1-.04z" fill="#EA4335"/><path d="M17.31 15.93L13.73 12.3l3.58-3.63 4.24 2.43a1.42 1.42 0 010 2.4l-4.24 2.43z" fill="#FBBC04"/><path d="M3.18.24l10.55 10.56-3.58 3.63L3.18.86V.24z" fill="#4285F4"/><path d="M3.18 23.76V23.14l7.01-7.01 3.54 3.55L3.18 23.76z" fill="#34A853"/></svg>
                    <div>
                      <p className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>Get it on</p>
                      <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Google Play</p>
                    </div>
                  </a>
                </div>
              </div>

              {/* Right phone mockup */}
              <div className="flex justify-center lg:justify-end">
                <div className={`relative w-[220px] rounded-[2.8rem] border-[6px] p-2 shadow-2xl sm:w-[260px] ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-300 bg-white"}`}>
                  {/* Notch */}
                  <div className={`mx-auto mb-2 h-5 w-20 rounded-full ${isDark ? "bg-slate-800" : "bg-slate-200"}`} />
                  {/* Screen */}
                  <div className={`rounded-[2rem] p-4 ${isDark ? "bg-[#020617]" : "bg-[#EEF4FB]"}`} style={{minHeight: 380}}>
                    {/* Top bar */}
                    <div className="mb-4">
                      <p className={`text-[10px] font-semibold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>Practice</p>
                      <p className={`text-sm font-black ${isDark ? "text-white" : "text-slate-900"}`}>ABA Principles</p>
                    </div>
                    {/* Question card */}
                    <div className={`rounded-2xl p-4 mb-3 ${isDark ? "bg-[#0f172a]" : "bg-white"}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${isDark ? "text-[#4F8CFF]" : "text-[#1E5EFF]"}`}>Question 1 / 24</p>
                      <p className={`text-xs font-semibold leading-4 ${isDark ? "text-white" : "text-slate-900"}`}>Which schedule of reinforcement is most resistant to extinction?</p>
                    </div>
                    {/* Answer options */}
                    {[
                      { label: "A", text: "Fixed Ratio", correct: false },
                      { label: "B", text: "Variable Ratio", correct: true },
                      { label: "C", text: "Fixed Interval", correct: false },
                    ].map((opt) => (
                      <div key={opt.label} className={`mb-2 flex items-center gap-2 rounded-xl px-3 py-2 ${opt.correct ? "bg-emerald-500/15 border border-emerald-500/30" : isDark ? "bg-white/5" : "bg-white/70"}`}>
                        <span className={`flex h-5 w-5 items-center justify-center rounded-md text-[9px] font-black ${opt.correct ? "bg-emerald-500 text-white" : isDark ? "bg-white/10 text-slate-400" : "bg-slate-100 text-slate-500"}`}>{opt.label}</span>
                        <span className={`text-[10px] font-semibold ${opt.correct ? "text-emerald-400" : isDark ? "text-slate-300" : "text-slate-600"}`}>{opt.text}</span>
                        {opt.correct && <span className="ml-auto text-emerald-400 text-xs">✓</span>}
                      </div>
                    ))}
                  </div>
                  {/* Home bar */}
                  <div className={`mx-auto mt-2 h-1 w-16 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-300"}`} />
                </div>
              </div>

            </div>
          </div>
        </section>

        <section className="mt-14 rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950 sm:mt-16 sm:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#1E5EFF]/15 bg-[#1E5EFF]/8 px-4 py-2 text-sm font-medium text-[#1E5EFF] dark:border-[#1E5EFF]/20 dark:bg-[#1E5EFF]/10 dark:text-[#8EB0FF]">
              <Sparkles className="h-4 w-4" />
              What you get today
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              The current offer, without padding.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-500 dark:text-slate-400">
              Today RBT Genius sells a shared question bank across practice, flashcards, and
              mock exams, plus readiness analytics. The 40-hour course is not
              live yet, so it is shown here as a future release only.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-5">
            {offeringCards.map(({ eyebrow, title, description, Icon, className }) => (
              <div
                key={title}
                className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${className}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                  {eyebrow}
                </p>
                <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950 sm:mt-16 sm:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FFB800]/20 bg-[#FFB800]/10 px-4 py-2 text-sm font-medium text-[#C88700] dark:border-[#FFB800]/25 dark:bg-[#FFB800]/12 dark:text-[#FFD36B]">
              <Crown className="h-4 w-4" />
              Guest, Free, and Premium
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl">
              See what changes when you upgrade.
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-500 dark:text-slate-400">
              Guests can review the landing and pricing, free members get guided daily study tools,
              and Premium unlocks unlimited prep with full analytics and mock exams.
            </p>
          </div>

          <div className="mt-8 hidden overflow-x-auto md:block">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Guest
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Free
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {ACCESS_COMPARISON.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-b-0 dark:border-slate-900"
                  >
                    <td className="px-4 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {row.label}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {row.guest}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {row.free}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {row.premium}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 space-y-4 md:hidden">
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Guest</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Explore the product, preview pricing, and see how the study flow works before signing up.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Free</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Build a daily routine with guided practice and flashcards.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Premium</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Unlock full mock exams, analytics, unlimited study support, and the complete prep experience.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {isAuthenticated ? (
              <Link to={createPageUrl("Dashboard")}>
                <Button className="w-full rounded-2xl bg-[#1E5EFF] px-6 hover:bg-[#1E5EFF]/90 sm:w-auto">
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link to="/login?mode=register">
                <Button className="w-full rounded-2xl bg-[#1E5EFF] px-6 hover:bg-[#1E5EFF]/90 sm:w-auto">
                  Start Free
                </Button>
              </Link>
            )}
            <Link to={createPageUrl("Pricing")}>
              <Button variant="outline" className="w-full rounded-2xl px-6 sm:w-auto">
                View Full Pricing
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  );
}
