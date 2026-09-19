import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
    partial:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
    setup:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
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
    green:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
    violet:
      "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300",
  };
  return (
    <Card className={`${cardClass} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            {value}
          </p>
          {note ? (
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {note}
            </p>
          ) : null}
        </div>
        <div className={`rounded-2xl p-3 ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";
const percent = (value) => (value == null ? "Not enough data" : `${value}%`);
const date = (value) =>
  new Date(value).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
const planName = (plan) =>
  plan === "premium_yearly"
    ? "Yearly"
    : plan === "premium_monthly"
      ? "Monthly"
      : "One-time / other";
function comparison(metric, currency = false) {
  if (!metric || metric.previous === null) return "All recorded history";
  const previous = currency ? money(metric.previous) : number(metric.previous);
  return metric.changePercent === null
    ? `Previous period: ${previous} · no percentage baseline`
    : `${metric.changePercent > 0 ? "+" : ""}${metric.changePercent}% vs previous period (${previous})`;
}

function RevenueBars({ history = [] }) {
  if (!history.some((item) => item.total > 0))
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        No recorded sales for this period.
      </div>
    );
  return (
    <div
      className="mt-6 h-64 w-full"
      role="img"
      aria-label="Recorded gross revenue by date, split between Stripe and Apple. Exact amounts are available in the transactions table."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={history}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          accessibilityLayer
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#94a3b8"
            opacity={0.2}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#64748b", fontSize: 11 }}
            minTickGap={28}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => `$${number(value)}`}
            tick={{ fill: "#64748b", fontSize: 11 }}
            width={65}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [money(value), name]}
            contentStyle={{ borderRadius: 12, color: "#0f172a" }}
          />
          <Bar
            dataKey="stripe"
            name="Stripe"
            stackId="revenue"
            fill="#1E5EFF"
            maxBarSize={48}
          />
          <Bar
            dataKey="apple"
            name="Apple"
            stackId="revenue"
            fill="#8b5cf6"
            maxBarSize={48}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SectionTitle({ eyebrow, title, note }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1E5EFF]">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
        {title}
      </h2>
      {note && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {note}
        </p>
      )}
    </div>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [options, setOptions] = useState({ range: "30d", page: 1 });
  const [range, setRange] = useState("30d");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [dateError, setDateError] = useState("");
  const query = useQuery({
    queryKey: ["owner-dashboard", options],
    queryFn: () => api.getOwnerDashboard(options),
    enabled: isAdmin,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const data = query.data;
  const business = data?.business;
  const period = data?.period;
  const stripe = data?.money?.stripe;
  const apple = data?.money?.apple;
  const transactions = data?.transactions;
  const today = new Date().toISOString().slice(0, 10);
  function chooseRange(value) {
    setRange(value);
    setDateError("");
    if (value !== "custom") setOptions({ range: value, page: 1 });
  }
  function applyDates(event) {
    event.preventDefault();
    if (!start || !end || start > end || start > today || end > today) {
      setDateError("Choose valid dates, ending on or before today.");
      return;
    }
    setDateError("");
    setOptions({ range: "custom", start, end, page: 1 });
  }
  if (!isAdmin)
    return (
      <Card className={`${cardClass} mx-auto max-w-3xl p-10 text-center`}>
        <Shield className="mx-auto mb-4 h-12 w-12 text-slate-300" />
        <h1 className="text-2xl font-bold">Owner access only</h1>
        <p className="mt-2 text-slate-500">
          This private business view is restricted to administrators.
        </p>
      </Card>
    );

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-7 overflow-x-clip px-4 pb-8 pt-4 md:px-0 md:pt-0">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#1E5EFF]">
            <CircleDollarSign className="h-4 w-4" /> Private business metrics
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Business Metrics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Revenue, paying customers and the habits that bring them back.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`}
          />{" "}
          Refresh
        </Button>
      </header>

      <Card className={`${cardClass} p-4`}>
        <form onSubmit={applyDates} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
            Reporting period
            <select
              aria-label="Reporting period"
              className={fieldClass}
              value={range}
              onChange={(event) => chooseRange(event.target.value)}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="month">This month</option>
              <option value="all">All time</option>
              <option value="custom">Custom dates</option>
            </select>
          </label>
          {range === "custom" && (
            <>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                From
                <input
                  aria-label="From date"
                  type="date"
                  className={fieldClass}
                  required
                  max={end || today}
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-500">
                To
                <input
                  aria-label="To date"
                  type="date"
                  className={fieldClass}
                  required
                  min={start}
                  max={today}
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                />
              </label>
              <Button type="submit">Apply dates</Button>
            </>
          )}
          <span className="pb-2 text-xs text-slate-500" aria-live="polite">
            {query.isFetching
              ? "Updating metrics…"
              : period
                ? `${date(period.start)} – ${date(new Date(Date.parse(period.endExclusive) - 1))} · UTC`
                : "All dates use UTC"}
          </span>
        </form>
        {dateError && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {dateError}
          </p>
        )}
        {period?.previous && (
          <p className="mt-3 text-xs text-slate-500">
            Compared with{" "}
            {new Date(period.previous.start).toLocaleString("en-US", {
              timeZone: "UTC",
            })}{" "}
            –{" "}
            {new Date(
              Date.parse(period.previous.endExclusive) - 1,
            ).toLocaleString("en-US", { timeZone: "UTC" })}{" "}
            UTC, using the same elapsed duration.
          </p>
        )}
      </Card>
      {query.isError && (
        <Card className={`${cardClass} p-6`} role="alert">
          <p className="font-semibold">Metrics could not be refreshed</p>
          <p className="mt-1 text-sm text-slate-500">
            {query.error?.message || "Please try again."}
          </p>
          <Button className="mt-3" onClick={() => query.refetch()}>
            Try again
          </Button>
        </Card>
      )}
      {query.isLoading && (
        <div
          className="flex min-h-64 items-center justify-center"
          role="status"
        >
          <RefreshCw className="mr-3 h-6 w-6 animate-spin text-[#1E5EFF]" />{" "}
          Loading business metrics…
        </div>
      )}
      {data && business && (
        <div
          className={`space-y-7 ${query.isPlaceholderData ? "opacity-60" : ""}`}
          aria-busy={query.isFetching}
        >
          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Business overview"
          >
            <MetricCard
              label="Revenue in period"
              value={money(data.money.customerGross)}
              note={`${comparison(business.comparisons.gross, true)} · before deductions`}
              icon={CircleDollarSign}
            />
            <MetricCard
              label="Estimated MRR · now"
              value={
                business.current.estimatedMrr === null
                  ? "Unavailable"
                  : money(business.current.estimatedMrr)
              }
              note="Latest recorded subscription payment, normalized monthly. Annual plans ÷ 12. Excludes trials and one-time purchases."
              icon={TrendingUp}
              tone="violet"
            />
            <MetricCard
              label="Paying subscribers · now"
              value={number(business.current.paid)}
              note={`${number(business.current.monthly)} monthly · ${number(business.current.yearly)} yearly with a recorded paid period still in effect`}
              icon={Users}
              tone="green"
            />
            <MetricCard
              label="First-time subscribers"
              value={number(business.comparisons.newPaid.current)}
              note={comparison(business.comparisons.newPaid)}
              icon={BadgeDollarSign}
              tone="amber"
            />
          </section>
          <p className="text-xs leading-5 text-slate-500">
            MRR and paying subscribers are current estimates, independent of the
            selected dates. {number(business.current.inferredPeriods)} paid
            periods use an inferred end date;{" "}
            {number(business.current.unverifiedPremium)} Premium accounts lack a
            matching current paid record and are excluded. Historical
            subscription snapshots are not available for comparison.
          </p>

          <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            <Card className={`${cardClass} min-w-0 p-5 sm:p-6`}>
              <SectionTitle
                eyebrow="Revenue"
                title="Sales over time"
                note="Recorded gross revenue · blue Stripe, violet Apple"
              />
              <RevenueBars history={data.history} />
            </Card>
            <Card className={`${cardClass} p-5 sm:p-6`}>
              <SectionTitle
                eyebrow="Platforms"
                title="Where revenue comes from"
                note={`${number(data.money.transactions)} production payments in this period`}
              />
              <div className="mt-6 space-y-6">
                {[
                  {
                    label: "Web · Stripe",
                    amount: stripe.gross,
                    count: stripe.transactions,
                    icon: CreditCard,
                  },
                  {
                    label: "iOS · Apple",
                    amount: apple.gross,
                    count: apple.transactions,
                    icon: Smartphone,
                  },
                ].map(({ label, amount, count, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-[#1E5EFF]" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {number(count)} payments ·{" "}
                          {data.money.customerGross
                            ? Math.round(
                                (amount / data.money.customerGross) * 100,
                              )
                            : 0}
                          % of revenue
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">
                      {money(amount)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs text-slate-500">
                Totals, chart and transaction details use the same recorded
                payments and date range.
              </p>
            </Card>
          </section>

          <section className="space-y-3">
            <SectionTitle
              eyebrow="After deductions"
              title="Revenue after platform fees"
              note="Before operating expenses and income taxes. These amounts do not confirm a bank deposit; later refunds and disputes are not reconciled here."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard
                label="Stripe · reconciled net"
                value={stripe.net === null ? "Pending" : money(stripe.net)}
                note={`${number(stripe.netCoverage)} of ${number(stripe.netCoverageTotal)} payments reconciled${stripe.fees === null ? "" : ` · ${money(stripe.fees)} in fees`}${stripe.uncoveredGross ? ` · ${money(stripe.uncoveredGross)} gross still pending` : ""}`}
                icon={CreditCard}
                tone="green"
              />
              <MetricCard
                label="Apple · estimated proceeds"
                value={
                  apple.proceedsCoverage
                    ? money(apple.estimatedProceeds)
                    : "Unavailable"
                }
                note={`${number(apple.proceedsCoverage)} of ${number(apple.proceedsCoverageTotal)} payments include estimated deductions. Apple's final financial payout is not connected.`}
                icon={Apple}
                tone="violet"
              />
            </div>
          </section>

          <section className="space-y-3">
            <SectionTitle
              eyebrow="Conversion"
              title="From sign-up to first payment"
              note="Acquisition and trial cohorts use the selected dates. Administrators are excluded from member metrics."
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="New members"
                value={number(business.comparisons.newMembers.current)}
                note={comparison(business.comparisons.newMembers)}
                icon={Users}
              />
              <MetricCard
                label="Active trials · now"
                value={number(data.subscriptions.trialing)}
                note="Trial access is counted separately from paying subscribers."
                icon={Activity}
                tone="violet"
              />
              <MetricCard
                label="Trial → paid"
                value={percent(business.trialConversion.rate)}
                note={`${number(business.trialConversion.converted)} converted of ${number(business.trialConversion.eligible)} ended trials from the selected start-date cohorts`}
                icon={TrendingUp}
                tone="green"
              />
              <MetricCard
                label="Renewals recorded"
                value={number(business.renewals)}
                note={`${number(business.current.periodsEnding7d)} current paid periods end in the next 7 days; this does not confirm auto-renewal.`}
                icon={RefreshCw}
                tone="amber"
              />
            </div>
            <Card className={`${cardClass} overflow-hidden p-5`}>
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Trial conversion by start month
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Conversion is measured through today. Trials that have not ended
                are excluded from the rate. Older cohorts have had more time to
                convert.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-slate-500">
                    <tr>
                      {[
                        "Started",
                        "Trials",
                        "Ended",
                        "Converted",
                        "Still pending",
                        "Conversion",
                      ].map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="whitespace-nowrap px-3 py-2"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {business.trialConversion.cohorts.map((cohort) => (
                      <tr
                        key={cohort.key}
                        className="text-slate-800 dark:text-slate-200"
                      >
                        {[
                          cohort.key,
                          cohort.started,
                          cohort.eligible,
                          cohort.converted,
                          cohort.pending,
                          percent(cohort.conversionRate),
                        ].map((value, index) => (
                          <td
                            key={index}
                            className="whitespace-nowrap px-3 py-3"
                          >
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {!business.trialConversion.cohorts.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-5 text-center text-slate-500"
                        >
                          No recorded trial starts in this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
            <p className="text-xs text-slate-500">
              Cancellation rates, expected renewal rates and payment-failure
              rates are unavailable until a complete subscription event history
              is stored.
            </p>
          </section>

          <section className="space-y-3">
            <SectionTitle
              eyebrow="Product health"
              title="Are new members studying and coming back?"
              note="Members who signed up in the selected period. Only cohorts with a complete observation window are included."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard
                label="Study activation · first 7 days"
                value={percent(business.engagement.activation.rate)}
                note={`${number(business.engagement.activation.count)} of ${number(business.engagement.activation.eligible)} eligible members answered a practice question or completed a mock exam in their first 7 days.`}
                icon={Activity}
                tone="green"
              />
              <MetricCard
                label="Study retention · week two"
                value={percent(business.engagement.weekTwo.rate)}
                note={`${number(business.engagement.weekTwo.count)} of ${number(business.engagement.weekTwo.eligible)} eligible members studied on days 7–13 after joining. Requires 14 days of observation.`}
                icon={Users}
                tone="violet"
              />
            </div>
            <p className="text-xs text-slate-500">
              {number(data.customers.total)} total members ·{" "}
              {number(data.customers.active30d)} active in the last 30 days
              across all signup dates. Study metrics measure recorded activity,
              not exam readiness.
            </p>
          </section>

          <section className="space-y-3">
            <SectionTitle
              eyebrow="Payment detail"
              title="The transactions behind the totals"
              note="USD amounts. Apple proceeds are estimates; missing deductions stay pending."
            />
            <Card className={`${cardClass} overflow-hidden`}>
              <div className="max-h-[520px] overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-500 dark:bg-slate-800">
                    <tr>
                      {[
                        "Date · UTC",
                        "Platform / reference",
                        "Plan",
                        "Gross",
                        "Fees",
                        "Net / estimate",
                        "Status",
                      ].map((label) => (
                        <th
                          key={label}
                          scope="col"
                          className="whitespace-nowrap px-5 py-3"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {transactions.rows.map((row) => (
                      <tr
                        key={row.id}
                        className="text-slate-800 dark:text-slate-200"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          {date(row.date)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium">
                            {row.provider === "stripe" ? "Stripe" : "Apple"}
                          </p>
                          <p
                            className="mt-1 max-w-44 truncate text-xs text-slate-500"
                            title={row.id}
                          >
                            {row.id}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {planName(row.plan)}
                        </td>
                        <td className="px-5 py-4">{money(row.gross)}</td>
                        <td className="px-5 py-4">
                          {row.fees === null ? "—" : money(row.fees)}
                        </td>
                        <td className="px-5 py-4">
                          {row.net === null ? "—" : money(row.net)}
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="outline">
                            {row.status === "reconciled"
                              ? "Reconciled"
                              : row.status === "estimated"
                                ? "Estimated"
                                : "Pending"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {!transactions.rows.length && (
                      <tr>
                        <td
                          colSpan={7}
                          className="p-8 text-center text-slate-500"
                        >
                          No recorded production payments for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4 dark:border-slate-800">
                <p className="text-xs text-slate-500">
                  {number(transactions.total)} payments · page{" "}
                  {transactions.page} of {transactions.pageCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    disabled={query.isFetching || transactions.page <= 1}
                    onClick={() =>
                      setOptions((value) => ({
                        ...value,
                        page: transactions.page - 1,
                      }))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={
                      query.isFetching ||
                      transactions.page >= transactions.pageCount
                    }
                    onClick={() =>
                      setOptions((value) => ({
                        ...value,
                        page: transactions.page + 1,
                      }))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          </section>

          <section className="space-y-3">
            <SectionTitle
              eyebrow="App Store"
              title="Acquisition & reliability"
              note={
                data.appleAnalytics?.period
                  ? `Apple reports: ${data.appleAnalytics.period}. Usage includes only people who share diagnostics; daily reports may lag behind payments.`
                  : "Apple daily reports are separate from payment records. Missing reports are shown as unavailable."
              }
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  label: "First-time downloads",
                  key: "downloads",
                  note: data.appleAnalytics?.availableReports?.includes(
                    "downloads",
                  )
                    ? `${number(data.appleAnalytics.redownloads)} redownloads · ${number(data.appleAnalytics.updates)} updates`
                    : "First-time App Store downloads",
                  icon: Smartphone,
                },
                {
                  label: "App Store page views",
                  key: "pageViews",
                  report: "discovery",
                  note:
                    data.appleAnalytics?.conversionRate != null &&
                    data.appleAnalytics?.availableReports?.includes("downloads")
                      ? `${data.appleAnalytics.conversionRate}% downloads incl. redownloads per unique impression`
                      : "Product page views in imported reports",
                  icon: TrendingUp,
                },
                {
                  label: "Opted-in sessions",
                  key: "sessions",
                  note:
                    data.appleAnalytics?.averageSessionSeconds != null
                      ? `${number(data.appleAnalytics.averageSessionSeconds)} seconds per session · opted-in users only`
                      : "Only users sharing usage diagnostics",
                  icon: Activity,
                },
                {
                  label: "Opted-in crashes",
                  key: "crashes",
                  note: data.appleAnalytics?.availableReports?.includes(
                    "installs",
                  )
                    ? `${number(data.appleAnalytics.installs)} installs · ${number(data.appleAnalytics.deletions)} deletions reported`
                    : "Low-volume reports may be suppressed",
                  icon: Shield,
                },
              ].map((item) => (
                <MetricCard
                  key={item.key}
                  label={item.label}
                  value={
                    !data.appleAnalytics ||
                    data.appleAnalytics.awaitingData ||
                    !data.appleAnalytics.availableReports?.includes(
                      item.report || item.key,
                    ) ||
                    data.appleAnalytics[item.key] == null
                      ? "Unavailable"
                      : number(data.appleAnalytics[item.key])
                  }
                  note={item.note}
                  icon={item.icon}
                />
              ))}
            </div>
          </section>

          <Card className={`${cardClass} p-5 sm:p-6`}>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-[#1E5EFF]" />
              <SectionTitle
                eyebrow="Data confidence"
                title="Sources and definitions"
              />
            </div>
            {data.revenueCatComparison && (
              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800">
                <p className="font-semibold">RevenueCat cross-check</p>
                <p className="mt-1 text-slate-500">
                  {money(data.revenueCatComparison.gross)} gross ·{" "}
                  {money(data.revenueCatComparison.estimatedProceeds)} estimated
                  proceeds · {money(data.revenueCatComparison.difference)}{" "}
                  difference from recorded Apple gross. Daily report dates:{" "}
                  {data.revenueCatComparison.start} –{" "}
                  {data.revenueCatComparison.end}. Today may still be
                  incomplete. These figures do not replace the ledger totals.
                </p>
              </div>
            )}
            {!!data.quality.excludedPayments && (
              <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
                {number(data.quality.excludedPayments)} completed records
                excluded across history: missing or future dates, no positive
                USD amount, or currency conversion unavailable.
              </p>
            )}
            <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {Object.entries(data.sources).map(([key, source]) => (
                <div
                  key={key}
                  className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold capitalize text-slate-900 dark:text-white">
                      {key === "revenueCat"
                        ? "RevenueCat"
                        : key === "appStore"
                          ? "App Store Connect"
                          : key === "appleFinancials"
                            ? "Apple financial reports"
                            : key}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {source.label}
                    </p>
                    {source.error && (
                      <p className="mt-1 text-xs text-amber-600">
                        {source.error}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={source.status} />
                </div>
              ))}
            </div>
            <details className="mt-4 text-sm text-slate-500">
              <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                How these metrics are calculated
              </summary>
              <ul className="mt-3 list-disc space-y-2 pl-5">
                <li>
                  Revenue includes positive completed production payments with a
                  valid date and known USD amount. Sandbox payments and free
                  trials are excluded.
                </li>
                <li>
                  Paying subscribers require current Premium access and a
                  subscription payment covering today. Missing period end dates
                  are estimated from the monthly or annual plan.
                </li>
                <li>
                  Estimated MRR uses the last recorded amount for those
                  subscribers. Discounts, prorations and missing records can
                  affect this estimate; it is not a future revenue forecast.
                </li>
                <li>
                  First-time subscribers are members whose first recorded
                  positive subscription payment falls within the selected
                  period. Older unrecorded purchases cannot be recovered from
                  these totals.
                </li>
                <li>
                  Trial conversion uses ended trials grouped by start date, with
                  conversions recorded through today. Pending trials are
                  excluded.
                </li>
                <li>
                  Study activation and retention use practice answers and
                  completed mock exams; logins alone do not count as studying.
                </li>
              </ul>
            </details>
            <p className="mt-5 text-xs text-slate-400">
              Calculated {new Date(data.generatedAt).toLocaleString()}. Source
              reports may have a different update time.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
