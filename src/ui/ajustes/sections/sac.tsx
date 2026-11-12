import ColumnMapping from "@/src/ui/ajustes/ColumnMapping";
import UnmatchedSubjects from "@/src/ui/ajustes/UnmatchedSubjects";
import type { SettingsSection } from "@/src/ui/views/ajustes";

function Section() {
  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="sac-sin-asociar"
        className="flex flex-col gap-3"
      >
        <h3 id="sac-sin-asociar" className="card-title">
          Sin asociar
        </h3>
        <UnmatchedSubjects />
      </section>
      <section aria-labelledby="sac-mapeo" className="flex flex-col gap-3">
        <h3 id="sac-mapeo" className="card-title">
          Mapeo de columnas
        </h3>
        <ColumnMapping />
      </section>
    </div>
  );
}

const section: SettingsSection = {
  id: "sac",
  order: 20,
  title: "SAC: columnas y materias sin asociar",
  Section,
};

export default section;
