import { type FormEvent, useState } from "react";
import { db } from "@/src/db/db";
import { buildSubject, MAX_SEMESTER } from "@/src/domain/pensum-text";
import type { Subject } from "@/src/domain/schemas";
import { addSubject } from "@/src/sync/merge";

type Props = {
  subjects: readonly Subject[];
  onAdded: (id: string) => void;
  onClose: () => void;
};

const SEMESTERS = Array.from({ length: MAX_SEMESTER }, (_, index) => index + 1);

export function AddSubjectPanel({ subjects, onAdded, onClose }: Props) {
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("1");
  const [credits, setCredits] = useState("");
  const [kind, setKind] = useState<Subject["kind"]>("obligatoria");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = buildSubject(
      {
        name,
        semester: Number(semester),
        credits: credits.trim() === "" ? null : Number(credits),
        kind,
      },
      subjects,
    );
    if (typeof result === "string") {
      setError(result);
      return;
    }
    if (!(await addSubject(db, result))) {
      setError("Ya existe una materia con ese nombre");
      return;
    }
    onAdded(result.id);
  }

  return (
    <aside
      aria-label="Agregar materia"
      className="flex w-72 shrink-0 flex-col gap-4 self-start rounded-card border border-accent/40 bg-surface p-6"
    >
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Nueva materia</p>
        <h2 className="section-title">Agregar materia</h2>
      </div>
      <form
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
        className="flex flex-col gap-3"
      >
        <label className="field-label">
          <span>Nombre</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
          />
        </label>
        <label className="field-label">
          <span>Semestre</span>
          <select
            value={semester}
            onChange={(event) => setSemester(event.target.value)}
            className="field"
          >
            {SEMESTERS.map((value) => (
              <option key={value} value={value}>
                Semestre {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span>Créditos</span>
          <input
            type="number"
            min={0}
            step="any"
            value={credits}
            onChange={(event) => setCredits(event.target.value)}
            className="field"
          />
        </label>
        <label className="field-label">
          <span>Tipo</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as Subject["kind"])}
            className="field"
          >
            <option value="obligatoria">Obligatoria</option>
            <option value="profundizacion">Profundización</option>
          </select>
        </label>
        <p className="hint">
          Al guardarla se abre para que marques sus prerrequisitos.
        </p>
        {error !== null && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">
            Agregar
          </button>
          <button type="button" onClick={onClose} className="btn">
            Cerrar
          </button>
        </div>
      </form>
    </aside>
  );
}
