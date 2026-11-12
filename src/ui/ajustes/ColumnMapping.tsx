import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useState } from "react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import { DEFAULT_SETTINGS, type HeaderSynonyms } from "@/src/domain/schemas";

type Draft = Record<keyof HeaderSynonyms, string>;

const FIELDS: { key: keyof HeaderSynonyms; label: string }[] = [
  { key: "subjectName", label: "Materia" },
  { key: "subjectCode", label: "Código" },
  { key: "credits", label: "Créditos" },
  { key: "finalGrade", label: "Nota definitiva" },
  { key: "partialGradePattern", label: "Patrón de notas parciales" },
  { key: "group", label: "Grupo" },
  { key: "day", label: "Día" },
  { key: "start", label: "Hora de inicio" },
  { key: "end", label: "Hora de fin" },
  { key: "room", label: "Aula" },
  { key: "period", label: "Periodo" },
];

const fieldClass = "field";
const buttonClass = "btn";

function toDraft(synonyms: HeaderSynonyms): Draft {
  const draft = {} as Draft;
  for (const { key } of FIELDS) {
    const value = synonyms[key];
    draft[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return draft;
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

function isValidPattern(source: string): boolean {
  try {
    new RegExp(source);
    return true;
  } catch {
    return false;
  }
}

function fromDraft(draft: Draft): HeaderSynonyms {
  return {
    subjectName: splitList(draft.subjectName),
    subjectCode: splitList(draft.subjectCode),
    credits: splitList(draft.credits),
    finalGrade: splitList(draft.finalGrade),
    partialGradePattern: draft.partialGradePattern.trim(),
    group: splitList(draft.group),
    day: splitList(draft.day),
    start: splitList(draft.start),
    end: splitList(draft.end),
    room: splitList(draft.room),
    period: splitList(draft.period),
  };
}

export default function ColumnMapping() {
  const stored = useLiveQuery(() => getSetting(db, "headerSynonyms"));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (stored === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }
  const values = draft ?? toDraft(stored);

  function update(key: keyof HeaderSynonyms, value: string) {
    setDraft({ ...values, [key]: value });
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = fromDraft(values);
    if (next.subjectName.length === 0) {
      setError("Debe haber al menos un sinónimo para la materia");
      setNotice(null);
      return;
    }
    if (!isValidPattern(next.partialGradePattern)) {
      setError("El patrón de notas parciales no es una expresión válida");
      setNotice(null);
      return;
    }
    await setSetting(db, "headerSynonyms", next);
    setError(null);
    setDraft(null);
    setNotice("Mapeo guardado");
  }

  async function handleReset() {
    await setSetting(db, "headerSynonyms", DEFAULT_SETTINGS.headerSynonyms);
    setError(null);
    setDraft(null);
    setNotice("Valores por defecto restablecidos");
  }

  return (
    <form
      aria-label="Mapeo de columnas"
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
    >
      <p className="text-sm text-muted">
        Separa los sinónimos con comas. Se comparan sin tildes ni mayúsculas.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(({ key, label }) => (
          <label key={key} className="field-label">
            <span className="text-sm text-muted">{label}</span>
            <input
              type="text"
              value={values[key]}
              onChange={(event) => update(key, event.target.value)}
              className={fieldClass}
            />
          </label>
        ))}
      </div>
      {error !== null && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {notice !== null && (
        <p role="status" className="text-success">
          {notice}
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary">
          Guardar mapeo
        </button>
        <button
          type="button"
          onClick={() => void handleReset()}
          className={buttonClass}
        >
          Restablecer valores por defecto
        </button>
      </div>
    </form>
  );
}
