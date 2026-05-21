import PublicPageShell from "@/components/public/PublicPageShell";
import BilingualText from "@/components/i18n/BilingualText";
import { useLanguage } from "@/hooks/use-language";
import { localizeText } from "@/lib/i18n";

export default function RefundPolicy() {
  const { language } = useLanguage();
  const localized = (text) => localizeText(text, language);

  return (
    <PublicPageShell
      title="Refund Policy"
      description="This policy explains how refund requests are handled for RBT Genius premium memberships."
    >
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("1. Subscription purchases").primary}</h2>
        <BilingualText content={localized("Premium access may be sold as monthly or yearly recurring billing. By purchasing a premium subscription, you authorize recurring charges according to the plan selected during checkout.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("2. Refund requests").primary}</h2>
        <BilingualText content={localized("Refund requests are reviewed on a case-by-case basis. If you believe you were charged in error or experienced a billing problem, contact us as soon as possible so we can review the situation.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("3. Non-refundable situations").primary}</h2>
        <BilingualText content={localized("In general, partial usage of a billing period, missed cancellations, or access to premium content alone may not automatically qualify for a refund. However, we will still review legitimate cases fairly.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("4. How to request help").primary}</h2>
        <p className="mt-3">
          {localized("For billing support or refund review, email").primary}
          {" "}
          <a className="font-medium text-[#1E5EFF]" href="mailto:support@rbtgenius.app">
            support@rbtgenius.app
          </a>
          {" "}
          {localized("and include the email used on your account, the plan involved, and the date of the charge.").primary}
        </p>
      </section>
    </PublicPageShell>
  );
}
