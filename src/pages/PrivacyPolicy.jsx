import PublicPageShell from "@/components/public/PublicPageShell";
import BilingualText from "@/components/i18n/BilingualText";
import { useLanguage } from "@/hooks/use-language";
import { localizeText } from "@/lib/i18n";

export default function PrivacyPolicy() {
  const { language } = useLanguage();
  const localized = (text) => localizeText(text, language);

  return (
    <PublicPageShell
      title="Privacy Policy"
      description="This policy explains what information RBT Genius collects, how it is used, and how it supports your study experience."
    >
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("1. Information we collect").primary}</h2>
        <BilingualText content={localized("We may collect account details such as your name, email address, login method, plan, study activity, attempts, mock exam results, usage analytics, and billing-related records connected to your account.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("2. Why we collect it").primary}</h2>
        <BilingualText content={localized("We use your information to operate the platform, save your progress, personalize your experience, manage subscriptions, improve product performance, and provide support when needed.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("3. Billing and payment data").primary}</h2>
        <BilingualText content={localized("Subscription payments may be processed through Stripe. RBT Genius may store payment metadata such as plan, amount, currency, status, Stripe customer IDs, and Stripe session or subscription references. Full card data is not stored directly by RBT Genius.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("4. OAuth and sign-in providers").primary}</h2>
        <BilingualText content={localized("If you sign in with providers such as Google, Apple, GitHub, or Microsoft, we may store your provider name, basic profile information, and linked account identifiers needed to support login and account recovery.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("5. Data retention").primary}</h2>
        <BilingualText content={localized("We retain account and study information for as long as needed to operate your account, maintain records, improve service quality, and comply with applicable legal or financial obligations.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("6. Contact").primary}</h2>
        <p className="mt-3">
          {localized("Privacy questions can be sent to").primary}
          {" "}
          <a className="font-medium text-[#1E5EFF]" href="mailto:support@rbtgenius.app">
            support@rbtgenius.app
          </a>
          .
        </p>
      </section>
    </PublicPageShell>
  );
}
