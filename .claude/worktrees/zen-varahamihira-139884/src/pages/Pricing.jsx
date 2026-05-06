import { useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Crown,
  GraduationCap,
  Loader2,
  Minus,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  ACCESS_COMPARISON,
  FREE_DAILY_PRACTICE_LIMIT,
  FREE_DAILY_TUTOR_LIMIT,
  PLAN_CATALOG,
  PLAN_IDS,
  PREMIUM_DAILY_TUTOR_LIMIT,
  isPremiumPlan,
} from "@/lib/plan-access";
import { OFFICIAL_CONCEPT_COUNT, TOTAL_PRACTICE_QUESTIONS } from "@/lib/question-bank";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/hooks/use-language";
import { translateUi } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

const planFeatureMap = {
  [PLAN_IDS.FREE]: [
    "Create an account and sync progress",
    `${FREE_DAILY_PRACTICE_LIMIT} answered practice questions each day`,
    `${FREE_DAILY_TUTOR_LIMIT} AI tutor messages each day`,
    "Flashcards and dashboard included",
    "No mock exams",
    "No analytics",
  ],
  [PLAN_IDS.PREMIUM_MONTHLY]: [
    `Unlimited practice across ${TOTAL_PRACTICE_QUESTIONS} questions and ${OFFICIAL_CONCEPT_COUNT} concepts`,
    `${PREMIUM_DAILY_TUTOR_LIMIT} AI tutor messages each day`,
    "Full mock exams",
    "Full analytics and readiness tracking",
    "Manage billing with Stripe",
  ],
  [PLAN_IDS.PREMIUM_YEARLY]: [
    "Everything in Premium Monthly",
    "Lower yearly cost than paying month to month",
    "Unlimited practice with higher daily AI tutor access",
    "Full mock exams and analytics",
    "Manage billing with Stripe",
  ],
};

function getBillingAvailability(publicSettings, profileData) {
  return profileData?.billing || publicSettings?.billing || {
    stripe_enabled: false,
    checkout_enabled: {},
    portal_enabled: false,
  };
}

function getActionLabel(planId, currentPlan, isAuthenticated) {
  if (planId === PLAN_IDS.FREE) {
    return isAuthenticated ? "Keep Free Plan" : "Create Free Account";
  }

  if (!isAuthenticated) {
    return "Log In to Upgrade";
  }

  if (currentPlan === planId) {
    return "Current Plan";
  }

  return planId === PLAN_IDS.PREMIUM_YEARLY ? "Upgrade Yearly" : "Upgrade Monthly";
}

export default function Pricing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { language } = useLanguage();
  const t = (value) => translateUi(value, language);

  const { data: publicSettings } = useQuery({
    queryKey: ["public-settings"],
    queryFn: api.getPublicSettings,
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile-data"],
    queryFn: api.getProfile,
    enabled: isAuthenticated,
  });

  const currentPlan = profileData?.user?.plan || user?.plan || PLAN_IDS.FREE;
  const billing = getBillingAvailability(publicSettings, profileData);
  const visiblePlans = useMemo(() => {
    if (isAuthenticated && isPremiumPlan(currentPlan)) {
      return PLAN_CATALOG.filter((plan) => plan.id !== PLAN_IDS.FREE);
    }

    return PLAN_CATALOG;
  }, [currentPlan, isAuthenticated]);

  const checkoutMutation = useMutation({
    mutationFn: (planId) => api.createCheckoutSession(planId),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      toast({
        title: t("Checkout unavailable"),
        description: t("Stripe did not return a checkout link."),
      });
    },
    onError: (error) => {
      toast({
        title: t("Unable to start checkout"),
        description: t(error.message || "Please try again in a moment."),
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.createBillingPortal(),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      toast({
        title: t("Billing portal unavailable"),
        description: t("Stripe did not return a billing portal link."),
      });
    },
    onError: (error) => {
      toast({
        title: t("Unable to open billing portal"),
        description: t(error.message || "Please try again in a moment."),
      });
    },
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const checkoutStatus = searchParams.get("checkout");

    if (checkoutStatus === "cancelled") {
      toast({
        title: t("Checkout cancelled"),
        description: t("Your plan was not changed."),
      });
      navigate(createPageUrl("Pricing"), { replace: true });
    }
  }, [location.search, navigate]);

  const comparisonRows = useMemo(() => ACCESS_COMPARISON, []);

  const handlePlanAction = (planId) => {
    if (planId === PLAN_IDS.FREE) {
      if (isAuthenticated) {
        navigate(createPageUrl("Dashboard"));
        return;
      }

      navigate("/login?mode=register");
      return;
    }

    if (!isAuthenticated) {
      navigate(`/login?redirectTo=${encodeURIComponent(createPageUrl("Pricing"))}`);
      return;
    }

    if (currentPlan === planId) {
      if (isPremiumPlan(currentPlan)) {
        portalMutation.mutate();
      }
      return;
    }

    checkoutMutation.mutate(planId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white dark:from-slate-950 dark:to-slate-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          to={isAuthenticated ? createPageUrl("Dashboard") : "/"}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E5EFF]">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-[#0F172A] dark:text-slate-50">RBT</span>
            <span className="text-lg font-bold text-[#1E5EFF]">Genius</span>
            <Sparkles className="-mt-1 h-3.5 w-3.5 text-[#FFB800]" />
          </div>
        </Link>
        <Link to={isAuthenticated ? createPageUrl("Dashboard") : "/"}>
          <Button variant="ghost" className="gap-2 rounded-xl text-sm text-slate-500">
            <ArrowLeft className="h-4 w-4" />
            {isAuthenticated ? t("Back to Dashboard") : t("Back to Home")}
          </Button>
        </Link>
      </nav>

      <div className="px-6 pb-12 pt-12 text-center">
        <Badge className="mb-4 border-[#FFB800]/20 bg-[#FFB800]/10 text-[#FFB800]">
          <Crown className="mr-1 h-3 w-3" />
          {t("Plans and Access")}
        </Badge>
        <h1 className="mt-2 text-4xl font-bold text-[#0F172A] dark:text-slate-50 md:text-5xl">
          {t("Pick the level of support that fits your study pace.")}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-500 dark:text-slate-400">
          {t("Guests can review the landing and pricing, free members get daily study tools, and Premium unlocks unlimited practice, higher daily AI tutor access, timed mock exams, and analytics.")}
        </p>
        <p className="mx-auto mt-4 inline-flex max-w-2xl rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
          {t("The 40-hour course is planned for a future release and is not included in current plans yet.")}
        </p>
        {isAuthenticated ? (
          <p className="mx-auto mt-4 inline-flex rounded-full border border-[#1E5EFF]/15 bg-[#1E5EFF]/8 px-4 py-2 text-sm font-medium text-[#1E5EFF] dark:border-[#1E5EFF]/20 dark:bg-[#1E5EFF]/12 dark:text-[#8EB0FF]">
            {t(`Current plan: ${profileData?.user?.plan === PLAN_IDS.PREMIUM_YEARLY
              ? "Premium Yearly"
              : profileData?.user?.plan === PLAN_IDS.PREMIUM_MONTHLY
                ? "Premium Monthly"
                : "Free"}`)}
          </p>
        ) : null}
      </div>

      <div
        className={cn(
          "mx-auto px-6 pb-12",
          visiblePlans.length === 2 ? "max-w-4xl" : "max-w-6xl",
        )}
      >
        <div
          className={cn(
            "grid grid-cols-1 gap-6",
            visiblePlans.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3",
          )}
        >
          {visiblePlans.map((plan) => {
            const isCurrent = isAuthenticated && currentPlan === plan.id;
            const checkoutReady =
              plan.id === PLAN_IDS.FREE || billing.checkout_enabled?.[plan.id];
            const loading =
              checkoutMutation.isPending && checkoutMutation.variables === plan.id;
            const topBadgeLabel = isCurrent ? t("Current") : plan.badge ? t(plan.badge) : null;
            const topBadgeClassName = isCurrent
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-[#1E5EFF] text-white";

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex h-full flex-col rounded-3xl border bg-white p-7 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.3)] transition-all dark:bg-slate-950",
                  plan.popular
                    ? "border-[#1E5EFF]/35"
                    : "border-slate-200/80 dark:border-slate-800",
                )}
              >
                <div className="mb-5 h-8">
                  {topBadgeLabel ? (
                    <Badge
                      variant={isCurrent ? "outline" : undefined}
                      className={cn("px-3 py-1 text-xs", topBadgeClassName)}
                    >
                      {topBadgeLabel}
                    </Badge>
                  ) : null}
                </div>

                <div className="mb-6 min-h-[196px]">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                    {t(plan.name)}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {t(plan.description)}
                  </p>
                  <div className="mt-5">
                    <span className="text-4xl font-black text-slate-900 dark:text-slate-50">
                      {plan.price}
                    </span>
                    <span className="ml-2 text-sm text-slate-400 dark:text-slate-500">
                      {plan.period}
                    </span>
                    {plan.id === PLAN_IDS.PREMIUM_YEARLY ? (
                      <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-300">
                        {t("10% less than paying monthly for a full year")}
                      </p>
                    ) : (
                      <p className="invisible mt-2 text-sm font-medium">{t("Spacer copy")}</p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => handlePlanAction(plan.id)}
                  disabled={
                    loading ||
                    portalMutation.isPending ||
                    (isCurrent && isPremiumPlan(plan.id) && !billing.portal_enabled) ||
                    (plan.id !== PLAN_IDS.FREE && !checkoutReady && !isCurrent)
                  }
                  className={cn(
                    "mb-6 w-full rounded-2xl",
                    plan.id === PLAN_IDS.FREE
                      ? "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                      : "bg-[#1E5EFF] hover:bg-[#1E5EFF]/90",
                  )}
                >
                  {loading || portalMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent && isPremiumPlan(plan.id) ? (
                    t("Manage Billing")
                  ) : isCurrent ? (
                    t("Current Plan")
                  ) : !checkoutReady && plan.id !== PLAN_IDS.FREE ? (
                    t("Stripe setup pending")
                  ) : (
                    t(getActionLabel(plan.id, currentPlan, isAuthenticated))
                  )}
                </Button>

                <div className="flex-1 space-y-3">
                  {planFeatureMap[plan.id].map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {t(feature)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 min-h-[48px] text-sm font-medium">
                  {isCurrent ? (
                    <span className="block text-emerald-600 dark:text-emerald-300">
                      {t("Your current billing plan.")}
                    </span>
                  ) : isPremiumPlan(currentPlan) && plan.id !== currentPlan ? (
                    <span className="block text-slate-400 dark:text-slate-500">
                      {t("Switch plans anytime from billing.")}
                    </span>
                  ) : (
                    <span className="invisible inline-flex items-center gap-1">
                      <Minus className="h-3.5 w-3.5" />
                      {t("spacer")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-24">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {t("Guest vs Free vs Premium")}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t("A quick view of what someone sees before registering, after creating a free account, and after upgrading. Anything not live yet is marked as coming soon.")}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t("Feature")}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t("Guest")}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t("Free")}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {t("Premium")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-b-0 dark:border-slate-900"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {t(row.label)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {t(row.guest)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {t(row.free)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {t(row.premium)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!billing.stripe_enabled ? (
            <div className="flex items-center gap-3 border-t border-slate-200/80 bg-amber-50/70 px-6 py-4 text-sm text-amber-700 dark:border-slate-800 dark:bg-amber-500/10 dark:text-amber-300">
              <X className="h-4 w-4 flex-shrink-0" />
              {t("Stripe has not been configured with live price IDs yet, so premium checkout buttons stay disabled until those env vars are added.")}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
