import { localizeDataSheet } from "@/lib/questions";
import { cn } from "@/lib/utils";

// A filled-in data sheet (DRO intervals, ABC, token record, frequency count)
// for applied questions. Drawn from data instead of a photo, so it stays sharp,
// translates with the question, and reads as a real table to screen readers.

function Tally({ count }) {
  if (!count) return <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">—</span>;
  return (
    <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={cn(
            "inline-block h-4 w-[2.5px] rounded-full bg-orange-600 dark:bg-orange-400",
            index > 0 && index % 5 === 0 && "ml-1.5",
          )}
        />
      ))}
    </span>
  );
}

function Dots({ count }) {
  if (!count) return <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">—</span>;
  return (
    <span className="inline-flex flex-wrap justify-center gap-1" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="inline-block h-3 w-3 rounded-full bg-[#1E5EFF] dark:bg-sky-400" />
      ))}
    </span>
  );
}

function Checkbox({ checked }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-4 w-4 items-center justify-center rounded-[3px] border border-slate-400 text-[11px] leading-none text-slate-700 dark:border-slate-500 dark:text-slate-200"
    >
      {checked ? "✓" : ""}
    </span>
  );
}

function cellLabel(render, value, language) {
  const spanish = language === "es";
  if (render === "checkbox") {
    if (value === true) return spanish ? "marcado" : "checked";
    return spanish ? "en blanco" : "blank";
  }
  return String(value ?? "");
}

function Cell({ render, value, language }) {
  if (render === "text") return <span>{value}</span>;
  if (render === "number") return <span className="font-medium tabular-nums">{value}</span>;
  return (
    <>
      {render === "tally" ? <Tally count={value} /> : null}
      {render === "dots" ? <Dots count={value} /> : null}
      {render === "checkbox" ? <Checkbox checked={value === true} /> : null}
      <span className="sr-only">{cellLabel(render, value, language)}</span>
    </>
  );
}

export default function DataSheet({ sheet, questionId, language = "en", className }) {
  const localized = localizeDataSheet(sheet, questionId, language);
  if (!localized || !Array.isArray(localized.columns) || !Array.isArray(localized.rows)) {
    return null;
  }

  const textSheet = localized.rows.some((row) => row.render === "text");

  return (
    <figure
      className={cn(
        "mx-auto w-full rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/50",
        textSheet ? "max-w-2xl" : "max-w-xl",
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px] text-slate-800 dark:text-slate-100">
          <caption className="mb-2 text-left">
            <span className="block text-sm font-semibold text-slate-900 dark:text-slate-50">{localized.title}</span>
            {localized.subtitle ? (
              <span className="block text-xs text-slate-500 dark:text-slate-400">{localized.subtitle}</span>
            ) : null}
          </caption>
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800/70">
              <th scope="col" className="border border-slate-300 px-2 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300">
                {localized.corner || ""}
              </th>
              {localized.columns.map((column, index) => (
                <th
                  key={index}
                  scope="col"
                  className={cn(
                    "border border-slate-300 px-2 py-1.5 font-semibold dark:border-slate-700",
                    !textSheet && "text-center",
                  )}
                >
                  {column.label}
                  {column.sublabel ? (
                    <span className="block text-[10px] font-normal text-slate-500 dark:text-slate-400">
                      {column.sublabel}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localized.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th
                  scope="row"
                  className="whitespace-nowrap border border-slate-300 px-2 py-2 text-xs font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
                >
                  {row.label}
                </th>
                {row.cells.map((value, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      "border border-slate-300 px-2 py-2 align-middle dark:border-slate-700",
                      row.render === "text" ? "align-top leading-snug" : "text-center",
                    )}
                  >
                    <Cell render={row.render} value={value} language={language} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
