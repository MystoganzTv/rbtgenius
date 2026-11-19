import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, ExternalLink, GraduationCap, UserCheck } from "lucide-react";
import PublicPageShell from "@/components/public/PublicPageShell";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/lib/AuthContext";
import { createPageUrl } from "@/utils";

// Free public page: what changed in RBT certification maintenance in 2026.
// Not on the exam, but it is the first thing a new RBT looks for after passing,
// so it serves retention and search. Keep it to rules the BACB has published;
// link out for anything individual (dates, fees, approved providers).
//
// Last reviewed against BACB sources: 18 Nov 2026.

const LAST_REVIEWED = { en: "Last reviewed: November 2026", es: "Última revisión: noviembre de 2026" };

const COPY = {
  en: {
    title: "Keeping your RBT certification in 2026",
    description:
      "What changed on January 1, 2026: two-year renewal, 12 professional development units and supervision by a BCaBA or BCBA.",
    summaryTitle: "The short version",
    summary: [
      "Renewal now happens every two years instead of every year.",
      "Instead of a yearly renewal competency assessment, you earn 12 Professional Development Units (PDUs) in each two-year cycle.",
      "Your supervisor must be a BCaBA or BCBA. The noncertified supervisor role no longer exists.",
      "Ongoing supervision is still required: at least 5% of your service hours each month.",
    ],
    transitionTitle: "If you renew in 2026",
    transition: [
      "Your 2026 renewal works the old way one last time, including the Renewal Competency Assessment.",
      "Your first two-year cycle starts after that renewal. For example, renew on March 1, 2026 and your next renewal is March 1, 2028.",
      "Only PDUs earned after your 2026 renewal count toward the 2028 renewal.",
    ],
    newTitle: "If you are newly certified",
    newRbt: [
      "You still complete the 40-hour training and the Initial Competency Assessment before the exam.",
      "Once certified, your two-year cycle starts on your certification date, and you need 12 PDUs by your first renewal.",
    ],
    pduTitle: "What counts as a PDU",
    pdu: [
      "Activities designed for RBTs that expand on what is in the RBT Test Content Outline.",
      "Training only about a specific client's program does not count.",
      "Check the RBT Handbook and your BACB account for approved pathways and how to log PDUs.",
    ],
    sourcesTitle: "Official sources",
    sources: [
      { label: "BACB: upcoming and recent changes", href: "https://www.bacb.com/upcoming-changes/" },
      { label: "RBT Handbook (latest version)", href: "https://www.bacb.com/rbt-handbook" },
    ],
    disclaimer:
      "RBT Genius is not affiliated with the BACB. Your own dates and requirements are in your BACB account; when in doubt, the BACB is the authority.",
    ctaTitle: "Still preparing for the exam?",
    cta: "Practice with questions aligned to the 3rd edition Test Content Outline.",
    ctaButton: "Start practicing",
    ctaButtonGuest: "Try it free",
    metaTitle: "RBT Renewal 2026: 12 PDUs, Two-Year Cycle and New Supervisor Rules | RBT Genius",
  },
  es: {
    title: "Mantener tu certificación RBT en 2026",
    description:
      "Qué cambió el 1 de enero de 2026: renovación cada dos años, 12 unidades de desarrollo profesional y supervisión por un BCaBA o BCBA.",
    summaryTitle: "En resumen",
    summary: [
      "La renovación ahora es cada dos años en lugar de cada año.",
      "En lugar de la evaluación de competencias anual para renovar, debes completar 12 unidades de desarrollo profesional (PDU) en cada ciclo de dos años.",
      "Tu supervisor debe ser BCaBA o BCBA. El rol de supervisor no certificado ya no existe.",
      "La supervisión continua sigue siendo obligatoria: al menos el 5 % de tus horas de servicio cada mes.",
    ],
    transitionTitle: "Si renuevas en 2026",
    transition: [
      "Tu renovación de 2026 se hace a la manera antigua por última vez, incluida la Renewal Competency Assessment.",
      "Tu primer ciclo de dos años empieza después de esa renovación. Por ejemplo, si renuevas el 1 de marzo de 2026, la siguiente renovación es el 1 de marzo de 2028.",
      "Solo cuentan para la renovación de 2028 las PDU obtenidas después de tu renovación de 2026.",
    ],
    newTitle: "Si te acabas de certificar",
    newRbt: [
      "Sigues completando la formación de 40 horas y la Initial Competency Assessment antes del examen.",
      "Una vez certificado, tu ciclo de dos años empieza en la fecha de certificación y necesitas 12 PDU antes de tu primera renovación.",
    ],
    pduTitle: "Qué cuenta como PDU",
    pdu: [
      "Actividades diseñadas para RBT que amplían lo que cubre el RBT Test Content Outline.",
      "La formación solo sobre el programa de un cliente concreto no cuenta.",
      "Consulta el RBT Handbook y tu cuenta del BACB para ver las vías aprobadas y cómo registrar las PDU.",
    ],
    sourcesTitle: "Fuentes oficiales",
    sources: [
      { label: "BACB: cambios recientes y próximos (en inglés)", href: "https://www.bacb.com/upcoming-changes/" },
      { label: "RBT Handbook (versión más reciente, en inglés)", href: "https://www.bacb.com/rbt-handbook" },
    ],
    disclaimer:
      "RBT Genius no está afiliado al BACB. Tus fechas y requisitos concretos están en tu cuenta del BACB; ante cualquier duda, la autoridad es el BACB.",
    ctaTitle: "¿Todavía te preparas para el examen?",
    cta: "Practica con preguntas alineadas con el Test Content Outline de la 3.ª edición.",
    ctaButton: "Empezar a practicar",
    ctaButtonGuest: "Pruébalo gratis",
    metaTitle: "Renovación RBT 2026: 12 PDU, ciclo de dos años y nuevas reglas de supervisión | RBT Genius",
  },
};

function Section({ icon: Icon, title, items }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
        <Icon className="h-5 w-5 text-[#1E5EFF]" />
        {title}
      </h2>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#1E5EFF]/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function usePageMeta(title, description) {
  useEffect(() => {
    const previousTitle = document.title;
    let meta = document.querySelector('meta[name="description"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    const previousDescription = meta.getAttribute("content");
    document.title = title;
    meta.setAttribute("content", description);
    return () => {
      document.title = previousTitle;
      if (created) meta.remove();
      else meta.setAttribute("content", previousDescription || "");
    };
  }, [title, description]);
}

export default function Recertification() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const copy = language === "es" ? COPY.es : COPY.en;
  usePageMeta(copy.metaTitle, copy.description);
  // Visitors from search have no account yet: send them to sign up, not to a
  // practice page that would bounce them to the login screen.
  const ctaTarget = isAuthenticated ? createPageUrl("Practice") : "/login?mode=register";

  return (
    <PublicPageShell title={copy.title} description={copy.description}>
      <Section icon={CheckCircle2} title={copy.summaryTitle} items={copy.summary} />
      <Section icon={CalendarClock} title={copy.transitionTitle} items={copy.transition} />
      <Section icon={GraduationCap} title={copy.newTitle} items={copy.newRbt} />
      <Section icon={UserCheck} title={copy.pduTitle} items={copy.pdu} />

      <section>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{copy.sourcesTitle}</h2>
        <ul className="mt-3 space-y-2">
          {copy.sources.map((source) => (
            <li key={source.href}>
              <a
                className="inline-flex items-center gap-1.5 font-medium text-[#1E5EFF] hover:underline"
                href={source.href}
                target="_blank"
                rel="noreferrer"
              >
                {source.label}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{copy.disclaimer}</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {language === "es" ? LAST_REVIEWED.es : LAST_REVIEWED.en}
        </p>
      </section>

      <section className="rounded-2xl border border-[#1E5EFF]/15 bg-[#1E5EFF]/5 p-5 dark:border-[#1E5EFF]/25 dark:bg-[#1E5EFF]/10">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{copy.ctaTitle}</h2>
        <p className="mt-2 text-base text-slate-600 dark:text-slate-300">{copy.cta}</p>
        <Link
          to={ctaTarget}
          className="mt-4 inline-flex h-11 items-center rounded-xl bg-[#1E5EFF] px-5 font-semibold text-white hover:bg-[#1E5EFF]/90"
        >
          {isAuthenticated ? copy.ctaButton : copy.ctaButtonGuest}
        </Link>
      </section>
    </PublicPageShell>
  );
}
