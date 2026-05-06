import PublicPageShell from "@/components/public/PublicPageShell";
import BilingualText from "@/components/i18n/BilingualText";
import { useLanguage } from "@/hooks/use-language";
import { localizeText } from "@/lib/i18n";

export default function TermsOfService() {
  const { language } = useLanguage();
  const localized = (text) => localizeText(text, language);

  return (
    <PublicPageShell
      title="Terms of Service"
      description="These terms explain how RBT Genius can be used, what we provide, and the responsibilities of members using the platform."
    >
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("1. About RBT Genius").primary}</h2>
        <BilingualText content={localized("RBT Genius is an educational platform designed to help users prepare for the Registered Behavior Technician exam through practice questions, flashcards, mock exams, analytics, and tutoring features. The platform is intended for study support and does not replace formal supervision, clinical judgment, or BACB guidance.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("2. Accounts and access").primary}</h2>
        <BilingualText content={localized("You are responsible for keeping your login credentials secure and for the activity that occurs under your account. You must provide accurate account information and use the service only for lawful and educational purposes.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("3. Membership plans").primary}</h2>
        <BilingualText content={localized("RBT Genius may offer free and premium access levels. Premium features may include expanded question access, mock exams, analytics, and billing tools. Plan details, pricing, and feature availability may change over time.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("4. Educational use only").primary}</h2>
        <BilingualText content={localized("Content inside RBT Genius is provided for study and review. It should not be treated as legal, medical, psychological, or supervisory advice. Users remain responsible for following the standards and requirements of the BACB, their employers, and their supervisors.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("5. Acceptable use").primary}</h2>
        <BilingualText content={localized("You may not misuse the platform, attempt unauthorized access, copy or resell protected content, interfere with service availability, or use automated methods to extract the question bank or system content without written permission.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("6. Service updates").primary}</h2>
        <BilingualText content={localized("We may improve, modify, or discontinue parts of the service as the product evolves. Reasonable effort will be made to maintain platform availability, but uninterrupted access is not guaranteed.")} className="mt-3" />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{localized("7. Contact").primary}</h2>
        <p className="mt-3">
          {localized("For account or legal questions related to these terms, contact").primary}
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
