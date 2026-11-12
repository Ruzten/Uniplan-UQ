import { clsx } from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLiveQuery } from "dexie-react-hooks";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import { checkClientId } from "@/src/domain/classroom-setup";
import type { SyncRun } from "@/src/domain/schemas";
import {
  connectClassroom,
  getRedirectUri,
  needsReconnect,
  syncClassroom,
} from "@/src/sync/classroom-client";
import { ClassroomGuide } from "@/src/ui/ajustes/ClassroomGuide";
import type { SettingsSection } from "@/src/ui/views/ajustes";

const fieldClass = "field";
const buttonClass = "btn";

function describeRun(run: SyncRun): string {
  if (run.status === "error") {
    return `No se pudo sincronizar: ${run.error ?? "error desconocido"}`;
  }
  const { created, updated, unmatched } = run.counts;
  return `Sincronizado: ${created} nuevas, ${updated} actualizadas, ${unmatched} sin asociar`;
}

function safeRedirectUri(): string {
  try {
    return getRedirectUri();
  } catch {
    return "";
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function Section() {
  const stored = useLiveQuery(() => getSetting(db, "googleClientId"));
  const lastRun = useLiveQuery(async () => {
    const runs = await db.syncRuns
      .where("source")
      .equals("classroom")
      .sortBy("startedAt");
    return runs.at(-1) ?? null;
  });
  const [draft, setDraft] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  if (stored === undefined || lastRun === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }
  const clientId = draft ?? stored;

  async function saveClientId(value: string) {
    setDraft(value);
    await setSetting(db, "googleClientId", value.trim());
  }

  async function connect() {
    setBusy(true);
    try {
      await connectClassroom(db);
      setStatus("Conectado con Google");
    } catch (error) {
      setStatus(`No se pudo conectar: ${errorText(error)}`);
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    setBusy(true);
    setStatus("Sincronizando…");
    const run = await syncClassroom(db);
    setStatus(describeRun(run));
    setBusy(false);
  }

  const idCheck = checkClientId(clientId);
  const redirectUri = safeRedirectUri();

  return (
    <div className="flex flex-col gap-6">
      <div
        className={clsx(
          "flex items-center gap-3 rounded-control border p-3 text-sm",
          lastRun === null
            ? "border-border bg-bg text-muted"
            : lastRun.status === "error"
              ? "border-danger/40 bg-danger/5 text-danger"
              : "border-success/40 bg-success/5 text-success",
        )}
      >
        <RefreshCw aria-hidden="true" size={16} className="shrink-0" />
        <p>
          {lastRun === null
            ? "Aún no has sincronizado Classroom. La conexión es opcional y de solo lectura."
            : `Última sincronización ${format(new Date(lastRun.startedAt), "d 'de' MMM, HH:mm", { locale: es })}. ${describeRun(lastRun)}`}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <label className="field-label">
          <span>ID de cliente de Google</span>
          <input
            type="text"
            value={clientId}
            autoComplete="off"
            spellCheck={false}
            placeholder="123456789012-xxxx.apps.googleusercontent.com"
            aria-invalid={idCheck === "sospechoso"}
            aria-describedby="classroom-id-hint"
            onChange={(event) => void saveClientId(event.target.value)}
            className={`${fieldClass} font-mono text-sm`}
          />
        </label>
        <p
          id="classroom-id-hint"
          className={clsx(
            "text-sm",
            idCheck === "sospechoso" ? "text-warning" : "text-muted",
          )}
        >
          {idCheck === "sospechoso"
            ? "No parece un ID de cliente: debe terminar en .apps.googleusercontent.com. Nunca pegues el secreto del cliente."
            : "No es un secreto: lo puedes compartir con tus compañeros."}
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={idCheck === "vacio" || busy}
            onClick={() => void connect()}
            className={`${buttonClass} btn-primary`}
          >
            Conectar con Google
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void sync()}
            className={buttonClass}
          >
            Sincronizar ahora
          </button>
          {needsReconnect(lastRun ?? undefined) && (
            <button
              type="button"
              disabled={idCheck === "vacio" || busy}
              onClick={() => void connect()}
              className={buttonClass}
            >
              Reconectar
            </button>
          )}
        </div>
        <p role="status" className="text-muted">
          {status}
        </p>
      </div>
      <section
        aria-labelledby="classroom-guia"
        className="flex flex-col gap-3 border-t border-border pt-6"
      >
        <h3 id="classroom-guia" className="card-title">
          Cómo obtener el ID de cliente
        </h3>
        <ClassroomGuide clientId={clientId} redirectUri={redirectUri} />
        <p className="text-sm text-muted">
          Si Google dice que el administrador bloqueó la aplicación, la
          universidad no permite apps de terceros en tu cuenta: usa la entrada
          manual en Agenda y Notas. Más detalles en docs/CONEXION-CLASSROOM.md.
        </p>
      </section>
    </div>
  );
}

const section: SettingsSection = {
  id: "classroom",
  order: 30,
  title: "Google Classroom",
  Section,
};

export default section;
