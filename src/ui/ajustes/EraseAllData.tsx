import { useState } from "react";
import { db } from "@/src/db/db";
import { eraseAllData } from "@/src/sync/reset";

type Props = {
  backupFirst: () => Promise<void>;
};

export function EraseAllData({ backupFirst }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function erase() {
    setBusy(true);
    await backupFirst();
    await eraseAllData(db);
    window.location.reload();
  }

  return (
    <section
      aria-labelledby="borrar-datos"
      className="mt-4 flex flex-col gap-3 rounded-control border border-danger/40 bg-danger/5 p-4"
    >
      <h3 id="borrar-datos" className="card-title text-danger">
        Borrar todos mis datos
      </h3>
      <p className="text-sm text-muted">
        Deja Uniplan como recién instalado: borra pendientes, notas, pensum,
        horario, ajustes y la conexión con Classroom de este navegador. Antes se
        descarga un respaldo que puedes volver a importar.
      </p>
      {confirming ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void erase()}
            className="btn btn-solid-danger"
          >
            Sí, borrar todo
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(false)}
            className="btn"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="btn btn-danger"
          >
            Borrar todos mis datos
          </button>
        </div>
      )}
    </section>
  );
}
