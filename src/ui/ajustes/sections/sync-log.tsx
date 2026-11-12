import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/src/db/db";
import type { SyncRun } from "@/src/domain/schemas";
import type { SettingsSection } from "@/src/ui/views/ajustes";

const SOURCE_LABELS: Record<SyncRun["source"], string> = {
  sac: "SAC",
  classroom: "Classroom",
  moodle: "Aulas Virtuales",
};

const STATUS_LABELS: Record<SyncRun["status"], string> = {
  ok: "Correcta",
  partial: "Parcial",
  error: "Error",
};

const STATUS_CLASSES: Record<SyncRun["status"], string> = {
  ok: "text-success",
  partial: "text-warning",
  error: "text-danger",
};

function formatStart(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : format(date, "yyyy-MM-dd HH:mm");
}

function Section() {
  const runs = useLiveQuery(() =>
    db.syncRuns.orderBy("startedAt").reverse().toArray(),
  );

  if (runs === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }
  if (runs.length === 0) {
    return <p className="empty">Aún no hay sincronizaciones.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-control border border-border">
      <table aria-label="Registro de sincronización" className="data-table">
        <thead>
          <tr>
            <th>Origen</th>
            <th>Inicio</th>
            <th>Estado</th>
            <th>Nuevas</th>
            <th>Actualizadas</th>
            <th>Omitidas</th>
            <th>Sin asociar</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id}>
              <td>{SOURCE_LABELS[run.source]}</td>
              <td className="font-mono">{formatStart(run.startedAt)}</td>
              <td className={STATUS_CLASSES[run.status]}>
                {STATUS_LABELS[run.status]}
              </td>
              <td>{run.counts.created}</td>
              <td>{run.counts.updated}</td>
              <td>{run.counts.skipped}</td>
              <td>{run.counts.unmatched}</td>
              <td>{run.error ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const section: SettingsSection = {
  id: "sync-log",
  order: 60,
  title: "Registro de sincronización",
  Section,
};

export default section;
