import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, GraduationCap, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { PLAN_IDS, isPremiumPlan } from "@/lib/plan-access";
import { OFFICIAL_CONCEPT_COUNT, TOTAL_PRACTICE_QUESTIONS } from "@/lib/question-bank";
import { toast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";

const PLANS = [
  {
    id: PLAN_IDS.PREMIUM_MONTHLY,
    name: "Premium Monthly",
    price: "$19.99",
    period: "/month",
    badge: "Current",
    upgradeLabel: "Upgrade Monthly",
    features: [
      `Unlimited practice across ${TOTAL_PRACTICE_QUESTIONS} questions and ${OFFICIAL_CONCEPT_COUNT} concepts`,
      "Full mock exams — 85 questions, timed",
      "Full analytics and readiness tracking",
      "Manage billing with Stripe",
    ],
  },
  {
    id: PLAN_IDS.PREMIUM_YEARLY,
    name: "Premium Yearly",
    price: "$215.89",
    period: "/year",
    badge: "Save 10%",
    upgradeLabel: "Upgrade Yearly",
    features: [
      "Everything in Premium Monthly",
      "10% less than paying monthly for a full year",
      "Full mock exams and analytics",
      "Manage billing with Stripe",
    ],
  },
];

function PlanLabel(plan) {
  if (plan === PLAN_IDS.PREMIUM_YEARLY) return "Premium Yearly";
  if (plan === PLAN_IDS.PREMIUM_MONTHLY) return "Premium Monthly";
  return "Free";
}

export default function Pricing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ["profile-data"],
    queryFn: api.getProfile,
    enabled: isAuthenticated,
  });

  const currentPlan = profileData?.user?.plan || user?.plan || PLAN_IDS.FREE;
  const isAnyPremium = isPremiumPlan(currentPlan);

  // Handle checkout cancelled redirect
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "cancelled") {
      toast({ title: "Checkout cancelled", description: "Your plan was not changed." });
      navigate(createPageUrl("Pricing"), { replace: true });
    }
  }, [location.search]);

  const checkoutMutation = useMutation({
    mutationFn: (planId) => api.createCheckoutSession(planId),
    onSuccess: (data) => {
      if (data?.url) { window.location.assign(data.url); return; }
      toast({ title: "Checkout unavailable", description: "Stripe did not return a checkout link." });
    },
    onError: (err) => {
      toast({ title: "Unable to start checkout", description: err.message || "Please try again in a moment." });
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => api.createBillingPortal(),
    onSuccess: (data) => {
      if (data?.url) { window.location.assign(data.url); return; }
      toast({ title: "Billing portal unavailable", description: "Could not open billing management." });
    },
    onError: (err) => {
      toast({ title: "Unable to open billing portal", description: err.message || "Please try again." });
    },
  });

  const handleAction = (planId) => {
    if (!isAuthenticated) {
      navigate(`/login?redirectTo=${encodeURIComponent(createPageUrl("Pricing"))}`);
      return;
    }
    if (currentPlan === planId) {
      portalMutation.mutate();
      return;
    }
    checkoutMutation.mutate(planId);
  };

  const anyLoading = checkoutMutation.isPending || portalMutation.isPending;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080F1E]">
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link
          to={isAuthenticated ? createPageUrl("Dashboard") : "/"}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1E5EFF]">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#0F172A]">RBT</span>
          <span className="text-lg font-bold text-[#1E5EFF]">Genius</span>
          <Sparkles className="-mt-1 h-3.5 w-3.5 text-[#FFB800]" />
        </Link>
        <Link
          to={isAuthenticated ? createPageUrl("Dashboard") : "/"}
          className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          {isAuthenticated ? "← Back to Dashboard" : "← Back to Home"}
        </Link>
      </nav>

      {/* Header */}
      <div className="mx-auto max-w-5xl px-6 pb-10 pt-8 text-center">
        <h1 className="text-4xl font-bold text-[#0F172A] dark:text-slate-50 md:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
          Unlock unlimited RBT exam prep — practice questions, mock exams, and full analytics.
        </p>

        {/* 40-hour course notice */}
        <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
          <span>📋</span>
          The 40-hour course is planned for a future release and is not included in current plans yet.
        </div>

        {/* Current plan pill */}
        {isAuthenticated && (
          <div className="mx-auto mt-3 inline-flex items-center gap-2 rounded-full border border-[#1E5EFF]/20 bg-[#1E5EFF]/8 px-4 py-2 text-sm font-semibold text-[#1E5EFF]">
            <span className="h-2 w-2 rounded-full bg-[#1E5EFF]" />
            Current plan: {PlanLabel(currentPlan)}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="mx-auto max-w-3xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan) => {
            const isCurrent = isAuthenticated && currentPlan === plan.id;
            const isLoadingThis =
              (checkoutMutation.isPending && checkoutMutation.variables === plan.id) ||
              (portalMutation.isPending && isCurrent);

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl border bg-white p-8 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.15)] transition-all dark:bg-[#0D1E3A] dark:shadow-[0_8px_40px_-12px_rgba(30,94,255,0.15)] ${
                  isCurrent
                    ? "border-[#1E5EFF]/30 ring-2 ring-[#1E5EFF]/10 dark:border-[#1E5EFF]/30"
                    : "border-slate-200 dark:border-[#1E5EFF]/15"
                }`}
              >
                {/* Badge */}
                <div className="mb-4 h-7">
                  {isCurrent ? (
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      ✓ Current
                    </span>
                  ) : plan.id === PLAN_IDS.PREMIUM_YEARLY ? (
                    <span className="inline-flex items-center rounded-full bg-[#1E5EFF] px-3 py-1 text-xs font-semibold text-white">
                      Save 10%
                    </span>
                  ) : null}
                </div>

                {/* Title & price */}
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{plan.name}</h2>
                <div className="mt-4 flex items-end gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-slate-50">{plan.price}</span>
                  <span className="mb-1 text-sm text-slate-400">{plan.period}</span>
                </div>
                <div className="mt-1.5 h-5">
                  {plan.id === PLAN_IDS.PREMIUM_YEARLY && (
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      10% less than paying monthly for a full year
                    </p>
                  )}
                </div>

                {/* CTA button */}
                <button
                  onClick={() => handleAction(plan.id)}
                  disabled={anyLoading}
                  className={`mt-7 flex w-full items-center justify-center rounded-2xl py-3.5 text-sm font-bold transition-all disabled:opacity-60 ${
                    isCurrent
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "bg-[#1E5EFF] text-white hover:bg-[#1751e0] shadow-[0_4px_16px_-4px_rgba(30,94,255,0.5)]"
                  }`}
                >
                  {isLoadingThis ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "Manage Billing"
                  ) : (
                    plan.upgradeLabel
                  )}
                </button>

                {/* Features */}
                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Footer note */}
                <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
                  {isCurrent
                    ? "You are on this plan. Tap above to manage or cancel."
                    : isAnyPremium
                    ? "Switch plans anytime from billing."
                    : "Cancel anytime. No hidden fees."}
                </p>
              </div>
            );
          })}
        </div>

        {/* Not logged in prompt */}
        {!isAuthenticated && (
          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              to={`/login?redirectTo=${encodeURIComponent(createPageUrl("Pricing"))}`}
              className="font-semibold text-[#1E5EFF] hover:underline"
            >
              Sign in to subscribe
            </Link>
          </p>
        )}

        {/* Stripe security note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          🔒 Secure payment via Stripe · Cancel anytime · Billing managed by RevenueCat
        </p>
      </div>
    </div>
  );
}
