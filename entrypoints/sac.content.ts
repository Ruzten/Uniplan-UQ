import { parseSacReport } from "@/src/domain/sac-report";
import { syncRunSchema } from "@/src/domain/schemas";
import { sendMessage } from "@/src/sync/messages";
import { captureSac } from "@/src/sync/sac-extract";

const HOST_ID = "uniplan-sac-host";

const STYLES = `
  :host { all: initial; }
  .panel {
    position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
    display: flex; flex-direction: column; gap: 8px; max-width: 320px;
    padding: 12px; border: 1px solid #262B33; border-radius: 10px;
    background: #14171C; color: #E6E8EB;
    font: 14px/1.5 "Segoe UI Variable", "Segoe UI", system-ui, sans-serif;
  }
  .actions { display: flex; gap: 8px; }
  button {
    padding: 4px 12px; border: 1px solid #262B33; border-radius: 6px;
    background: #1B1F26; color: #E6E8EB; font: inherit; cursor: pointer;
  }
  button:focus-visible, a:focus-visible { outline: 2px solid #7C8CFF; outline-offset: 2px; }
  a { color: #7C8CFF; }
  [role="status"]:empty { display: none; }
`;

function describeRun(data: unknown): string {
  const parsed = syncRunSchema.safeParse(data);
  if (!parsed.success) {
    return "No se pudo importar: respuesta inesperada";
  }
  const run = parsed.data;
  if (run.error !== null) {
    return run.error;
  }
  const { created, updated, unmatched } = run.counts;
  return `Importado: ${created} nuevas, ${updated} actualizadas, ${unmatched} sin asociar`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function mountPanel(): void {
  if (document.getElementById(HOST_ID) !== null) {
    return;
  }
  const host = document.createElement("div");
  host.id = HOST_ID;
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = STYLES;

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Uniplan UQ");

  const actions = document.createElement("div");
  actions.className = "actions";

  const importButton = document.createElement("button");
  importButton.type = "button";
  importButton.textContent = "Importar a Uniplan";

  const sampleButton = document.createElement("button");
  sampleButton.type = "button";
  sampleButton.textContent = "Guardar muestra";

  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.style.margin = "0";

  importButton.addEventListener("click", async () => {
    importButton.disabled = true;
    status.textContent = "Importando…";
    try {
      const payload = captureSac(document, new Date());
      const result = await sendMessage({ type: "sac/import", payload });
      status.textContent = result.ok
        ? describeRun(result.data)
        : `No se pudo importar: ${result.error.message}`;
    } catch (error) {
      status.textContent = `No se pudo importar: ${errorText(error)}`;
    } finally {
      importButton.disabled = false;
    }
  });

  sampleButton.addEventListener("click", () => {
    const capture = captureSac(document, new Date());
    const blob = new Blob([JSON.stringify(capture, null, 2)], {
      type: "application/json",
    });
    shadow.querySelector("a[download]")?.remove();
    const link = document.createElement("a");
    link.download = "uniplan-sac-muestra.json";
    link.href = URL.createObjectURL(blob);
    link.textContent = "Descargar muestra";
    panel.append(link);
    const subjects = parseSacReport(capture.texts).length;
    status.textContent = `Muestra lista: ${capture.tables.length} tablas, ${subjects} materias del reporte, ${capture.texts.length} textos`;
  });

  actions.append(importButton, sampleButton);
  panel.append(actions, status);
  shadow.append(style, panel);
  document.documentElement.append(host);
}

export default defineContentScript({
  matches: ["https://sac.uniquindio.edu.co/sgacampus/*"],
  allFrames: true,
  main() {
    if (window.top !== window) {
      return;
    }
    mountPanel();
  },
});
