import PublicPageShell from "@/components/public/PublicPageShell";
import BilingualText from "@/components/i18n/BilingualText";
import { useLanguage } from "@/hooks/use-language";
import { localizeText, translateUi } from "@/lib/i18n";

export default function Contact() {
  const { language } = useLanguage();

  return (
    <PublicPageShell
      title="Contact"
      description="Reach out to RBT Genius for support, billing questions, or product-related help."
    >
      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {translateUi("Support email", language)}
        </h2>
        <p className="mt-3">
          {localizeText("The main contact for RBT Genius is", language).primary}
          {" "}
          <a className="font-medium text-[#1E5EFF]" href="mailto:support@rbtgenius.app">
            support@rbtgenius.app
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {translateUi("What to include", language)}
        </h2>
        <BilingualText
          content={localizeText("For faster help, include the email on your account and a short description of the issue. If your question is about billing, include the plan and approximate date of purchase.", language)}
          className="mt-3"
        />
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {translateUi("Topics we can help with", language)}
        </h2>
        <BilingualText
          content={localizeText("We can help with account access, premium billing, technical issues, and general support related to using the RBT Genius platform.", language)}
          className="mt-3"
        />
      </section>
    </PublicPageShell>
  );
}
