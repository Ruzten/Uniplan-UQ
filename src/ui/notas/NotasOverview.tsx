import { clsx } from "clsx";
import { formatScore } from "@/src/domain/grades";
import type { SemesterSummary } from "@/src/domain/grades-summary";
import type { GradeScale } from "@/src/domain/schemas";

type Props = {
  summary: SemesterSummary;
  scale: GradeScale;
};

export function NotasOverview({ summary, scale }: Props) {
  const passing = summary.average !== null && summary.average >= scale.pass;
  const tiles = [
    { term: "Materias", value: String(summary.subjects), tone: "text-text" },
    {
      term: "Con notas",
      value: String(summary.graded),
      tone: "text-text",
    },
    {
      term: "En riesgo",
      value: String(summary.atRisk),
      tone: summary.atRisk > 0 ? "text-warning" : "text-text",
    },
    {
      term: "Evaluado",
      value:
        summary.evaluatedPct === null
          ? "—"
          : `${Math.round(summary.evaluatedPct)}%`,
      tone: "text-accent",
    },
  ];

  return (
    <section
      aria-label="Resumen del semestre"
      className="grid grid-cols-5 gap-3"
    >
      <div
        className={clsx(
          "col-span-2 flex flex-col justify-center gap-1 rounded-card border p-6",
          summary.average === null
            ? "border-border bg-surface"
            : passing
              ? "border-success/30 bg-success/5"
              : "border-warning/30 bg-warning/5",
        )}
      >
        <p className="eyebrow">Acumulado del semestre</p>
        <p className="flex items-baseline gap-2">
          <span
            className={clsx(
              "font-mono text-xl font-extrabold tracking-tight",
              summary.average === null
                ? "text-muted"
                : passing
                  ? "text-success"
                  : "text-warning",
            )}
          >
            {summary.average === null ? "—" : formatScore(summary.average)}
          </span>
          <span className="text-sm text-muted">
            {summary.average === null
              ? "Aún no hay notas"
              : summary.creditWeighted
                ? "ponderado por créditos · lo pendiente cuenta 0"
                : "promedio simple · lo pendiente cuenta 0"}
          </span>
        </p>
      </div>
      <dl className="col-span-3 grid grid-cols-4 gap-3">
        {tiles.map(({ term, value, tone }) => (
          <div
            key={term}
            className="flex flex-col justify-between gap-4 rounded-card border border-border bg-surface p-4"
          >
            <dt className="eyebrow">{term}</dt>
            <dd className={clsx("font-mono text-xl font-extrabold", tone)}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
