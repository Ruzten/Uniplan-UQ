import { formatScore } from "@/src/domain/grades";
import type { GradeComposition } from "@/src/domain/grades-compose";
import type { GradeScale } from "@/src/domain/schemas";
import { GradeRow } from "@/src/ui/notas/GradeRow";

type Props = {
  headingId: string;
  composition: GradeComposition;
  scale: GradeScale;
};

export function ActivitiesBlock({ headingId, composition, scale }: Props) {
  const { activities, followUpAverage, followUpCount, structured } =
    composition;
  if (activities.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="eyebrow">
        Actividades de Classroom y Aulas Virtuales ({activities.length})
      </h3>
      <p className="rounded-control border border-info/30 bg-info/5 px-3 py-2 text-sm">
        {followUpAverage === null
          ? "Aún no hay actividades de seguimiento calificadas."
          : `Promedio de seguimiento: ${formatScore(followUpAverage)} (${followUpCount} ${followUpCount === 1 ? "actividad" : "actividades"}). `}
        <span className="text-muted">
          {structured
            ? "Mientras el SAC no tenga la nota, este promedio estima el Seguimiento y cada parcial estima el parcial del mismo número."
            : "Aún no hay componentes del SAC: el acumulado usa cada parcial y este promedio como una sola nota de seguimiento."}
        </span>
      </p>
      <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
        {activities.map((grade) => (
          <GradeRow key={grade.id} grade={grade} defaultMax={scale.max} />
        ))}
      </ul>
    </section>
  );
}
