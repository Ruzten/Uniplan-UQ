import { clsx } from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { db } from "@/src/db/db";
import { addManualGrade } from "@/src/db/repo";
import type { Link } from "@/src/domain/classroom";
import { formatScore, subjectAverage } from "@/src/domain/grades";
import { composeGrades } from "@/src/domain/grades-compose";
import {
  accumulatedScore,
  neededState,
  standingOf,
} from "@/src/domain/grades-summary";
import type { Grade, GradeScale, Item, Subject } from "@/src/domain/schemas";
import { ActaBlock } from "@/src/ui/notas/ActaBlock";
import { ActivitiesBlock } from "@/src/ui/notas/ActivitiesBlock";
import { GradeForm, type GradeFormValues } from "@/src/ui/notas/GradeForm";
import { GradeRow } from "@/src/ui/notas/GradeRow";
import { GradeSimulator } from "@/src/ui/notas/GradeSimulator";
import { ScaleBar } from "@/src/ui/notas/ScaleBar";

type Props = {
  subject: Subject;
  grades: readonly Grade[];
  scale: GradeScale;
  actaLinks?: readonly Link[];
  upcoming?: readonly Item[];
};

const STANDING = {
  asegurada: { label: "Aprobada", tone: "border-success/40 text-success" },
  "vas-bien": { label: "Vas bien", tone: "border-info/40 text-info" },
  "en-riesgo": { label: "En riesgo", tone: "border-warning/40 text-warning" },
  "sin-notas": { label: "Sin notas", tone: "" },
} as const;

export function SubjectGradesCard({
  subject,
  grades,
  scale,
  actaLinks = [],
  upcoming = [],
}: Props) {
  const composition = composeGrades(grades, scale);
  const summary = subjectAverage(composition.components, scale);
  const accumulated = accumulatedScore(composition.components, scale);
  const standing = standingOf(summary, accumulated, scale);
  const needed =
    summary.neededForPass === null
      ? null
      : neededState(summary.neededForPass, scale);
  const headingId = `notas-${subject.id}`;

  async function add(values: GradeFormValues) {
    await addManualGrade(db, { subjectId: subject.id, ...values });
  }

  return (
    <article aria-labelledby={headingId} className="card flex flex-col gap-5">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="eyebrow">
              Semestre {subject.semester}
              {subject.credits !== null && ` · ${subject.credits} créditos`}
            </p>
            <h2 id={headingId} className="section-title">
              {subject.name}
            </h2>
          </div>
          {standing !== "sin-notas" && (
            <span className={clsx("badge", STANDING[standing].tone)}>
              {STANDING[standing].label}
            </span>
          )}
        </div>
        {accumulated !== null ? (
          <div className="flex flex-col gap-2">
            <p className="flex items-baseline gap-2">
              <span className="eyebrow">Acumulado:</span>{" "}
              <span
                className={clsx(
                  "font-mono text-xl font-extrabold tracking-tight",
                  accumulated >= scale.pass ? "text-success" : "text-text",
                )}
              >
                {formatScore(accumulated)}
              </span>
              <span className="text-sm text-muted">
                / {scale.max} · pasa con {scale.pass}
              </span>
            </p>
            <ScaleBar average={accumulated} scale={scale} />
            <p className="text-sm text-muted">
              {summary.average === null
                ? "Sin notas calificadas: lo pendiente cuenta como 0."
                : `Promedio: ${formatScore(summary.average)} en lo calificado. Lo pendiente cuenta como 0 en el acumulado.`}
            </p>
          </div>
        ) : (
          <p className="text-muted">Sin notas</p>
        )}
        {summary.gradedPct !== null && (
          <div className="flex flex-col gap-1">
            <div
              aria-hidden="true"
              className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
            >
              <div
                className="h-full origin-left rounded-full bg-accent"
                style={{ transform: `scaleX(${summary.gradedPct / 100})` }}
              />
            </div>
            <p className="text-sm text-muted">
              Evaluado {Number(summary.gradedPct.toFixed(2))}% · Falta{" "}
              {Number((100 - summary.gradedPct).toFixed(2))}% por calificar
            </p>
          </div>
        )}
        {needed !== null && summary.neededForPass !== null && (
          <p
            className={clsx(
              "rounded-control border px-3 py-2 text-sm",
              needed.kind === "asegurada" &&
                "border-success/40 bg-success/5 text-success",
              needed.kind === "alcanzable" && "border-border bg-bg text-text",
              needed.kind === "imposible" &&
                "border-danger/40 bg-danger/5 text-danger",
            )}
          >
            {needed.kind === "asegurada"
              ? `Ya pasas aunque saques ${scale.min} en lo restante`
              : needed.kind === "imposible"
                ? `Ya no alcanzas ${scale.pass}: necesitarías ${formatScore(summary.neededForPass)}`
                : `Necesitas ${formatScore(needed.needed)} en lo restante para pasar`}
          </p>
        )}
        {summary.average !== null &&
          summary.gradedPct !== null &&
          summary.gradedPct < 100 && (
            <GradeSimulator summary={summary} scale={scale} />
          )}
      </header>
      {upcoming.length > 0 && (
        <section
          aria-labelledby={`${headingId}-proximas`}
          className="flex flex-col gap-2"
        >
          <h3 id={`${headingId}-proximas`} className="eyebrow">
            Próximas evaluaciones
          </h3>
          <ul className="flex flex-col gap-1">
            {upcoming.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-control border border-border bg-bg px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{item.title}</span>
                <span className="shrink-0 text-muted">
                  {item.dueAt !== null &&
                    format(new Date(item.dueAt), "EEE d 'de' MMM", {
                      locale: es,
                    })}
                  {item.weightPct !== null && ` · ${item.weightPct}%`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {actaLinks.length > 0 && (
        <ActaBlock subject={subject} links={actaLinks} />
      )}
      {composition.structured && (
        <section
          aria-labelledby={`${headingId}-notas`}
          className="flex flex-col gap-2"
        >
          <h3 id={`${headingId}-notas`} className="eyebrow">
            Componentes del SAC ({composition.components.length})
          </h3>
          <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
            {composition.components.map((component) =>
              component.grade === null ? null : (
                <GradeRow
                  key={component.key}
                  grade={component.grade}
                  defaultMax={scale.max}
                  estimate={component.estimated ? component.score : null}
                />
              ),
            )}
          </ul>
        </section>
      )}
      <ActivitiesBlock
        headingId={`${headingId}-actividades`}
        composition={composition}
        scale={scale}
      />
      <div className="border-t border-border pt-4">
        <GradeForm
          label={`Agregar nota a ${subject.name}`}
          defaultMax={scale.max}
          submitLabel="Agregar nota"
          onSubmit={add}
        />
      </div>
    </article>
  );
}
