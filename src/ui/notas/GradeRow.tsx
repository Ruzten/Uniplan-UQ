import { clsx } from "clsx";
import { useState } from "react";
import { db } from "@/src/db/db";
import { formatScore } from "@/src/domain/grades";
import { gradeKind } from "@/src/domain/grades-summary";
import type { Grade } from "@/src/domain/schemas";
import { editRecord, removeRecord } from "@/src/sync/merge";
import { SOURCE_LABELS } from "@/src/ui/agenda/ItemRow";
import { GradeForm, type GradeFormValues } from "@/src/ui/notas/GradeForm";

type Props = {
  grade: Grade;
  defaultMax: number;
  estimate?: number | null;
};

const buttonClass = "btn btn-sm btn-ghost";

export function GradeRow({ grade, defaultMax, estimate = null }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function save(values: GradeFormValues) {
    await editRecord(db, "grades", grade.id, values);
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="bg-bg p-3">
        <GradeForm
          label={`Editar nota: ${grade.label}`}
          defaultMax={defaultMax}
          initial={grade}
          submitLabel="Guardar"
          onSubmit={save}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-2 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <span className="min-w-0 font-medium break-words">{grade.label}</span>
        {grade.score === null && estimate !== null ? (
          <span className="badge shrink-0 border-info/40 text-info">
            Estimado {formatScore(estimate)} / {grade.maxScore}
          </span>
        ) : grade.score === null ? (
          <span className="badge shrink-0 border-warning/40 text-warning">
            Sin calificar · cuenta 0
          </span>
        ) : (
          <span className="shrink-0 font-mono font-semibold whitespace-nowrap">
            {grade.score} / {grade.maxScore}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span
          className={clsx(
            "badge",
            gradeKind(grade.label) === "parcial" &&
              "border-accent/40 text-accent",
          )}
        >
          {gradeKind(grade.label) === "parcial" ? "Parcial" : "Seguimiento"}
        </span>
        <span className="whitespace-nowrap">
          {grade.weightPct === null ? "Sin peso" : `Peso ${grade.weightPct}%`}
        </span>
        <span className="badge">{SOURCE_LABELS[grade.source]}</span>
        {grade.overrides.length > 0 && (
          <span className="badge border-warning/40 text-warning">editado</span>
        )}
        <div className="ml-auto flex items-center">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className={buttonClass}
          >
            Editar
          </button>
          {confirming ? (
            <button
              type="button"
              onClick={() => void removeRecord(db, "grades", grade.id)}
              className={clsx(buttonClass, "btn-danger")}
            >
              Confirmar eliminación
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className={buttonClass}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
