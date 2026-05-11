import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/use-language";
import { translateUi } from "@/lib/i18n";
import { createPageUrl } from "@/utils";

const CONTACT_EMAIL = "support@rbtgenius.app";

export default function PublicSiteFooter() {
  const { language } = useLanguage();

  return (
    <footer className="border-t border-slate-200/70 bg-white/90 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]/90">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-8 text-sm text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-200">
            RBT Genius
          </p>
          <p className="mt-1">
            {translateUi("Practical exam prep for future Registered Behavior Technicians.", language)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link to={createPageUrl("TermsOfService")} className="hover:text-slate-900 dark:hover:text-slate-100">
            {translateUi("Terms of Service", language)}
          </Link>
          <Link to={createPageUrl("PrivacyPolicy")} className="hover:text-slate-900 dark:hover:text-slate-100">
            {translateUi("Privacy Policy", language)}
          </Link>
          <Link to={createPageUrl("RefundPolicy")} className="hover:text-slate-900 dark:hover:text-slate-100">
            {translateUi("Refund Policy", language)}
          </Link>
          <Link to={createPageUrl("Store")} className="hover:text-slate-900 dark:hover:text-slate-100">
            {translateUi("Store", language)}
          </Link>
          <Link to={createPageUrl("Support")} className="hover:text-slate-900 dark:hover:text-slate-100">
            {translateUi("Support", language)}
          </Link>
          <Link to={createPageUrl("Contact")} className="hover:text-slate-900 dark:hover:text-slate-100">
            {translateUi("Contact", language)}
          </Link>
          <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-slate-900 dark:hover:text-slate-100">
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
