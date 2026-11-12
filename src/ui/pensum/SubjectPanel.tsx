import { type FormEvent, useState } from "react";
import { db } from "@/src/db/db";
import { detectCycles } from "@/src/domain/pensum";
import type { Subject } from "@/src/domain/schemas";
import {
  patchSubject,
  removeSubject,
  type SubjectPatch,
} from "@/src/sync/merge";

type Props = {
  subject: Subject;
  subjects: readonly Subject[];
  onClose: () => void;
};

const STATUS_OPTIONS: { value: Subject["status"]; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "cursando", label: "Cursando" },
  { value: "aprobada", label: "Aprobada" },
];

const fieldClass = "field";

function optionalNumber(value: string): number | null | "invalid" {
  if (value.trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? "invalid" : parsed;
}

function samePrereqs(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

export function SubjectPanel({ subject, subjects, onClose }: Props) {
  const [status, setStatus] = useState(subject.status);
  const [credits, setCredits] = useState(
    subject.credits === null ? "" : String(subject.credits),
  );
  const [finalGrade, setFinalGrade] = useState(
    subject.finalGrade === null ? "" : String(subject.finalGrade),
  );
  const [prereqIds, setPrereqIds] = useState<string[]>(subject.prereqIds);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleDelete() {
    await removeSubject(db, subject.id);
    onClose();
  }

  function togglePrereq(id: string, checked: boolean) {
    setPrereqIds((current) =>
      checked ? [...current, id] : current.filter((entry) => entry !== id),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const creditsValue = optionalNumber(credits);
    if (creditsValue === "invalid" || (creditsValue ?? 1) <= 0) {
      setError("Los créditos deben ser un número mayor que 0");
      return;
    }
    const gradeValue = optionalNumber(finalGrade);
    if (gradeValue === "invalid") {
      setError("La nota definitiva debe ser un número");
      return;
    }
    const patch: SubjectPatch = {};
    if (status !== subject.status) patch.status = status;
    if (creditsValue !== subject.credits) patch.credits = creditsValue;
    if (gradeValue !== subject.finalGrade) patch.finalGrade = gradeValue;
    if (!samePrereqs(prereqIds, subject.prereqIds)) patch.prereqIds = prereqIds;

    const candidate = subjects.map((entry) =>
      entry.id === subject.id ? { ...entry, prereqIds } : entry,
    );
    if (detectCycles(candidate).length > 0) {
      setError("Ese prerrequisito crearía un ciclo");
      return;
    }
    try {
      if (Object.keys(patch).length > 0) {
        await patchSubject(db, subject.id, patch, "student");
      }
      setError(null);
      onClose();
    } catch {
      setError("No se pudo guardar la materia. Revisa los datos.");
    }
  }

  const others = subjects.filter((entry) => entry.id !== subject.id);

  return (
    <aside
      aria-label="Editar materia"
      className="flex w-72 shrink-0 flex-col gap-4 self-start rounded-card border border-accent/40 bg-surface p-6"
    >
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Semestre {subject.semester}</p>
        <h2 className="section-title">{subject.name}</h2>
      </div>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="field-label">
          <span className="text-sm text-muted">Estado</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as Subject["status"])
            }
            className={fieldClass}
          >
            {STATUS_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span className="text-sm text-muted">Créditos</span>
          <input
            type="number"
            min={0}
            step="any"
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="field-label">
          <span className="text-sm text-muted">Nota definitiva</span>
          <input
            type="number"
            step="any"
            value={finalGrade}
            onChange={(event) => setFinalGrade(event.target.value)}
            className={fieldClass}
          />
        </label>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium text-muted">
            Prerrequisitos
          </legend>
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-control border border-border bg-bg p-2">
            {others.map((entry) => (
              <label
                key={entry.id}
                className="flex items-center gap-2 rounded-control px-2 py-1 text-sm hover:bg-surface-2"
              >
                <input
                  type="checkbox"
                  checked={prereqIds.includes(entry.id)}
                  onChange={(event) =>
                    togglePrereq(entry.id, event.target.checked)
                  }
                  className="check"
                />
                {entry.name}
              </label>
            ))}
          </div>
        </fieldset>
        {error !== null && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">
            Guardar
          </button>
          <button type="button" onClick={onClose} className="btn">
            Cerrar
          </button>
        </div>
      </form>
      <div className="border-t border-border pt-4">
        {confirmingDelete ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-danger">
              Se quita del pensum y de los prerrequisitos de otras materias.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="btn btn-sm btn-solid-danger"
              >
                Confirmar eliminación
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="btn btn-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="btn btn-sm btn-danger"
          >
            Eliminar materia
          </button>
        )}
      </div>
    </aside>
  );
}
