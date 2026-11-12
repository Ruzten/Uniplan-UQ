import { clsx } from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { DueTone } from "@/src/domain/agenda-summary";

type Props = {
  dueAt: string | null;
  tone: DueTone;
};

const TONE_CLASSES: Record<DueTone, string> = {
  overdue: "border-danger/50 bg-danger/10 text-danger",
  today: "border-accent bg-accent/10 text-accent",
  soon: "border-warning/50 bg-warning/5 text-warning",
  later: "border-border bg-bg text-text",
  none: "border-dashed border-border bg-bg text-muted",
};

export function DueBlock({ dueAt, tone }: Props) {
  const date = dueAt === null ? null : new Date(dueAt);
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "flex w-14 shrink-0 flex-col items-center rounded-control border py-1",
        TONE_CLASSES[tone],
      )}
    >
      <span className="text-xs font-semibold uppercase">
        {date === null ? "Sin" : format(date, "EEE", { locale: es })}
      </span>
      <span className="font-mono text-lg leading-none font-extrabold">
        {date === null ? "—" : format(date, "d")}
      </span>
      <span className="text-xs uppercase">
        {date === null ? "fecha" : format(date, "MMM", { locale: es })}
      </span>
    </div>
  );
}
