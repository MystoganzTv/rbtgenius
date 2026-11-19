import { getAppliedTranslationEs } from "@/lib/questions";
import { cn } from "@/lib/utils";

// Line graph for applied questions that ask the student to read graphed data
// (Test Content Outline A.7). Drawn as plain SVG so it renders the same in the
// browser, the Capacitor shell and print, with no chart dependency.

const WIDTH = 360;
const HEIGHT = 210;
const PAD = { top: 28, right: 16, bottom: 40, left: 44 };
// Gap between the axes and the first/last data point, so no point sits on the
// y-axis (standard ABA graphing convention).
const INSET = 12;

function niceTicks(max) {
  const step = max <= 12 ? 2 : max <= 20 ? 5 : max <= 50 ? 10 : 20;
  const ticks = [];
  for (let value = 0; value <= max; value += step) ticks.push(value);
  return ticks;
}

// Screen-reader text: the full data, in the student's language, split by phase
// so the question can be answered without seeing the graph.
function describeChart({ yLabel, xLabel, series, phaseBreak, phaseLabels, spanish }) {
  const by = spanish ? "por" : "by";
  const heading = `${yLabel} ${by} ${xLabel.toLowerCase()}`;
  if (phaseBreak === null) return `${heading}: ${series.join(", ")}`;
  const first = phaseLabels[0] || (spanish ? "Antes del cambio de fase" : "Before the phase change");
  const second = phaseLabels[1] || (spanish ? "Después del cambio de fase" : "After the phase change");
  return `${heading}. ${first}: ${series.slice(0, phaseBreak).join(", ")}. ${second}: ${series
    .slice(phaseBreak)
    .join(", ")}.`;
}

export default function QuestionChart({ chart, questionId, language = "en", className }) {
  if (!chart || !Array.isArray(chart.series) || chart.series.length === 0) {
    return null;
  }

  const spanish = language === "es" ? getAppliedTranslationEs(questionId)?.chart : null;
  const yLabel = spanish?.y_label || chart.y_label || "";
  const xLabel = spanish?.x_label || chart.x_label || "Session";
  const phaseLabels = spanish?.phase_labels || chart.phase_labels || [];

  const series = chart.series;
  const yMax = chart.y_max || Math.max(...series);
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const dataWidth = plotWidth - INSET * 2;
  const xFor = (index) =>
    PAD.left +
    INSET +
    (series.length === 1 ? dataWidth / 2 : (index / (series.length - 1)) * dataWidth);
  const yFor = (value) => PAD.top + plotHeight - (value / yMax) * plotHeight;

  const phaseBreak = Number.isInteger(chart.phase_change_after) ? chart.phase_change_after : null;
  const segments =
    phaseBreak === null
      ? [series.map((value, index) => ({ value, index }))]
      : [
          series.slice(0, phaseBreak).map((value, index) => ({ value, index })),
          series.slice(phaseBreak).map((value, index) => ({ value, index: index + phaseBreak })),
        ];
  const phaseX = phaseBreak === null ? null : (xFor(phaseBreak - 1) + xFor(phaseBreak)) / 2;

  const spanishUi = language === "es";
  const description = describeChart({
    yLabel,
    xLabel,
    series,
    phaseBreak,
    phaseLabels,
    spanish: spanishUi,
  });

  return (
    <figure
      className={cn(
        // Capped width: the SVG scales with its container, and at full width on
        // desktop it grows tall enough to push the answer options off screen.
        "mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={description}
      >
        {niceTicks(yMax).map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={yFor(tick)}
              y2={yFor(tick)}
              className="stroke-slate-200 dark:stroke-slate-800"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={yFor(tick) + 4}
              textAnchor="end"
              className="fill-slate-500 dark:fill-slate-400"
              fontSize="11"
            >
              {tick}
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={PAD.left}
          y1={PAD.top}
          y2={PAD.top + plotHeight}
          className="stroke-slate-400 dark:stroke-slate-600"
          strokeWidth="1.25"
        />
        <line
          x1={PAD.left}
          x2={WIDTH - PAD.right}
          y1={PAD.top + plotHeight}
          y2={PAD.top + plotHeight}
          className="stroke-slate-400 dark:stroke-slate-600"
          strokeWidth="1.25"
        />

        {series.map((_, index) => (
          <text
            key={`x-${index}`}
            x={xFor(index)}
            y={PAD.top + plotHeight + 15}
            textAnchor="middle"
            className="fill-slate-500 dark:fill-slate-400"
            fontSize="10"
          >
            {index + 1}
          </text>
        ))}

        {phaseX !== null ? (
          <g>
            <line
              x1={phaseX}
              x2={phaseX}
              y1={PAD.top - 6}
              y2={PAD.top + plotHeight}
              className="stroke-slate-500 dark:stroke-slate-400"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            {phaseLabels[0] ? (
              <text
                x={(PAD.left + phaseX) / 2}
                y={PAD.top - 10}
                textAnchor="middle"
                className="fill-slate-600 dark:fill-slate-300"
                fontSize="11"
                fontWeight="600"
              >
                {phaseLabels[0]}
              </text>
            ) : null}
            {phaseLabels[1] ? (
              <text
                x={(phaseX + WIDTH - PAD.right) / 2}
                y={PAD.top - 10}
                textAnchor="middle"
                className="fill-slate-600 dark:fill-slate-300"
                fontSize="11"
                fontWeight="600"
              >
                {phaseLabels[1]}
              </text>
            ) : null}
          </g>
        ) : null}

        {segments.map((points, segmentIndex) => (
          <g key={`segment-${segmentIndex}`}>
            <polyline
              points={points.map((point) => `${xFor(point.index)},${yFor(point.value)}`).join(" ")}
              fill="none"
              className="stroke-sky-600 dark:stroke-sky-400"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {points.map((point) => (
              <circle
                key={point.index}
                cx={xFor(point.index)}
                cy={yFor(point.value)}
                r="3.5"
                className="fill-white stroke-sky-600 dark:fill-slate-950 dark:stroke-sky-400"
                strokeWidth="2"
              />
            ))}
          </g>
        ))}

        <text
          x={PAD.left + plotWidth / 2}
          y={HEIGHT - 6}
          textAnchor="middle"
          className="fill-slate-600 dark:fill-slate-300"
          fontSize="11"
        >
          {xLabel}
        </text>
        <text
          x={12}
          y={PAD.top + plotHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${PAD.top + plotHeight / 2})`}
          className="fill-slate-600 dark:fill-slate-300"
          fontSize="11"
        >
          {yLabel}
        </text>
      </svg>
    </figure>
  );
}
