import { Languages, Volume2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { resolveInlineSpanishText, translateUi } from "@/lib/i18n";

const subscribers = new Set();
let activeTranslationPanel = null;

function notifyTranslationPanel() {
  for (const callback of subscribers) {
    callback(activeTranslationPanel);
  }
}

function openTranslationPanel(payload) {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  activeTranslationPanel = payload;
  notifyTranslationPanel();
}

function closeTranslationPanel(id) {
  if (!activeTranslationPanel) {
    return;
  }

  if (!id || activeTranslationPanel.id === id) {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    activeTranslationPanel = null;
    notifyTranslationPanel();
  }
}

function subscribeToTranslationPanel(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function pickBestVoice(langCode) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices?.length) {
    return null;
  }

  if (langCode === "es") {
    const preferredLocales = ["es-MX", "es-US", "es-419", "es-ES"];
    const preferredNames = ["Paulina", "Monica", "Paloma", "Jorge", "Juan", "Luciana"];

    for (const locale of preferredLocales) {
      const voice = voices.find((item) => item.lang === locale);
      if (voice) return voice;
    }

    for (const name of preferredNames) {
      const voice = voices.find((item) => item.name?.toLowerCase().includes(name.toLowerCase()));
      if (voice) return voice;
    }

    return voices.find((item) => item.lang?.toLowerCase().startsWith("es")) || null;
  }

  return voices.find((item) => item.lang === "en-US") || voices.find((item) => item.lang?.toLowerCase().startsWith("en")) || null;
}

export default function TranslateTextButton({
  englishText = "",
  spanishText = "",
  language = "en",
  title = "Translation",
  className = "",
  contentType = "question",
  question = null,
}) {
  const [speaking, setSpeaking] = useState(null);
  const [activePanel, setActivePanel] = useState(activeTranslationPanel);
  const utteranceRef = useRef(null);
  const panelId = useId();
  const english = String(englishText || "").trim();
  const spanish = resolveInlineSpanishText({
    englishText,
    spanishText,
    contentType,
    question,
  });
  const hasSpanish = Boolean(spanish);
  const isOpen = activePanel?.id === panelId;

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  useEffect(() => subscribeToTranslationPanel(setActivePanel), []);

  useEffect(() => {
    if (!isOpen) {
      setSpeaking(null);
      utteranceRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    if (activeTranslationPanel?.id === panelId) {
      closeTranslationPanel(panelId);
    }
  }, [panelId]);

  if (!english && !hasSpanish) {
    return null;
  }

  if (!hasSpanish) {
    return null;
  }

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setSpeaking(null);
  };

  const speakText = (text, langCode) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (speaking === langCode) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickBestVoice(langCode);
    utterance.voice = voice || null;
    utterance.lang = voice?.lang || (langCode === "es" ? "es-MX" : "en-US");
    utterance.rate = langCode === "es" ? 0.92 : 0.95;
    utterance.onend = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setSpeaking(null);
      }
    };
    utterance.onerror = () => {
      if (utteranceRef.current === utterance) {
        utteranceRef.current = null;
        setSpeaking(null);
      }
    };

    utteranceRef.current = utterance;
    setSpeaking(langCode);
    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePanel = (event) => {
    stopPropagation(event);

    if (isOpen) {
      stopSpeaking();
      closeTranslationPanel(panelId);
      return;
    }

    openTranslationPanel({
      id: panelId,
      english,
      spanish,
      language,
      title,
    });
  };

  const handleClosePanel = () => {
    stopSpeaking();
    closeTranslationPanel(panelId);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 rounded-full border border-slate-200 bg-white/90 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50 ${className}`}
        aria-label={translateUi("View translation", language)}
        onClick={handleTogglePanel}
        onPointerDown={stopPropagation}
      >
        <Languages className="h-4 w-4" />
      </Button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed right-4 top-4 z-[140] w-[min(24rem,calc(100vw-2rem))]" onClick={stopPropagation}>
              <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_28px_90px_-36px_rgba(15,23,42,0.45)] dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      {translateUi(title, language)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50"
                    aria-label={translateUi("Close", language)}
                    onClick={handleClosePanel}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="max-h-[calc(100vh-7rem)] space-y-3 overflow-y-auto p-4">
                  <section className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        EN
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Play English audio"
                        onClick={() => speakText(english, "en")}
                      >
                        <Volume2 className={`h-4 w-4 ${speaking === "en" ? "text-[#1E5EFF]" : ""}`} />
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-50">
                      {english || "—"}
                    </p>
                  </section>

                  <section className="rounded-2xl border border-[#1E5EFF]/15 bg-[#1E5EFF]/5 p-4 dark:border-[#1E5EFF]/20 dark:bg-[#1E5EFF]/10">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1E5EFF]">
                        ES
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full text-[#1E5EFF] hover:bg-[#1E5EFF]/10 hover:text-[#1E5EFF] dark:hover:bg-[#1E5EFF]/15"
                        aria-label="Play Spanish audio"
                        disabled={!hasSpanish}
                        onClick={() => speakText(spanish, "es")}
                      >
                        <Volume2 className={`h-4 w-4 ${speaking === "es" ? "text-[#1E5EFF]" : ""}`} />
                      </Button>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-50">
                      {hasSpanish ? spanish : translateUi("Spanish translation unavailable.", language)}
                    </p>
                  </section>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
