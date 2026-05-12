import { useEffect, useState } from "react";
import { GraduationCap, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/hooks/use-language";

const VERSION = "1.2";
const STORAGE_KEY = `rbt_genius_whats_new_seen_${VERSION}`;

const CHANGELOG = {
  new: {
    icon: "🆕",
    label: { en: "What's New", es: "Novedades" },
    items: [
      {
        en: "Bilingual questions — EN/ES modal with translate button on every question",
        es: "Preguntas bilingüe — modal EN/ES con botón de traducción en cada pregunta",
      },
      {
        en: "ABA Glossary — tap key terms after answering for instant Spanish definitions",
        es: "Glosario ABA — toca términos clave después de responder para ver definiciones en español",
      },
      {
        en: "Readiness Score — new exam-based formula with domain safety caps",
        es: "Puntaje de preparación — nueva fórmula basada en simulados con límites por dominio",
      },
      {
        en: "Admin panel — global metrics, CSV export, send email to members",
        es: "Panel de admin — métricas globales, exportar CSV, enviar correos a miembros",
      },
      {
        en: "Email verification for new accounts on registration",
        es: "Verificación de correo para nuevas cuentas al registrarse",
      },
      {
        en: "Set or change your password from your profile",
        es: "Establece o cambia tu contraseña desde tu perfil",
      },
    ],
  },
  improved: {
    icon: "👍",
    label: { en: "Improved", es: "Mejorado" },
    items: [
      {
        en: "Practice questions — clean English only, no Spanglish mixing",
        es: "Preguntas de práctica — solo inglés limpio, sin mezcla de idiomas",
      },
      {
        en: "Dashboard — navy blue dark mode across all pages",
        es: "Panel — modo oscuro azul marino en todas las páginas",
      },
      {
        en: "Readiness labels — At Risk, Needs Reinforcement, Likely Exam Ready, Strong Pass Probability",
        es: "Etiquetas de preparación — En riesgo, Necesita refuerzo, Probablemente listo, Alta probabilidad de aprobar",
      },
      {
        en: "Admin members page — 4 total queries instead of per-user queries",
        es: "Página de miembros — 4 queries totales en vez de una por usuario",
      },
      {
        en: "Stripe webhook — handles subscription lifecycle, renewals and cancellations",
        es: "Webhook de Stripe — gestiona ciclo de suscripción, renovaciones y cancelaciones",
      },
    ],
  },
  fixed: {
    icon: "✅",
    label: { en: "Fixed", es: "Corregido" },
    items: [
      {
        en: "Google OAuth login now works correctly",
        es: "El login con Google OAuth funciona correctamente",
      },
      {
        en: "Mock exam domain breakdown no longer shows characters instead of percentages",
        es: "El desglose por dominio en simulados ya no muestra caracteres en vez de porcentajes",
      },
      {
        en: "Submit answer in practice no longer fails after multiple sessions",
        es: "Enviar respuesta en práctica ya no falla después de múltiples sesiones",
      },
      {
        en: "Admin members page loads all users correctly",
        es: "La página de miembros admin carga todos los usuarios correctamente",
      },
    ],
  },
};

export function WhatsNewModal({ open, onClose }) {
  const { language } = useLanguage();
  const lang = language === "es" ? "es" : "en";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-hidden p-0 dark:border-[#1E5EFF]/20 dark:bg-[#0B1628]">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 border-b border-slate-100 px-6 pb-5 pt-6 dark:border-[#1E5EFF]/15">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1E5EFF]">
            <GraduationCap className="h-7 w-7 text-white" />
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-lg font-bold text-slate-900 dark:text-slate-50">RBT</span>
              <span className="text-lg font-bold text-[#1E5EFF]">Genius</span>
              <Sparkles className="-mt-1 h-3.5 w-3.5 text-[#FFB800]" />
            </div>
            <span className="mt-1 inline-block rounded-full border border-[#1E5EFF]/20 bg-[#1E5EFF]/8 px-2.5 py-0.5 text-xs font-semibold text-[#1E5EFF]">
              v{VERSION}
            </span>
          </div>
        </div>

        {/* Sections */}
        <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: "calc(90vh - 160px)" }}>
          {Object.entries(CHANGELOG).map(([key, section]) => (
            <div key={key} className="mb-4">
              {/* Section header */}
              <div className={`mb-2 flex items-center gap-2 rounded-xl px-3 py-2 ${
                key === "new"
                  ? "bg-[#1E5EFF] text-white"
                  : key === "improved"
                    ? "bg-amber-50 dark:bg-amber-500/10"
                    : "bg-emerald-50 dark:bg-emerald-500/10"
              }`}>
                <span className="text-base">{section.icon}</span>
                <span className={`text-sm font-bold ${
                  key === "new"
                    ? "text-white"
                    : key === "improved"
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-emerald-700 dark:text-emerald-300"
                }`}>
                  {section.label[lang]}
                </span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  key === "new"
                    ? "bg-white/20 text-white"
                    : key === "improved"
                      ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
                      : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300"
                }`}>
                  {section.items.length}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-0.5">
                {section.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-[#0D1E3A]/60"
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                      key === "new" ? "bg-[#1E5EFF]" : key === "improved" ? "bg-amber-400" : "bg-emerald-400"
                    }`} />
                    <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {item[lang]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
            {lang === "es"
              ? "RBT Genius se actualiza constantemente para mejorar tu experiencia."
              : "RBT Genius is constantly updated to improve your experience."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to auto-show on first visit after a new version
export function useWhatsNew() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, "1");
    }
  }, []);

  return { open, setOpen };
}

export { VERSION };
