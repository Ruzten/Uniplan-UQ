import { clsx } from "clsx";
import type { Availability } from "@/src/domain/pensum";
import type { Subject } from "@/src/domain/schemas";

export type Highlight = "prereq" | "dependent" | null;

const STATE_LABELS: Record<Availability, string> = {
  aprobada: "Aprobada",
  cursando: "Cursando",
  disponible: "Disponible",
  bloqueada: "Bloqueada",
};

const STATE_DOTS: Record<Availability, string> = {
  aprobada: "bg-success",
  cursando: "bg-info",
  disponible: "bg-accent",
  bloqueada: "bg-blocked",
};

const STATE_TEXT: Record<Availability, string> = {
  aprobada: "text-success",
  cursando: "text-info",
  disponible: "text-accent",
  bloqueada: "text-muted",
};

const HIGHLIGHT_LABELS: Record<"prereq" | "dependent", string> = {
  prereq: "Prerrequisito",
  dependent: "Depende de esta",
};

type Props = {
  subject: Subject;
  state: Availability;
  highlight: Highlight;
  selected: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
};

export function SubjectCard({
  subject,
  state,
  highlight,
  selected,
  onHover,
  onOpen,
}: Props) {
  return (
    <button
      type="button"
      data-subject-id={subject.id}
      data-state={state}
      data-highlight={highlight ?? undefined}
      aria-pressed={selected}
      onFocus={() => onHover(subject.id)}
      onBlur={() => onHover(null)}
      onPointerEnter={() => onHover(subject.id)}
      onPointerLeave={() => onHover(null)}
      onClick={() => onOpen(subject.id)}
      className={clsx(
        "relative flex w-full min-w-0 flex-col gap-1 rounded-control border bg-surface px-3 pt-3 pb-2 text-left text-sm transition-transform duration-150 ease-out hover:-translate-y-0.5 hover:border-muted/40",
        state === "bloqueada" ? "border-border/60" : "border-border",
        highlight === "prereq" && "border-warning bg-warning/5",
        highlight === "dependent" && "border-info bg-info/5",
        selected && "outline-2 outline-accent outline-offset-2",
      )}
    >
      <span
        className={clsx(
          "font-medium leading-snug break-words hyphens-auto",
          state === "aprobada" && "text-muted",
          state === "bloqueada" && "text-muted",
        )}
      >
        {subject.name}
      </span>
      <span
        className={clsx(
          "flex items-center gap-1 text-xs font-medium",
          STATE_TEXT[state],
        )}
      >
        <span
          aria-hidden="true"
          className={clsx("size-2 shrink-0 rounded-full", STATE_DOTS[state])}
        />
        {STATE_LABELS[state]}
      </span>
      {highlight !== null && (
        <span
          className={clsx(
            "absolute -top-2 right-2 rounded-full border bg-bg px-2 text-xs leading-4 font-semibold",
            highlight === "prereq"
              ? "border-warning/50 text-warning"
              : "border-info/50 text-info",
          )}
        >
          {HIGHLIGHT_LABELS[highlight]}
        </span>
      )}
    </button>
  );
}
