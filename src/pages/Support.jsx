import PublicPageShell from "@/components/public/PublicPageShell";
import BilingualText from "@/components/i18n/BilingualText";
import { useLanguage } from "@/hooks/use-language";
import { localizeText, translateUi } from "@/lib/i18n";

const SUPPORT_EMAIL = "support@rbtgenius.app";

export default function Support() {
  const { language } = useLanguage();

  return (
    <PublicPageShell
      title="Support"
      description="Get help with account access, billing, technical issues, and general questions about RBT Genius."
    >
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {translateUi("Need help?", language)}
        </h2>
        <BilingualText
          content={localizeText(
            "If you need help with your account, billing, login, or anything inside the app, contact our support team and we will point you in the right direction.",
            language,
          )}
          className="mt-3"
        />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {translateUi("Support email", language)}
        </h2>
        <p className="mt-3 text-base text-slate-600 dark:text-slate-300">
          <a className="font-medium text-[#1E5EFF] hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {translateUi("Best way to contact us", language)}
        </h2>
        <BilingualText
          content={localizeText(
            "For faster support, include the email on your account, what device you are using, and a short description of the issue. If it is about billing, include the plan and approximate purchase date.",
            language,
          )}
          className="mt-3"
        />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {translateUi("Common topics", language)}
        </h2>
        <BilingualText
          content={localizeText(
            "We can help with sign-in issues, premium billing, subscription cancellations, translation problems, mobile app questions, and general technical support.",
            language,
          )}
          className="mt-3"
        />
      </section>
    </PublicPageShell>
  );
}
