import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/src/db/db";
import { formatScheduleEntry, groupScheduleByDay } from "@/src/domain/schedule";
import type { Subject } from "@/src/domain/schemas";

type Props = {
  subjects: readonly Subject[];
};

export function WeeklySchedule({ subjects }: Props) {
  const blocks = useLiveQuery(() => db.scheduleBlocks.toArray());
  const names = new Map(subjects.map((subject) => [subject.id, subject.name]));

  return (
    <section
      aria-labelledby="agenda-horario"
      className="card flex flex-col gap-4"
    >
      <h2 id="agenda-horario" className="card-title">
        Horario semanal
      </h2>
      {blocks === undefined ? (
        <p role="status" className="text-muted">
          Cargando…
        </p>
      ) : blocks.length === 0 ? (
        <p className="empty">
          Sin horario importado. Ábrelo en el SAC y pulsa Importar a Uniplan.
        </p>
      ) : (
        <ul aria-label="Días con clases" className="flex flex-col gap-3">
          {groupScheduleByDay(blocks, names).map((day) => (
            <li
              key={day.day}
              className="flex flex-col gap-2 rounded-control border border-border bg-bg p-3"
            >
              <h3 id={`horario-dia-${day.day}`} className="eyebrow text-accent">
                {day.title}
              </h3>
              <ul
                aria-labelledby={`horario-dia-${day.day}`}
                className="flex flex-col gap-2"
              >
                {day.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-l-2 border-accent/40 pl-2 text-sm"
                  >
                    {formatScheduleEntry(entry)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
