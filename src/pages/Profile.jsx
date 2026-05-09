import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  KeyRound,
  Loader2,
  Mail,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from "@/hooks/use-language";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { api } from "@/lib/api";
import { translateUi } from "@/lib/i18n";
import {
  FREE_DAILY_PRACTICE_LIMIT,
  PLAN_CATALOG,
  PLAN_IDS,
  getPlanLabel,
  isPremiumPlan,
} from "@/lib/plan-access";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { createPageUrl } from "@/utils";

const planInfo = {
  free: {
    name: "Free",
    icon: User,
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  },
  premium_monthly: {
    name: "Premium Monthly",
    icon: Crown,
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  },
  premium_yearly: {
    name: "Premium Yearly",
    icon: Crown,
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
  },
};

function formatPaymentDate(value) {
  if (!value) {
    return "Pending";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Pending";
  }
}

export default function Profile() {
  const { user: authUser, login } = useAuth();
  const { language } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ full_name: "" });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const queryClient = useQueryClient();

  const { data: profileData, refetch: refetchProfile } = useQuery({
    queryKey: ["profile-data"],
    queryFn: api.getProfile,
  });

  const currentUser = profileData?.user || authUser;
  const progress = profileData?.progress;
  const payments = profileData?.payments || [];
  const entitlements = profileData?.entitlements;
  const billing = profileData?.billing || {
    stripe_enabled: false,
    checkout_enabled: {},
    portal_enabled: false,
  };
  const currentPlanId = currentUser?.plan || PLAN_IDS.FREE;
  const currentPlan = planInfo[currentPlanId] || planInfo.free;
  const CurrentPlanIcon = currentPlan.icon;
  const canManageBilling = Boolean(billing.portal_enabled && currentUser?.stripe_customer_id);
  const t = (value) => translateUi(value, language);

  useEffect(() => {
    setFormData({ full_name: currentUser?.full_name || "" });
  }, [currentUser?.full_name]);

  const updateProfileMutation = useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["profile-data"], (current) =>
        current ? { ...current, user: updatedUser } : current,
      );
      login(updatedUser);
      setEditMode(false);
      toast({
        title: t("Profile updated"),
        description: t("Your account details were saved."),
      });
    },
    onError: (error) => {
      toast({
        title: t("Unable to update profile"),
        description: t(error.message || "Please try again."),
      });
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (planId) => api.createCheckoutSession(planId),
    onSuccess: (data) => {
      if (data?.url) {
        window.location.assign(data.url);
      }
    },
    onError: (error) => {
      toast({
        title: t("Unable to start checkout"),
        description: t(error.message || "Please try again."),
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: api.createBillingPortal,
    onSuccess: (data) => {
      if (data?.url) {
        window.location.assign(data.url);
      }
    },
    onError: (error) => {
      toast({
        title: t("Unable to open billing portal"),
        description: t(error.message || "Please try again."),
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (sessionId) => api.confirmCheckout(sessionId),
    onSuccess: (data) => {
      queryClient.setQueryData(["profile-data"], data);
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-data"] });
      if (data?.user) {
        login(data.user);
      }
      toast({
        title: t("Premium activated"),
        description: t(`Your account is now on ${getPlanLabel(data?.user?.plan)}.`),
      });
      navigate(createPageUrl("Profile"), { replace: true });
    },
    onError: (error) => {
      toast({
        title: t("Unable to confirm checkout"),
        description: t(error.message || "Please try again."),
      });
      navigate(createPageUrl("Profile"), { replace: true });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: api.setPassword,
    onSuccess: () => {
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      toast({ title: t("Password updated"), description: t("Your password has been saved.") });
    },
    onError: (error) => {
      toast({ title: t("Unable to update password"), description: t(error.message || "Please try again.") });
    },
  });

  const resetProgressMutation = useMutation({
    mutationFn: api.resetProfileProgress,
    onSuccess: (data) => {
      queryClient.setQueryData(["profile-data"], data);
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
      queryClient.invalidateQueries({ queryKey: ["analytics-data"] });
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      setResetDialogOpen(false);
      setClearTutorOnReset(false);
      toast({
        title: t("Study progress reset"),
        description: t("Your study metrics and saved session data were cleared."),
      });
    },
    onError: (error) => {
      toast({
        title: t("Unable to reset progress"),
        description: t(error.message || "Please try again."),
      });
    },
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const sessionId = searchParams.get("session_id");
    const checkoutState = searchParams.get("checkout");

    if (checkoutState !== "success" || !sessionId || confirmMutation.isPending) {
      return;
    }

    confirmMutation.mutate(sessionId);
  }, [confirmMutation, location.search]);

  const sortedPayments = useMemo(
    () =>
      [...payments].sort((left, right) => {
        const leftDate = left?.payment_date ? new Date(left.payment_date).getTime() : 0;
        const rightDate = right?.payment_date ? new Date(right.payment_date).getTime() : 0;
        return rightDate - leftDate;
      }),
    [payments],
  );

  const premiumPlans = PLAN_CATALOG.filter((plan) => isPremiumPlan(plan.id));

  const handleUpdateProfile = () => {
    const fullName = formData.full_name.trim();
    if (!fullName) {
      return;
    }

    updateProfileMutation.mutate({ full_name: fullName });
  };

  const handleResetProgress = () => {
    resetProgressMutation.mutate({ clear_tutor: false });
  };

  const handlePasswordSubmit = () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({ title: t("Passwords do not match"), description: t("New password and confirmation must match.") });
      return;
    }
    const payload = { new_password: passwordForm.new_password };
    if (authUser?.auth_provider === "password") payload.current_password = passwordForm.current_password;
    passwordMutation.mutate(payload);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-50">My Profile</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("Manage your account, usage, and membership.")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="profile">{t("Profile")}</TabsTrigger>
          <TabsTrigger value="subscription">{t("Membership")}</TabsTrigger>
          <TabsTrigger value="payments">{t("Payments")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card className="p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#1E5EFF] to-[#6366F1]">
                  <span className="text-2xl font-bold text-white">
                    {currentUser?.full_name?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-50">
                    {currentUser?.full_name || "User"}
                  </h2>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                    <Mail className="h-3 w-3" />
                    {currentUser?.email}
                  </p>
                </div>
              </div>

              <Badge className={cn("shrink-0", currentPlan.badgeClass)}>
                <CurrentPlanIcon className="mr-1 h-3 w-3" />
                {currentPlan.name}
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("Full Name")}
                </label>
                {editMode ? (
                  <Input
                    value={formData.full_name}
                    onChange={(event) =>
                      setFormData({ ...formData, full_name: event.target.value })
                    }
                    className="mt-1"
                  />
                ) : (
                  <p className="mt-1 text-slate-600 dark:text-slate-300">
                    {currentUser?.full_name || t("Not provided")}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("Email")}
                </label>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{currentUser?.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("Role")}
                </label>
                <p className="mt-1 flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Shield className="h-4 w-4" />
                  {currentUser?.role === "admin" ? t("Administrator") : t("User")}
                </p>
              </div>

              <div className="pt-4">
                {editMode ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateProfile}
                      disabled={updateProfileMutation.isPending || !formData.full_name.trim()}
                      className="bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
                    >
                      {updateProfileMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t("Save Changes")
                      )}
                    </Button>
                    <Button onClick={() => setEditMode(false)} variant="outline">
                      {t("Cancel")}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setEditMode(true)} variant="outline">
                    {t("Edit Profile")}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center gap-2">
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-50">
                {t("Interface language")}
              </h3>
            </div>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
              {t("This only changes the app interface. Study questions keep their original wording.")}
            </p>
            <LanguageSwitcher />
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="p-4">
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("Questions Answered")}</p>
              <p className="text-2xl font-bold text-[#0F172A] dark:text-slate-50">
                {progress?.total_questions_completed || 0}
              </p>
            </Card>
            <Card className="p-4">
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("Study Streak")}</p>
              <p className="text-2xl font-bold text-[#FFB800]">
                {t(`${progress?.study_streak_days || 0} days`)}
              </p>
            </Card>
            <Card className="p-4">
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{t("Study Hours")}</p>
              <p className="text-2xl font-bold text-[#1E5EFF]">
                {progress?.study_hours || 0}h
              </p>
            </Card>
          </div>

          <Card className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-slate-500" />
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-50">
                {t("Password & Security")}
              </h3>
            </div>
            <div className="space-y-4">
              {authUser?.auth_provider === "password" && (
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {t("Current Password")}
                  </label>
                  <Input
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="mt-1"
                    autoComplete="current-password"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {authUser?.auth_provider === "password" ? t("New Password") : t("Set Password")}
                </label>
                <Input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="mt-1"
                  autoComplete="new-password"
                  placeholder={t("Minimum 8 characters")}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("Confirm New Password")}
                </label>
                <Input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="mt-1"
                  autoComplete="new-password"
                />
              </div>
              <Button
                onClick={handlePasswordSubmit}
                disabled={
                  passwordMutation.isPending ||
                  !passwordForm.new_password ||
                  !passwordForm.confirm_password ||
                  (authUser?.auth_provider === "password" && !passwordForm.current_password)
                }
                className="bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
              >
                {passwordMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : authUser?.auth_provider === "password" ? (
                  t("Change Password")
                ) : (
                  t("Set Password")
                )}
              </Button>
            </div>
          </Card>

          <Card className="border-red-200/70 p-6 dark:border-red-900/40">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-50">
                  {t("Reset Study Progress")}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {t("Clear your answered questions, mock exam history, readiness, streak, and saved study sessions if you want a fresh start. Your account and payment history stay untouched.")}
                </p>
              </div>

              <Button
                variant="destructive"
                className="rounded-2xl md:min-w-[180px]"
                onClick={() => setResetDialogOpen(true)}
              >
                {t("Reset Progress")}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <Card className="p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h3 className="mb-1 text-lg font-bold text-[#0F172A] dark:text-slate-50">
                  {t("Current Plan")}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("Your access and daily limits update automatically based on this plan.")}
                </p>
              </div>
              <Badge className="bg-[#1E5EFF]/10 px-3 py-1 text-sm text-[#1E5EFF]">
                {currentPlan.name}
              </Badge>
            </div>

            {currentPlanId === PLAN_IDS.FREE ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-5 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                        {t("Free plan") }
                      </h4>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {t("You can practice daily, review flashcards, and upgrade whenever you want more access.")}
                      </p>
                    </div>
                    <Badge className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                      {t("Current") }
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#0B1628]">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t("Practice today")}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-50">
                        {entitlements?.usage?.practice_questions_today || 0}/{FREE_DAILY_PRACTICE_LIMIT}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#0B1628]">
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t("Current access")}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                        {t("Practice, flashcards, and profile tools")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {premiumPlans.map((plan) => {
                    const checkoutReady = billing.checkout_enabled?.[plan.id];
                    const isLoading =
                      checkoutMutation.isPending && checkoutMutation.variables === plan.id;

                    return (
                      <div
                        key={plan.id}
                        className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]"
                      >
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                          {plan.name}
                        </h4>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          {plan.description}
                        </p>
                        <p className="mt-4 text-3xl font-black text-slate-900 dark:text-slate-50">
                          {plan.price}
                          <span className="ml-2 text-sm font-medium text-slate-400">
                            {plan.period}
                          </span>
                        </p>
                        <Button
                          className="mt-5 w-full rounded-2xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
                          disabled={!checkoutReady || isLoading}
                          onClick={() => checkoutMutation.mutate(plan.id)}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : checkoutReady ? (
                            plan.cta
                          ) : (
                            t("Stripe setup pending")
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                        {currentPlan.name}
                      </h4>
                      <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">
                        {t("Your membership is active and your billing is managed from this page.")}
                      </p>
                    </div>
                    <Badge className="bg-emerald-600 text-white">{t("Active")}</Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A]">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("Practice access")}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                      {t("Unlimited") }
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A]">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("Flashcards")}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                      {t("Unlimited") }
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-[#1E5EFF]/15 dark:bg-[#0D1E3A]">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{t("Mock Exams")}</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                      {t("Included") }
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => portalMutation.mutate()}
                    disabled={!canManageBilling || portalMutation.isPending}
                    className="rounded-2xl bg-[#1E5EFF] hover:bg-[#1E5EFF]/90"
                  >
                    {portalMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("Manage Billing")
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() =>
                      checkoutMutation.mutate(
                        currentPlanId === PLAN_IDS.PREMIUM_MONTHLY
                          ? PLAN_IDS.PREMIUM_YEARLY
                          : PLAN_IDS.PREMIUM_MONTHLY,
                      )
                    }
                    disabled={
                      checkoutMutation.isPending ||
                      !billing.checkout_enabled?.[
                        currentPlanId === PLAN_IDS.PREMIUM_MONTHLY
                          ? PLAN_IDS.PREMIUM_YEARLY
                          : PLAN_IDS.PREMIUM_MONTHLY
                      ]
                    }
                  >
                    {currentPlanId === PLAN_IDS.PREMIUM_MONTHLY
                      ? t("Switch to Yearly")
                      : t("Switch to Monthly")}
                  </Button>
                </div>

                {!canManageBilling ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("Billing portal will appear after this membership is linked to a Stripe customer record.")}
                  </p>
                ) : null}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-50">
                {t("Payment History")}
              </h3>
              <Button variant="outline" size="sm" onClick={() => refetchProfile()}>
                {t("Refresh")}
              </Button>
            </div>

            {sortedPayments.length === 0 ? (
              <div className="py-12 text-center">
                <CreditCard className="mx-auto mb-4 h-16 w-16 text-slate-300" />
                <p className="text-slate-500 dark:text-slate-400">{t("No payments recorded.")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50 dark:border-[#1E5EFF]/15 dark:hover:bg-slate-900"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full",
                          payment.status === "completed" && "bg-emerald-100",
                          payment.status === "pending" && "bg-amber-100",
                          payment.status === "failed" && "bg-red-100",
                        )}
                      >
                        {payment.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : payment.status === "pending" ? (
                          <Clock className="h-5 w-5 text-amber-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[#0F172A] dark:text-slate-50">
                          {payment.plan === PLAN_IDS.PREMIUM_YEARLY
                            ? t("Premium Yearly")
                            : t("Premium Monthly")}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="h-3 w-3" />
                          {formatPaymentDate(payment.payment_date)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-[#0F172A] dark:text-slate-50">
                        ${Number(payment.amount || 0).toFixed(2)} {payment.currency || "USD"}
                      </p>
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          {payment.status}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {t(payment.provider_label || payment.provider || "Billing")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="rounded-3xl border-slate-200 bg-white p-0 shadow-2xl dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
          <div className="px-6 py-6">
            <AlertDialogHeader className="space-y-2 text-left">
              <AlertDialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {t("Reset your study progress?")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("This will remove your question attempts, mock exams, readiness, streak, and saved study sessions. Your account and billing history will remain.")}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-[#0D1E3A] dark:text-slate-300">
              {t("Your account, billing history, and sign-in settings will stay intact.")}
            </div>
          </div>

          <AlertDialogFooter className="border-t border-slate-200/80 px-6 py-4 dark:border-[#1E5EFF]/15">
            <AlertDialogCancel className="rounded-2xl">{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResetProgress}
              className="rounded-2xl bg-red-600 text-white hover:bg-red-700"
              disabled={resetProgressMutation.isPending}
            >
              {resetProgressMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("Reset Progress")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
