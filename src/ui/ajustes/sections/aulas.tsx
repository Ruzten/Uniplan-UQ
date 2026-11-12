import { clsx } from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLiveQuery } from "dexie-react-hooks";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import { MOODLE_ORIGIN } from "@/src/domain/moodle";
import type { SyncRun } from "@/src/domain/schemas";
import { syncMoodle } from "@/src/sync/moodle-client";
import { ExternalAnchor } from "@/src/ui/shared/ExternalAnchor";
import type { SettingsSection } from "@/src/ui/views/ajustes";

function describeRun(run: SyncRun): string {
  if (run.status === "error") {
    return run.error?.startsWith("auth_required")
      ? "No hay una sesión abierta de Aulas Virtuales en este navegador. Ábrela, inicia sesión y vuelve a sincronizar."
      : `No se pudo sincronizar: ${run.error ?? "error desconocido"}`;
  }
  const { created, updated, unmatched } = run.counts;
  return `${created} nuevas, ${updated} actualizadas, ${unmatched} cursos sin asociar`;
}

function Section() {
  const data = useLiveQuery(async () => {
    const runs = await db.syncRuns
      .where("source")
      .equals("moodle")
      .sortBy("startedAt");
    return {
      lastRun: runs.at(-1) ?? null,
      autoSync: await getSetting(db, "moodleAutoSync"),
    };
  });
  const [busy, setBusy] = useState(false);

  if (data === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }
  const { lastRun, autoSync } = data;

  async function sync() {
    setBusy(true);
    try {
      await syncMoodle(db);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">
        Uniplan lee tus cursos, las actividades con fecha de entrega y tu
        reporte de calificaciones usando la sesión que ya tienes abierta en{" "}
        <ExternalAnchor href={`${MOODLE_ORIGIN}/`}>
          Aulas Virtuales
        </ExternalAnchor>{" "}
        en este navegador. No pide ni guarda tu contraseña y nunca entrega ni
        cambia nada en Moodle.
      </p>
      <div
        role="status"
        className={clsx(
          "flex items-start gap-3 rounded-control border p-3 text-sm",
          lastRun === null
            ? "border-border bg-bg text-muted"
            : lastRun.status === "error"
              ? "border-danger/40 bg-danger/5 text-danger"
              : "border-success/40 bg-success/5 text-success",
        )}
      >
        <RefreshCw aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
        <p>
          {busy
            ? "Sincronizando Aulas Virtuales…"
            : lastRun === null
              ? "Aún no has sincronizado Aulas Virtuales."
              : `Última sincronización ${format(new Date(lastRun.startedAt), "d 'de' MMM, HH:mm", { locale: es })}. ${describeRun(lastRun)}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void sync()}
          className="btn btn-primary"
        >
          Sincronizar ahora
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoSync}
            onChange={(event) =>
              void setSetting(db, "moodleAutoSync", event.target.checked)
            }
            className="check"
          />
          Sincronizar al abrir Uniplan (máximo una vez por hora)
        </label>
      </div>
      <p className="hint">
        Los cursos que no coincidan con una materia del pensum aparecen en «SAC:
        columnas y materias sin asociar» para que los asocies una vez.
      </p>
    </div>
  );
}

const section: SettingsSection = {
  id: "aulas",
  order: 35,
  title: "Aulas Virtuales (Moodle)",
  Section,
};

export default section;
