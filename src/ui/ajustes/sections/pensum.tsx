import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useState } from "react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import { pensumToText } from "@/src/domain/pensum-text";
import { slugify } from "@/src/domain/text";
import { PensumReplace } from "@/src/ui/ajustes/PensumReplace";
import { downloadText } from "@/src/ui/shared/download";
import type { SettingsSection } from "@/src/ui/views/ajustes";

function Section() {
  const data = useLiveQuery(async () => ({
    careerName: await getSetting(db, "careerName"),
    subjects: await db.subjects.toArray(),
  }));
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (data === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }

  const { careerName, subjects } = data;

  async function saveCareer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = (draft ?? careerName).trim();
    if (value === "") {
      setError("Escribe el nombre de tu carrera");
      setSaved(false);
      return;
    }
    await setSetting(db, "careerName", value);
    setDraft(null);
    setError(null);
    setSaved(true);
  }

  function exportPensum() {
    const name = slugify(careerName) || "pensum";
    downloadText(
      `uniplan-pensum-${name}.txt`,
      pensumToText(subjects),
      "text/plain",
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        aria-label="Carrera"
        noValidate
        onSubmit={(event) => void saveCareer(event)}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="field-label min-w-64 flex-1">
          <span>Nombre de la carrera</span>
          <input
            type="text"
            value={draft ?? careerName}
            onChange={(event) => {
              setDraft(event.target.value);
              setSaved(false);
            }}
            className="field"
          />
        </label>
        <button type="submit" className="btn btn-primary">
          Guardar carrera
        </button>
        {error !== null && (
          <p role="alert" className="w-full text-danger">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="w-full text-success">
            Carrera guardada
          </p>
        )}
      </form>
      <section
        aria-labelledby="pensum-compartir"
        className="flex flex-wrap items-center justify-between gap-4 rounded-control border border-border bg-bg p-4"
      >
        <div className="flex flex-col gap-1">
          <h3 id="pensum-compartir" className="card-title">
            Compartir mi pensum
          </h3>
          <p className="hint">
            Descarga tus {subjects.length} materias sin tu avance para que un
            compañero de tu carrera las cargue.
          </p>
        </div>
        <button
          type="button"
          disabled={subjects.length === 0}
          onClick={exportPensum}
          className="btn"
        >
          Exportar pensum
        </button>
      </section>
      <section aria-labelledby="pensum-cambiar" className="flex flex-col gap-3">
        <h3 id="pensum-cambiar" className="card-title">
          Cambiar el pensum
        </h3>
        <PensumReplace currentCount={subjects.length} />
      </section>
    </div>
  );
}

const section: SettingsSection = {
  id: "pensum",
  order: 5,
  title: "Pensum y carrera",
  Section,
};

export default section;
