import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  Loader2,
  Shield,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useLanguage } from "@/hooks/use-language";
import { translateUi } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";

const PLAN_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "premium_monthly", label: "Premium Monthly" },
  { value: "premium_yearly", label: "Premium Yearly" },
];

const ROLE_OPTIONS = [
  { value: "student", label: "User" },
  { value: "admin", label: "Admin" },
];

const darkBadgeClass =
  "dark:border-[#41588A] dark:bg-[#1A284A] dark:text-slate-100";

const summaryCardClass =
  "border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.12)] dark:!border-slate-700/80 dark:!bg-slate-900/95 dark:shadow-[0_24px_55px_-38px_rgba(59,130,246,0.24)]";

const memberCardClass =
  "overflow-hidden border-slate-200/80 bg-white/95 p-5 lg:px-6 lg:py-6 shadow-[0_18px_38px_-28px_rgba(15,23,42,0.12)] dark:!border-slate-700/80 dark:!bg-slate-900/95 dark:shadow-[0_24px_55px_-38px_rgba(59,130,246,0.24)]";

const actionPanelClass =
  "rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4 lg:p-5 dark:!border-slate-700/80 dark:!bg-slate-800/70";

const memberSelectClass =
  "border-slate-200 bg-white text-slate-800 dark:!border-slate-700 dark:!bg-slate-950 dark:text-slate-100";

const memberOutlineButtonClass =
  "w-full border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:!border-slate-700 dark:!bg-slate-950 dark:text-slate-100 dark:hover:!bg-slate-900 dark:hover:text-slate-50";

function formatJoinedDate(value) {
  if (!value) {
    return "Unknown join date";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Unknown join date";
  }
}

function getProviderLabel(provider) {
  switch (provider) {
    case "password":
      return "Manual";
    case "google":
      return "Google";
    case "apple":
      return "Apple";
    case "github":
      return "GitHub";
    case "microsoft":
      return "Microsoft";
    default:
      return provider || "Unknown";
  }
}

function formatPaymentDate(value) {
  if (!value) {
    return "Pending";
  }

  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Pending";
  }
}

function formatCurrency(amount, currency = "USD") {
  return `$${Number(amount || 0).toFixed(2)} ${String(currency || "USD").toUpperCase()}`;
}

function getPaymentPlanLabel(plan) {
  return PLAN_OPTIONS.find((option) => option.value === plan)?.label || "Premium";
}

export default function AdminMembers() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [drafts, setDrafts] = useState({});
  const [memberPendingDelete, setMemberPendingDelete] = useState(null);
  const [memberPaymentsOpen, setMemberPaymentsOpen] = useState(false);
  const [memberPaymentsTarget, setMemberPaymentsTarget] = useState(null);

  const isAdmin = user?.role === "admin";
  const t = (value) => translateUi(value, language);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["admin-members"],
    queryFn: api.listAdminMembers,
    enabled: isAdmin,
    initialData: [],
  });

  const {
    data: memberPaymentsData,
    isLoading: isLoadingMemberPayments,
  } = useQuery({
    queryKey: ["admin-member-payments", memberPaymentsTarget?.id],
    queryFn: () => api.getAdminMemberPayments(memberPaymentsTarget.id),
    enabled: isAdmin && memberPaymentsOpen && Boolean(memberPaymentsTarget?.id),
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, payload }) => api.updateAdminMember(memberId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
      queryClient.invalidateQueries({ queryKey: ["profile-data"] });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: (memberId) => api.deleteAdminMember(memberId),
    onMutate: async (memberId) => {
      await queryClient.cancelQueries({ queryKey: ["admin-members"] });
      const previousMembers = queryClient.getQueryData(["admin-members"]);

      queryClient.setQueryData(["admin-members"], (current = []) =>
        current.filter((member) => member.id !== memberId),
      );

      return { previousMembers };
    },
    onSuccess: () => {
      toast({
        title: t("Member deleted"),
        description: t("The account and related study data were removed."),
      });
    },
    onError: (_error, _memberId, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(["admin-members"], context.previousMembers);
      }

      toast({
        title: t("Unable to delete member"),
        description: t("Please try again in a moment."),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-members"] });
    },
  });

  const filteredMembers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return members.filter((member) => {
      const matchesPlan = planFilter === "all" || member.plan === planFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        member.full_name?.toLowerCase().includes(normalizedSearch) ||
        member.email?.toLowerCase().includes(normalizedSearch);

      return matchesPlan && matchesSearch;
    });
  }, [members, planFilter, search]);

  const premiumCount = members.filter((member) => member.plan !== "free").length;
  const adminCount = members.filter((member) => member.role === "admin").length;

  const getDraft = (member) =>
    drafts[member.id] || {
      plan: member.plan,
      role: member.role,
    };

  const updateDraft = (memberId, partial) => {
    setDrafts((current) => ({
      ...current,
      [memberId]: {
        ...current[memberId],
        ...partial,
      },
    }));
  };

  const handleSave = async (member) => {
    const draft = getDraft(member);

    await updateMemberMutation.mutateAsync({
      memberId: member.id,
      payload: {
        plan: draft.plan,
        role: draft.role,
      },
    });

    setDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[member.id];
      return nextDrafts;
    });
  };

  const handleDelete = async (member) => {
    await deleteMemberMutation.mutateAsync(member.id);
    setMemberPendingDelete(null);

    setDrafts((current) => {
      const nextDrafts = { ...current };
      delete nextDrafts[member.id];
      return nextDrafts;
    });
  };

  const openPayments = (member) => {
    setMemberPaymentsTarget(member);
    setMemberPaymentsOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className="p-10 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {t("Admin access only")}
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {t("This panel is only available to administrator accounts.")}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[1360px] space-y-6 overflow-x-clip">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {t("Member Management")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {t("Manage premium access and admin roles for your members.")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Card className={summaryCardClass}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("Total Members")}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    {members.length}
                  </p>
                </div>
                <Users className="h-7 w-7 shrink-0 text-[#1E5EFF]" />
              </div>
            </Card>
            <Card className={summaryCardClass}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("Premium Members")}</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-300">
                    {premiumCount}
                  </p>
                </div>
                <Crown className="h-7 w-7 shrink-0 text-emerald-600 dark:text-emerald-300" />
              </div>
            </Card>
            <Card className={summaryCardClass}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t("Admins")}</p>
                  <p className="text-2xl font-bold text-violet-600 dark:text-violet-300">
                    {adminCount}
                  </p>
                </div>
                <Shield className="h-7 w-7 shrink-0 text-violet-600 dark:text-violet-300" />
              </div>
            </Card>
          </div>
        </div>

        <Card className={summaryCardClass}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("Search by name or email")}
              className="dark:!border-slate-700 dark:!bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />

            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="dark:!border-slate-700 dark:!bg-slate-950 dark:text-slate-100">
                <SelectValue placeholder={t("Filter by plan")} />
              </SelectTrigger>
              <SelectContent className="dark:!border-slate-700 dark:!bg-slate-950 dark:text-slate-100">
                <SelectItem value="all">{t("All Plans")}</SelectItem>
                {PLAN_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4">
          {isLoading ? (
            <Card className="border-slate-200/80 bg-white/95 p-8 text-center text-slate-500 dark:border-[#2A3A70]/70 dark:bg-[#10182F]/82 dark:text-slate-400">
              {t("Loading members...")}
            </Card>
          ) : filteredMembers.length === 0 ? (
            <Card className="border-slate-200/80 bg-white/95 p-8 text-center text-slate-500 dark:border-[#2A3A70]/70 dark:bg-[#10182F]/82 dark:text-slate-400">
              {t("No members match the current filters.")}
            </Card>
          ) : (
            filteredMembers.map((member) => {
              const draft = getDraft(member);
              const hasChanges = draft.plan !== member.plan || draft.role !== member.role;
              const isCurrentAdmin = member.id === user?.id;

              return (
                <Card
                  key={member.id}
                  className={memberCardClass}
                >
                  <div className="space-y-5">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="min-w-0 break-words text-lg font-semibold text-slate-900 dark:text-slate-50">
                          {member.full_name}
                        </h2>
                        <Badge variant="outline" className={darkBadgeClass}>
                          {member.role === "admin" ? t("Admin") : t("User")}
                        </Badge>
                        <Badge variant="outline" className={darkBadgeClass}>
                          {getProviderLabel(member.auth_provider)}
                        </Badge>
                        <Badge
                          className={
                            member.plan === "free"
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
                          }
                        >
                          {PLAN_OPTIONS.find((option) => option.value === member.plan)?.label ||
                            member.plan}
                        </Badge>
                      </div>
                      <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                        {member.email}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{t(`Joined ${formatJoinedDate(member.created_at)}`)}</span>
                        <span>{t(`${member.total_questions_completed} questions completed`)}</span>
                        <span>{t(`${member.readiness_score}% readiness`)}</span>
                        <span>{t(`${member.study_streak_days} day streak`)}</span>
                        <span>{t(`${member.exams_count} exams`)}</span>
                        <span>{t(`${member.payments_count || 0} payments`)}</span>
                        <span>{t(`$${Number(member.total_paid_amount || 0).toFixed(2)} paid`)}</span>
                      </div>
                    </div>

                    <div className={actionPanelClass}>
                      <div className="mb-3 flex items-center justify-end gap-3">
                        {hasChanges ? (
                          <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                            {t("Unsaved changes")}
                          </Badge>
                        ) : null}
                      </div>

                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-end">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <Select
                            value={draft.plan}
                            onValueChange={(value) => updateDraft(member.id, { plan: value })}
                          >
                            <SelectTrigger className={memberSelectClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="dark:!border-slate-700 dark:!bg-slate-950 dark:text-slate-100">
                              {PLAN_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={draft.role}
                            onValueChange={(value) => updateDraft(member.id, { role: value })}
                          >
                            <SelectTrigger className={memberSelectClass}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="dark:!border-slate-700 dark:!bg-slate-950 dark:text-slate-100">
                              {ROLE_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openPayments(member)}
                            disabled={deleteMemberMutation.isPending}
                            className={memberOutlineButtonClass}
                          >
                            <CreditCard className="mr-2 h-4 w-4" />
                            {t("Payments")}
                          </Button>

                          <Button
                            onClick={() => handleSave(member)}
                            disabled={
                              !hasChanges ||
                              updateMemberMutation.isPending ||
                              deleteMemberMutation.isPending
                            }
                            className="w-full bg-[#1E5EFF] hover:bg-[#1E5EFF]/90 dark:bg-[#7C97FF] dark:text-slate-950 dark:hover:bg-[#96ACFF] dark:shadow-[0_16px_32px_-22px_rgba(124,151,255,0.85)]"
                          >
                            {t("Save")}
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setMemberPendingDelete(member)}
                            disabled={isCurrentAdmin || deleteMemberMutation.isPending}
                            className="w-full border-red-200 bg-white text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-red-400/30 dark:bg-[#2C1C30] dark:text-red-200 dark:hover:bg-[#38233D]"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("Delete")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <AlertDialog
        open={Boolean(memberPendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteMemberMutation.isPending) {
            setMemberPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-3xl border-slate-200 bg-white p-0 shadow-2xl dark:border-[#2A3A70]/70 dark:bg-[#10182F]">
          <div className="border-b border-slate-200/80 bg-gradient-to-br from-red-50 via-white to-orange-50 px-6 py-5 dark:border-slate-800 dark:from-red-950/30 dark:via-slate-950 dark:to-orange-950/20">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300">
              <Trash2 className="h-5 w-5" />
            </div>
            <AlertDialogHeader className="space-y-2 text-left">
              <AlertDialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {t("Delete member account?")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {t("This action permanently removes the member profile, practice attempts, flashcard activity, mock exams, payments, sessions, and tutor conversations.")}
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>

          {memberPendingDelete ? (
            <div className="px-6 py-5">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-[#2A3A70]/70 dark:bg-[#15213F]/70">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {memberPendingDelete.full_name}
                  </h3>
                  <Badge variant="outline" className={darkBadgeClass}>
                    {memberPendingDelete.role === "admin" ? t("Admin") : t("User")}
                  </Badge>
                  <Badge variant="outline" className={darkBadgeClass}>
                    {getProviderLabel(memberPendingDelete.auth_provider)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {memberPendingDelete.email}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span>{t(`${memberPendingDelete.total_questions_completed} questions completed`)}</span>
                  <span>{t(`${memberPendingDelete.exams_count} exams`)}</span>
                  <span>{t(`${memberPendingDelete.payments_count || 0} payments`)}</span>
                  <span>{t(`$${Number(memberPendingDelete.total_paid_amount || 0).toFixed(2)} paid`)}</span>
                </div>
              </div>
            </div>
          ) : null}

          <AlertDialogFooter className="border-t border-slate-200/80 px-6 py-4 dark:border-slate-800">
            <AlertDialogCancel
              className="rounded-xl"
              disabled={deleteMemberMutation.isPending}
            >
              {t("Keep member")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
              disabled={deleteMemberMutation.isPending || !memberPendingDelete}
              onClick={(event) => {
                event.preventDefault();
                if (memberPendingDelete) {
                  handleDelete(memberPendingDelete);
                }
              }}
            >
              {deleteMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("Deleting...")}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("Delete member")}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={memberPaymentsOpen}
        onOpenChange={(open) => {
          setMemberPaymentsOpen(open);
          if (!open) {
            setMemberPaymentsTarget(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-slate-200 bg-white p-0 shadow-2xl sm:max-w-3xl dark:border-[#2A3A70]/70 dark:bg-[#10182F]">
          <div className="border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-blue-50 px-6 py-5 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {t("Payment history")}
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                {memberPaymentsTarget ? (
                  <>
                    {t("Detailed billing records for")}{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {memberPaymentsTarget.full_name}
                    </span>
                    .
                  </>
                ) : (
                  t("Detailed billing records for the selected member.")
                )}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-5">
            {memberPaymentsTarget ? (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-[#2A3A70]/70 dark:bg-[#15213F]/70">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                    {memberPaymentsTarget.full_name}
                  </h3>
                  <Badge variant="outline" className={darkBadgeClass}>
                    {getProviderLabel(memberPaymentsTarget.auth_provider)}
                  </Badge>
                  <Badge
                    className={
                      memberPaymentsTarget.plan === "free"
                        ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300"
                    }
                  >
                    {PLAN_OPTIONS.find((option) => option.value === memberPaymentsTarget.plan)
                      ?.label || memberPaymentsTarget.plan}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {memberPaymentsTarget.email}
                </p>
              </div>
            ) : null}

            {isLoadingMemberPayments ? (
              <Card className="border-slate-200/80 bg-white/95 p-8 text-center text-slate-500 dark:border-[#2A3A70]/70 dark:bg-[#15213F]/70 dark:text-slate-400">
                <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
                Loading payment history...
              </Card>
            ) : (memberPaymentsData?.payments || []).length === 0 ? (
              <Card className="border-slate-200/80 bg-white/95 p-10 text-center dark:border-[#2A3A70]/70 dark:bg-[#15213F]/70">
                <CreditCard className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                  No payments yet
                </h4>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  This member has not completed any recorded billing activity yet.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {memberPaymentsData.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div
                        className={[
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          payment.status === "completed" ? "bg-emerald-100 text-emerald-600" : "",
                          payment.status === "pending" ? "bg-amber-100 text-amber-600" : "",
                          payment.status === "failed" ? "bg-red-100 text-red-600" : "",
                          !["completed", "pending", "failed"].includes(payment.status)
                            ? "bg-slate-100 text-slate-500"
                            : "",
                        ].join(" ")}
                      >
                        {payment.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : payment.status === "pending" ? (
                          <Clock className="h-5 w-5" />
                        ) : payment.status === "failed" ? (
                          <XCircle className="h-5 w-5" />
                        ) : (
                          <CreditCard className="h-5 w-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-50">
                          {getPaymentPlanLabel(payment.plan)}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatPaymentDate(payment.payment_date || payment.created_at)}
                          </span>
                          <span>{payment.provider_label || payment.provider || "Billing"}</span>
                          <span className="uppercase tracking-wide">{payment.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-slate-900 dark:text-slate-50">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
