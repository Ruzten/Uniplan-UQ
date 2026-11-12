import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Hourglass } from "lucide-react";
import { daysUntilLabel } from "@/src/domain/agenda-summary";
import type { Item, Subject } from "@/src/domain/schemas";
import { ITEM_TYPE_LABELS } from "@/src/ui/agenda/ItemForm";

type Props = {
  next: Item | null;
  subjects: readonly Subject[];
  now: Date;
};

export function NextUpCard({ next, subjects, now }: Props) {
  const subject =
    next === null
      ? undefined
      : subjects.find((entry) => entry.id === next.subjectId);

  return (
    <section aria-labelledby="agenda-next" className="card flex flex-col gap-4">
      <h2 id="agenda-next" className="eyebrow flex items-center gap-2">
        <Hourglass aria-hidden="true" size={14} className="text-accent" />
        Lo próximo
      </h2>
      {next === null || next.dueAt === null ? (
        <p className="text-muted">
          Nada pendiente con fecha. Buen momento para adelantar trabajo.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xl font-extrabold tracking-tight text-accent">
            {daysUntilLabel(next.dueAt, now)}
          </p>
          <div className="flex flex-col gap-1">
            <p className="text-md font-bold tracking-tight">{next.title}</p>
            <p className="text-sm text-muted">
              {subject?.name ?? "Sin materia"}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
            <span className="badge border-accent/40 text-accent">
              {ITEM_TYPE_LABELS[next.type]}
            </span>
            <span className="text-sm text-muted">
              {format(new Date(next.dueAt), "EEEE d 'de' MMM, HH:mm", {
                locale: es,
              })}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
