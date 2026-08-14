import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Apple,
  BadgeDollarSign,
  CircleDollarSign,
  CreditCard,
  Database,
  RefreshCw,
  Shield,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const cardClass =
  "border-slate-200/80 bg-white/95 shadow-[0_22px_55px_-38px_rgba(15,23,42,0.24)] dark:!border-slate-700/80 dark:!bg-slate-900/95";

function money(value, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(Number(value || 0));
}

function number(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function StatusBadge({ status }) {
  const styles = {
    live: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
    partial: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    setup: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <Badge variant="outline" className={styles[status] || styles.setup}>
      {status === "live" ? "Live" : status === "partial" ? "Partial" : "Setup"}
    </Badge>
  );
}

function MetricCard({ label, value, note, icon: Icon, tone = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  };
  return (
    <Card className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
          {note ? <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{note}</p> : null}
        </div>
        <div className={`rounded-2xl p-3 ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function RevenueBars({ history = [] }) {
  const max = Math.max(1, ...history.map((month) => Number(month.total || 0)));
  return (
    <div className="grid h-56 grid-cols-6 items-end gap-3 pt-6">
      {history.map((month) => {
        const totalHeight = Math.max(4, (Number(month.total || 0) / max) * 168);
        const stripeShare = month.total ? Number(month.stripe || 0) / month.total : 0;
        return (
          <div key={month.key} className="flex h-full min-w-0 flex-col items-center justify-end gap-2">
            <div className="text-center text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {month.total ? money(month.total) : "—"}
            </div>
            <div
              className="flex w-full max-w-16 flex-col-reverse overflow-hidden rounded-t-lg bg-slate-100 dark:bg-slate-800"
              style={{ height: `${totalHeight}px` }}
              title={`${month.label}: ${money(month.total)} gross`}
            >
              {stripeShare > 0 ? (
                <div className="bg-[#1E5EFF]" style={{ height: `${stripeShare * 100}%` }} />
              ) : null}
              {stripeShare < 1 && month.total ? (
                <div className="flex-1 bg-violet-500" />
              ) : null}
            </div>
            <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{month.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const query = useQuery({
    queryKey: ["owner-dashboard"],
    queryFn: () => api.getOwnerDashboard(),
    enabled: isAdmin,
    staleTime: 60_000,
  });
  const data = query.data;
  const maxAppleProceeds = data?.money?.apple?.estimatedProceeds ?? 0;
  const appleProceedsKnown = data?.money?.apple?.source !== "setup";
  const connectionRows = useMemo(
    () => Object.entries(data?.sources || {}),
    [data?.sources],
  );

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card className={`${cardClass} p-10 text-center`}>
          <Shield className="mx-auto mb-4 h-12 w-12 text-slate-300" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Owner access only</h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">This private business view is restricted to administrators.</p>
        </Card>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-[#1E5EFF]" />
      </div>
    );
  }

  if (query.isError || !data) {
    return (
      <Card className={`${cardClass} mx-auto max-w-3xl p-8 text-center`}>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Owner dashboard could not load</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{query.error?.message || "Please try again."}</p>
        <Button className="mt-5" onClick={() => query.refetch()}>Try again</Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-7 overflow-x-clip pb-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5EFF]">
            <CircleDollarSign className="h-4 w-4" /> RBTGenius Owner
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Business & product health</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Private, source-labeled metrics. Refreshed {new Date(data.generatedAt).toLocaleString()}.
          </p>
        </div>
        <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">Money to you</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">What you actually keep</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Verified total take-home"
            value="Not ready"
            note="We will not call gross sales take-home. Stripe fees and Apple final financial payout still need reconciliation."
            icon={BadgeDollarSign}
            tone="amber"
          />
          <MetricCard
            label="Customer spending"
            value={money(data.money.customerGross)}
            note={`${number(data.money.transactions)} completed production ${data.money.transactions === 1 ? "transaction" : "transactions"} · all time`}
            icon={CreditCard}
          />
          <MetricCard
            label="Apple estimated payout"
            value={appleProceedsKnown ? money(maxAppleProceeds) : "Connect"}
            note={appleProceedsKnown ? "After estimated store taxes and commission" : "RevenueCat proceeds access or future webhook financial fields required"}
            icon={Apple}
            tone="violet"
          />
          <MetricCard
            label="Stripe payout after fees"
            value="Connect"
            note={`${money(data.money.stripe.gross)} gross is recorded; processing fees are not yet reconciled`}
            icon={CircleDollarSign}
            tone="green"
          />
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          <strong>Important:</strong> platform payout is still before your business or personal income taxes. “Customer spending” is revenue before Apple/Stripe deductions; it is not money in your bank.
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className={`${cardClass} p-5 sm:p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1E5EFF]">Revenue</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Customer spending by month</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Gross revenue · blue Stripe, violet Apple</p>
            </div>
            <Badge variant="outline">Last 6 months</Badge>
          </div>
          <RevenueBars history={data.history} />
        </Card>

        <Card className={`${cardClass} p-5 sm:p-6`}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-500">Channels</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Sales by platform</h2>
          <div className="mt-6 space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"><CreditCard className="h-5 w-5" /></div>
                <div><p className="font-semibold text-slate-900 dark:text-white">Web · Stripe</p><p className="text-xs text-slate-500">{number(data.money.stripe.transactions)} transactions</p></div>
              </div>
              <p className="text-lg font-bold text-slate-950 dark:text-white">{money(data.money.stripe.gross)}</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300"><Smartphone className="h-5 w-5" /></div>
                <div><p className="font-semibold text-slate-900 dark:text-white">iOS · Apple</p><p className="text-xs text-slate-500">{number(data.money.apple.transactions)} recorded transactions</p></div>
              </div>
              <p className="text-lg font-bold text-slate-950 dark:text-white">{money(data.money.apple.gross)}</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-500">Growth</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Customers & subscriptions</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Members" value={number(data.customers.total)} note={`${number(data.customers.active30d)} active in the last 30 days`} icon={Users} />
          <MetricCard label="Premium members" value={number(data.customers.premium)} note={`${data.customers.paidConversionRate}% of registered members`} icon={TrendingUp} tone="green" />
          <MetricCard label="Active trials" value={number(data.subscriptions.trialing)} note={`${number(data.subscriptions.convertedFromTrial)} converted from a trial`} icon={Activity} tone="violet" />
          <MetricCard label="Renewals recorded" value={number(data.subscriptions.renewals)} note={`${number(data.subscriptions.monthly)} monthly · ${number(data.subscriptions.yearly)} yearly premium`} icon={RefreshCw} tone="amber" />
        </div>
      </section>

      <Card className={`${cardClass} p-5 sm:p-6`}>
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-[#1E5EFF]" />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1E5EFF]">Data confidence</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">Connections and limitations</h2>
          </div>
        </div>
        <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {connectionRows.map(([key, source]) => (
            <div key={key} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold capitalize text-slate-900 dark:text-white">{key === "revenueCat" ? "RevenueCat" : key === "appStore" ? "App Store Connect" : key}</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{source.label}</p>
              </div>
              <StatusBadge status={source.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
