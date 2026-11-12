import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useState } from "react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import type { SettingsSection } from "@/src/ui/views/ajustes";

const fieldClass = "field";

function parseLeadHours(value: string): number[] | null {
  const parts = value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (parts.length === 0) {
    return null;
  }
  const hours = parts.map(Number);
  if (hours.some((hour) => !Number.isFinite(hour) || hour <= 0)) {
    return null;
  }
  return [...new Set(hours)].sort((a, b) => b - a);
}

function Section() {
  const stored = useLiveQuery(() => getSetting(db, "reminderLeadHours"));
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (stored === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }
  const value = draft ?? stored.join(", ");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hours = parseLeadHours(value);
    if (hours === null) {
      setError("Escribe horas positivas separadas por coma");
      setSaved(false);
      return;
    }
    await setSetting(db, "reminderLeadHours", hours);
    setError(null);
    setDraft(null);
    setSaved(true);
  }

  return (
    <form
      aria-label="Recordatorios"
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
    >
      <label className="field-label">
        <span className="text-sm text-muted">Horas de anticipación</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
          }}
          className={fieldClass}
        />
      </label>
      {error !== null && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-success">
          Recordatorios guardados
        </p>
      )}
      <div>
        <button type="submit" className="btn btn-primary">
          Guardar
        </button>
      </div>
    </form>
  );
}

const section: SettingsSection = {
  id: "recordatorios",
  order: 40,
  title: "Recordatorios",
  Section,
};

export default section;
