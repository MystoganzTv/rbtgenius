import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, PartyPopper, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/use-language";
import { api } from "@/lib/api";
import { getExamPlanStatus, todayDateKey } from "@/lib/exam-outcome";
import { createPageUrl } from "@/utils";

const COPY = {
  en: {
    askDateTitle: "When is your RBT exam?",
    askDateBody: "Add your date to see a countdown. After the exam we will ask how it went — it helps us make the questions better for everyone.",
    save: "Save date",
    saving: "Saving…",
    upcomingToday: "Your exam is today. You've got this!",
    upcoming: (days) => (days === 1 ? "Your exam is tomorrow" : `Your exam is in ${days} days`),
    change: "Change date",
    cancel: "Cancel",
    askResultTitle: "How did your RBT exam go?",
    askResultBody: "One tap. Your answer is private and only counted in totals.",
    passed: "I passed",
    notPassed: "I didn't pass this time",
    notYet: "I haven't taken it yet",
    newDate: "New exam date",
    passedTitle: "Congratulations, RBT!",
    passedBody: "Thanks for telling us. Next up: keeping your certification under the 2026 rules.",
    passedLink: "What changes after you pass",
    notPassedTitle: "Thanks for telling us",
    notPassedBody: "Many people pass on their next attempt. Start with the questions you missed, then set your new date.",
    reviewMistakes: "Practice my weak areas",
    setNewDate: "Set new exam date",
    error: "Couldn't save. Please try again.",
  },
  es: {
    askDateTitle: "¿Cuándo es tu examen RBT?",
    askDateBody: "Añade la fecha para ver la cuenta atrás. Después del examen te preguntaremos cómo te fue: nos ayuda a mejorar las preguntas para todos.",
    save: "Guardar fecha",
    saving: "Guardando…",
    upcomingToday: "Tu examen es hoy. ¡Tú puedes!",
    upcoming: (days) => (days === 1 ? "Tu examen es mañana" : `Tu examen es en ${days} días`),
    change: "Cambiar fecha",
    cancel: "Cancelar",
    askResultTitle: "¿Cómo te fue en el examen RBT?",
    askResultBody: "Un toque. Tu respuesta es privada y solo se cuenta en totales.",
    passed: "Aprobé",
    notPassed: "Esta vez no aprobé",
    notYet: "Todavía no lo he hecho",
    newDate: "Nueva fecha del examen",
    passedTitle: "¡Enhorabuena, RBT!",
    passedBody: "Gracias por contárnoslo. Lo siguiente: mantener tu certificación con las reglas de 2026.",
    passedLink: "Qué cambia después de aprobar",
    notPassedTitle: "Gracias por contárnoslo",
    notPassedBody: "Mucha gente aprueba en el siguiente intento. Empieza por las preguntas que fallaste y luego pon tu nueva fecha.",
    reviewMistakes: "Practicar mis áreas débiles",
    setNewDate: "Poner nueva fecha",
    error: "No se pudo guardar. Inténtalo de nuevo.",
  },
};

function formatDate(dateKey, language) {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ExamOutcomeCard() {
  const { language } = useLanguage();
  const copy = language === "es" ? COPY.es : COPY.en;
  const queryClient = useQueryClient();
  const [editingDate, setEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState("");

  const { data: outcome, isLoading, isError } = useQuery({
    queryKey: ["exam-outcome"],
    queryFn: api.getExamOutcome,
  });

  const save = useMutation({
    mutationFn: api.saveExamOutcome,
    onSuccess: (next) => {
      queryClient.setQueryData(["exam-outcome"], next);
      setEditingDate(false);
      setDateInput("");
    },
  });

  // The endpoint is new; until it is deployed the card simply stays hidden.
  if (isLoading || isError || !outcome) return null;

  const status = getExamPlanStatus(outcome);
  const showDateForm = status.state === "no_date" || editingDate;

  const dateForm = (
    <form
      className="mt-4 flex flex-wrap items-center gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (dateInput) save.mutate({ exam_date: dateInput });
      }}
    >
      <label className="sr-only" htmlFor="exam-date">
        {copy.newDate}
      </label>
      <input
        id="exam-date"
        type="date"
        // A first-time entry may be an exam already taken; only a reschedule
        // has to be in the future. The server accepts ±2 years either way.
        min={status.state === "no_date" ? undefined : todayDateKey()}
        value={dateInput}
        onChange={(event) => setDateInput(event.target.value)}
        className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-900 dark:border-[#1E5EFF]/25 dark:bg-[#0D1E3A] dark:text-slate-100"
      />
      <Button type="submit" disabled={!dateInput || save.isPending} className="h-11 rounded-xl bg-[#1E5EFF] px-5 hover:bg-[#1E5EFF]/90">
        {save.isPending ? copy.saving : copy.save}
      </Button>
      {editingDate ? (
        <Button type="button" variant="ghost" className="h-11 rounded-xl" onClick={() => setEditingDate(false)}>
          {copy.cancel}
        </Button>
      ) : null}
    </form>
  );

  let body;
  if (status.state === "awaiting_result" && !editingDate) {
    body = (
      <>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{copy.askResultTitle}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {formatDate(status.date, language)} · {copy.askResultBody}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            className="h-11 rounded-xl bg-emerald-600 px-5 hover:bg-emerald-600/90"
            disabled={save.isPending}
            onClick={() => save.mutate({ exam_result: "passed" })}
          >
            {copy.passed}
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl px-5"
            disabled={save.isPending}
            onClick={() => save.mutate({ exam_result: "not_passed" })}
          >
            {copy.notPassed}
          </Button>
          <Button variant="ghost" className="h-11 rounded-xl px-5" onClick={() => setEditingDate(true)}>
            {copy.notYet}
          </Button>
        </div>
      </>
    );
  } else if (status.state === "reported" && status.result === "passed" && !editingDate) {
    body = (
      <div className="flex items-start gap-4">
        <PartyPopper className="mt-1 h-7 w-7 flex-shrink-0 text-[#FFB800]" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{copy.passedTitle}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.passedBody}</p>
          <Link to={createPageUrl("Recertification")} className="mt-3 inline-block font-semibold text-[#1E5EFF] hover:underline">
            {copy.passedLink} →
          </Link>
        </div>
      </div>
    );
  } else if (status.state === "reported" && !editingDate) {
    body = (
      <div className="flex items-start gap-4">
        <RotateCcw className="mt-1 h-6 w-6 flex-shrink-0 text-[#1E5EFF]" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{copy.notPassedTitle}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.notPassedBody}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to={createPageUrl("Practice")}>
              <Button className="h-11 rounded-xl bg-[#1E5EFF] px-5 hover:bg-[#1E5EFF]/90">{copy.reviewMistakes}</Button>
            </Link>
            <Button variant="outline" className="h-11 rounded-xl px-5" onClick={() => setEditingDate(true)}>
              {copy.setNewDate}
            </Button>
          </div>
        </div>
      </div>
    );
  } else if (status.state === "upcoming" && !editingDate) {
    body = (
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-2xl bg-[#1E5EFF]/10 text-[#1E5EFF] dark:bg-[#1E5EFF]/20 dark:text-[#8EB0FF]">
            <span className="text-xl font-black leading-none">{status.daysLeft}</span>
            <CalendarDays className="mt-0.5 h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
              {status.daysLeft === 0 ? copy.upcomingToday : copy.upcoming(status.daysLeft)}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{formatDate(status.date, language)}</p>
          </div>
        </div>
        <Button variant="ghost" className="rounded-xl" onClick={() => setEditingDate(true)}>
          {copy.change}
        </Button>
      </div>
    );
  } else {
    body = (
      <>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
          {editingDate ? copy.newDate : copy.askDateTitle}
        </h2>
        {!editingDate ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.askDateBody}</p> : null}
      </>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 dark:border-[#1E5EFF]/15 dark:bg-[#0B1628]">
      {body}
      {showDateForm ? dateForm : null}
      {save.isError ? <p className="mt-3 text-sm text-red-600">{copy.error}</p> : null}
    </section>
  );
}
