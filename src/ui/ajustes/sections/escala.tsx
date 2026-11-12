import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useState } from "react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import { isValidScale } from "@/src/domain/grades";
import type { GradeScale } from "@/src/domain/schemas";
import type { SettingsSection } from "@/src/ui/views/ajustes";

type Draft = { min: string; max: string; pass: string };

const fieldClass = "field";

function toDraft(scale: GradeScale): Draft {
  return {
    min: String(scale.min),
    max: String(scale.max),
    pass: String(scale.pass),
  };
}

function parseNumber(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function Section() {
  const stored = useLiveQuery(() => getSetting(db, "gradeScale"));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (stored === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }

  const values = draft ?? toDraft(stored);

  function update(key: keyof Draft, value: string) {
    setDraft({ ...values, [key]: value });
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const scale: GradeScale = {
      min: parseNumber(values.min),
      max: parseNumber(values.max),
      pass: parseNumber(values.pass),
    };
    if (!isValidScale(scale)) {
      setError("La nota aprobatoria debe estar entre el mínimo y el máximo");
      setSaved(false);
      return;
    }
    await setSetting(db, "gradeScale", scale);
    setError(null);
    setDraft(null);
    setSaved(true);
  }

  const fields: { key: keyof Draft; label: string }[] = [
    { key: "min", label: "Mínimo" },
    { key: "max", label: "Máximo" },
    { key: "pass", label: "Nota aprobatoria" },
  ];

  return (
    <form
      aria-label="Escala de notas"
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
    >
      <div className="grid grid-cols-3 gap-3">
        {fields.map(({ key, label }) => (
          <label key={key} className="field-label">
            <span className="text-sm text-muted">{label}</span>
            <input
              type="number"
              step="any"
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
      {saved && (
        <p role="status" className="text-success">
          Escala guardada
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-primary">
          Guardar escala
        </button>
      </div>
    </form>
  );
}

const section: SettingsSection = {
  id: "escala",
  order: 10,
  title: "Escala de notas",
  Section,
};

export default section;
