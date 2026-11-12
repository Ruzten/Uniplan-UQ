import { format } from "date-fns";
import { type ChangeEvent, useState } from "react";
import { db } from "@/src/db/db";
import { setSetting } from "@/src/db/repo";
import { exportBackup } from "@/src/domain/backup";
import { PENSUM_TEMPLATE, parsePensumText } from "@/src/domain/pensum-text";
import { replacePensum, resetProgress } from "@/src/sync/merge";
import { downloadText } from "@/src/ui/shared/download";

type Mode = "texto" | "reiniciar" | "vacio";

const MODES: { value: Mode; label: string; hint: string }[] = [
  {
    value: "texto",
    label: "Cargar mi pensum",
    hint: "Pega la lista de materias o sube el archivo que te compartió un compañero.",
  },
  {
    value: "reiniciar",
    label: "Conservar las materias y reiniciar el avance",
    hint: "Para compañeros de la misma carrera: todo queda pendiente.",
  },
  {
    value: "vacio",
    label: "Empezar con el pensum vacío",
    hint: "Luego agregas cada materia desde la vista Pensum.",
  },
];

async function downloadSafetyBackup(): Promise<void> {
  const now = new Date();
  const backup = await exportBackup(db, now);
  downloadText(
    `uniplan-respaldo-${format(now, "yyyy-MM-dd")}.json`,
    JSON.stringify(backup, null, 2),
    "application/json",
  );
  await setSetting(db, "lastBackupAt", now.toISOString());
}

type Props = { currentCount: number };

export function PensumReplace({ currentCount }: Props) {
  const [mode, setMode] = useState<Mode>("texto");
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const parsed = parsePensumText(text);
  const semesters = new Set(parsed.subjects.map((s) => s.semester)).size;
  const textReady =
    text.trim() !== "" &&
    parsed.errors.length === 0 &&
    parsed.subjects.length > 0;
  const ready = mode !== "texto" || textReady;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file !== undefined) {
      setText(await file.text());
      setConfirming(false);
      setMessage(null);
    }
  }

  async function apply() {
    await downloadSafetyBackup();
    if (mode === "reiniciar") {
      await resetProgress(db);
      setMessage("Avance reiniciado: todas las materias quedaron pendientes");
    } else {
      const subjects = mode === "texto" ? parsed.subjects : [];
      await replacePensum(db, subjects);
      setMessage(`Pensum actualizado: ${subjects.length} materias`);
      setText("");
    }
    setConfirming(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-muted">
          ¿Cómo quieres cambiarlo?
        </legend>
        {MODES.map(({ value, label, hint }) => (
          <label
            key={value}
            className="flex items-start gap-3 rounded-control border border-border bg-bg p-3 has-checked:border-accent"
          >
            <input
              type="radio"
              name="pensum-mode"
              value={value}
              checked={mode === value}
              onChange={() => {
                setMode(value);
                setConfirming(false);
                setMessage(null);
              }}
              className="check mt-0.5"
            />
            <span className="flex flex-col">
              <span className="font-medium">{label}</span>
              <span className="text-sm text-muted">{hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      {mode === "texto" && (
        <div className="flex flex-col gap-3">
          <p className="hint">
            Una materia por línea:{" "}
            <code className="font-mono text-text">
              semestre | nombre | créditos | prerrequisitos | tipo
            </code>
            . Los prerrequisitos van separados por «;» y deben coincidir con el
            nombre de otra línea. Créditos, prerrequisitos y tipo son
            opcionales. También sirve copiar columnas desde una hoja de cálculo.
          </p>
          <label className="field-label">
            <span>Pensum en texto</span>
            <textarea
              rows={10}
              value={text}
              placeholder={PENSUM_TEMPLATE}
              onChange={(event) => {
                setText(event.target.value);
                setConfirming(false);
                setMessage(null);
              }}
              className="field font-mono text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <label className="field-label">
              <span>O sube un archivo (.txt, .csv, .tsv)</span>
              <input
                type="file"
                accept=".txt,.csv,.tsv,text/plain"
                onChange={(event) => void handleFile(event)}
                className="text-sm text-muted file:mr-3 file:rounded-control file:border file:border-border file:bg-surface-2 file:px-3 file:py-1 file:text-text"
              />
            </label>
            <button
              type="button"
              className="btn btn-sm btn-ghost self-end"
              onClick={() =>
                downloadText(
                  "uniplan-plantilla-pensum.txt",
                  PENSUM_TEMPLATE,
                  "text/plain",
                )
              }
            >
              Descargar plantilla
            </button>
          </div>
          {text.trim() !== "" &&
            (parsed.errors.length > 0 ? (
              <div
                role="alert"
                className="flex flex-col gap-1 rounded-control border border-danger/40 bg-danger/5 p-3 text-sm text-danger"
              >
                <p className="font-semibold">Revisa estas líneas:</p>
                <ul className="flex flex-col gap-1">
                  {parsed.errors.map((error) => (
                    <li key={`${error.line}-${error.message}`}>
                      {error.line > 0 ? `Línea ${error.line}: ` : ""}
                      {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p role="status" className="text-sm text-success">
                Listo para cargar: {parsed.subjects.length} materias en{" "}
                {semesters} semestres.
              </p>
            ))}
        </div>
      )}
      {confirming ? (
        <div className="flex flex-col gap-3 rounded-control border border-warning/50 bg-warning/5 p-4">
          <p className="text-warning">
            {mode === "reiniciar"
              ? `Las ${currentCount} materias quedarán pendientes y sin nota definitiva.`
              : `Se borrarán las ${currentCount} materias actuales con su avance.`}{" "}
            Tus pendientes y notas parciales se conservan. Antes de cambiar se
            descarga un respaldo.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void apply()}
              className="btn btn-solid-danger"
            >
              Confirmar cambio
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="btn"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            disabled={!ready}
            onClick={() => setConfirming(true)}
            className="btn btn-primary"
          >
            {mode === "reiniciar" ? "Reiniciar avance" : "Reemplazar pensum"}
          </button>
        </div>
      )}
      {message !== null && (
        <p role="status" className="text-success">
          {message}
        </p>
      )}
    </div>
  );
}
