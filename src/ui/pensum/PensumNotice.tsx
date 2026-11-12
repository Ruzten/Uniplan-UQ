import { Info } from "lucide-react";
import { db } from "@/src/db/db";
import { setSetting } from "@/src/db/repo";

export function PensumNotice() {
  return (
    <section
      aria-labelledby="pensum-notice"
      className="flex items-start gap-4 rounded-card border border-info/40 bg-info/5 p-6"
    >
      <Info
        aria-hidden="true"
        size={20}
        className="mt-0.5 shrink-0 text-info"
      />
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="pensum-notice" className="card-title">
            ¿Este es tu pensum?
          </h2>
          <p className="text-muted">
            Uniplan viene con el pensum de Ingeniería de Sistemas de la
            Universidad del Quindío, con todas las materias pendientes. Si es tu
            carrera, marca lo que ya aprobaste haciendo clic en cada materia; si
            estudias otra, carga la tuya en Ajustes.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void setSetting(db, "activeView", "ajustes")}
            className="btn btn-primary"
          >
            Cambiar pensum
          </button>
          <button
            type="button"
            onClick={() => void setSetting(db, "pensumReviewed", true)}
            className="btn"
          >
            Sí, es el mío
          </button>
        </div>
      </div>
    </section>
  );
}
