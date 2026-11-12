import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import { recommend } from "@/src/domain/recommend";

const fieldClass = "field";

const COURSE_CAP_ERROR =
  "El tope de materias debe ser un número entero mayor que 0";
const CREDIT_CAP_ERROR =
  "El tope de créditos debe ser un número mayor que 0 o quedar vacío";

export default function RutaView() {
  const data = useLiveQuery(async () => ({
    subjects: await db.subjects.toArray(),
    courseCap: await getSetting(db, "courseCap"),
    creditCap: await getSetting(db, "creditCap"),
    assumeCurrentPass: await getSetting(db, "assumeCurrentPass"),
  }));
  const [courseDraft, setCourseDraft] = useState<string | null>(null);
  const [creditDraft, setCreditDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (data === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }

  const { subjects, courseCap, creditCap, assumeCurrentPass } = data;
  const recommended = recommend(subjects, {
    courseCap,
    creditCap,
    assumeCurrentPass,
  });

  function changeCourseCap(value: string) {
    setCourseDraft(value);
    const parsed = Number(value);
    if (value.trim() === "" || !Number.isInteger(parsed) || parsed < 1) {
      setError(COURSE_CAP_ERROR);
      return;
    }
    setError(null);
    void setSetting(db, "courseCap", parsed);
  }

  function changeCreditCap(value: string) {
    setCreditDraft(value);
    if (value.trim() === "") {
      setError(null);
      void setSetting(db, "creditCap", null);
      return;
    }
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError(CREDIT_CAP_ERROR);
      return;
    }
    setError(null);
    void setSetting(db, "creditCap", parsed);
  }

  return (
    <div className="grid grid-cols-3 items-start gap-6">
      <section
        aria-label="Topes"
        className="card sticky top-8 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <p className="card-title">Parámetros</p>
          <p className="hint">Ajusta cuánto quieres cargar el semestre.</p>
        </div>
        <label className="field-label">
          <span className="text-sm text-muted">Tope de materias</span>
          <input
            type="number"
            min={1}
            step={1}
            value={courseDraft ?? String(courseCap)}
            onChange={(event) => changeCourseCap(event.target.value)}
            onBlur={() => setCourseDraft(null)}
            className={fieldClass}
          />
        </label>
        <label className="field-label">
          <span className="text-sm text-muted">Tope de créditos</span>
          <input
            type="number"
            min={1}
            step="any"
            placeholder="Sin tope"
            value={creditDraft ?? (creditCap === null ? "" : String(creditCap))}
            onChange={(event) => changeCreditCap(event.target.value)}
            onBlur={() => setCreditDraft(null)}
            className={fieldClass}
          />
        </label>
        <label className="flex items-start gap-2 rounded-control border border-border bg-bg p-3 text-sm">
          <input
            type="checkbox"
            checked={assumeCurrentPass}
            onChange={(event) =>
              void setSetting(db, "assumeCurrentPass", event.target.checked)
            }
            className="check mt-0.5"
          />
          Asumir que apruebo lo que estoy cursando
        </label>
        {error !== null && (
          <p role="alert" className="w-full text-danger">
            {error}
          </p>
        )}
      </section>
      <section
        aria-labelledby="ruta-title"
        className="col-span-2 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 id="ruta-title" className="section-title">
            Recomendadas para el próximo semestre
          </h2>
          <p className="text-sm text-muted">
            La recomendación no tiene en cuenta horarios.
          </p>
        </div>
        {recommended.length === 0 ? (
          <p className="empty">No hay materias disponibles para recomendar.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {recommended.map((entry, index) => (
              <li
                key={entry.subjectId}
                data-subject-id={entry.subjectId}
                className="flex items-center gap-4 rounded-card border border-border bg-surface px-5 py-4 hover:border-muted/40"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-sm font-bold text-accent">
                  {index + 1}.
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{entry.name}</span>
                  <span className="text-sm text-muted">{entry.reason}</span>
                </div>
                <span className="badge">Semestre {entry.semester}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
