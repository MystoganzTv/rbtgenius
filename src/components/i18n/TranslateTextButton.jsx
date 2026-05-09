import { Languages, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { translateUi } from "@/lib/i18n";

export default function TranslateTextButton({
  englishText = "",
  spanishText = "",
  language = "en",
  title = "Translation",
  className = "",
}) {
  const [speaking, setSpeaking] = useState(null);
  const utteranceRef = useRef(null);
  const english = String(englishText || "").trim();
  const spanish = String(spanishText || "").trim();

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  useEffect(() => () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  if (!english && !spanish) {
    return null;
  }

  const speakText = (text, langCode) => {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    if (speaking === langCode) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setSpeaking(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode === "es" ? "es-ES" : "en-US";
    utterance.rate = 0.95;
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 rounded-full border border-slate-200 bg-white/90 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50 ${className}`}
          aria-label={translateUi("View translation", language)}
          onClick={stopPropagation}
          onPointerDown={stopPropagation}
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl rounded-[1.75rem] border-slate-200 bg-white p-0 dark:border-slate-800 dark:bg-slate-950">
        <DialogHeader className="border-b border-slate-100 px-6 py-5 text-left dark:border-slate-800">
          <DialogTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
            {translateUi(title, language)}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 p-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
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
                onClick={() => speakText(spanish || english, "es")}
              >
                <Volume2 className={`h-4 w-4 ${speaking === "es" ? "text-[#1E5EFF]" : ""}`} />
              </Button>
            </div>
            <p className="text-sm leading-relaxed text-slate-900 dark:text-slate-50">
              {spanish || english || "—"}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
