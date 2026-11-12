import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { type ChangeEvent, useState } from "react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import {
  backupSchema,
  daysSinceBackup,
  exportBackup,
  importBackup,
} from "@/src/domain/backup";
import { EraseAllData } from "@/src/ui/ajustes/EraseAllData";
import type { SettingsSection } from "@/src/ui/views/ajustes";

const INVALID_FILE = "El archivo no es un respaldo válido de Uniplan";
const buttonClass = "btn";

function backupNotice(lastBackupAt: string | null, now: Date): string {
  const days = daysSinceBackup(lastBackupAt, now);
  if (days === null) {
    return "Último respaldo: nunca";
  }
  if (days > 7) {
    return `Último respaldo hace ${days} días — exporta uno ahora`;
  }
  return `Último respaldo hace ${days} días`;
}

async function downloadBackup(): Promise<void> {
  const now = new Date();
  const backup = await exportBackup(db, now);
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `uniplan-respaldo-${format(now, "yyyy-MM-dd")}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  await setSetting(db, "lastBackupAt", now.toISOString());
}

function Section() {
  const lastBackupAt = useLiveQuery(() => getSetting(db, "lastBackupAt"));
  const [pending, setPending] = useState<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);

  if (lastBackupAt === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }

  function reset() {
    setPending(undefined);
    setInputKey((key) => key + 1);
  }

  async function handleExport() {
    await downloadBackup();
    setMessage("Respaldo exportado");
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    setError(null);
    setMessage(null);
    const file = event.target.files?.[0];
    if (file === undefined) {
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      raw = null;
    }
    if (!backupSchema.safeParse(raw).success) {
      setError(INVALID_FILE);
      reset();
      return;
    }
    setPending(raw);
  }

  async function handleReplace() {
    await downloadBackup();
    const result = await importBackup(db, pending);
    reset();
    if (!result.ok) {
      setError(INVALID_FILE);
      return;
    }
    setMessage("Respaldo importado");
  }

  return (
    <div className="flex flex-col gap-3">
      <p
        role="status"
        className="rounded-control border border-warning/40 bg-warning/5 px-3 py-2 text-warning"
      >
        {backupNotice(lastBackupAt, new Date())}
      </p>
      <div>
        <button
          type="button"
          onClick={() => void handleExport()}
          className={buttonClass}
        >
          Exportar respaldo
        </button>
      </div>
      <label className="field-label">
        <span className="text-sm text-muted">Importar respaldo</span>
        <input
          key={inputKey}
          type="file"
          accept="application/json,.json"
          onChange={(event) => void handleFile(event)}
          className="text-sm text-muted file:mr-3 file:rounded-control file:border file:border-border file:bg-surface-2 file:px-3 file:py-1 file:text-text"
        />
      </label>
      {pending !== undefined && (
        <div className="flex flex-col gap-3 rounded-control border border-warning/50 bg-warning/5 p-4">
          <p>
            Esto reemplaza todos los datos actuales. Antes se descargará un
            respaldo automático.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleReplace()}
              className="btn btn-solid-danger"
            >
              Reemplazar todo
            </button>
            <button type="button" onClick={reset} className={buttonClass}>
              Cancelar
            </button>
          </div>
        </div>
      )}
      {error !== null && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {message !== null && <p className="text-success">{message}</p>}
      <EraseAllData backupFirst={downloadBackup} />
    </div>
  );
}

const section: SettingsSection = {
  id: "backup",
  order: 50,
  title: "Respaldo",
  Section,
};

export default section;
