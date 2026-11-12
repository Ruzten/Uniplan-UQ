import { clsx } from "clsx";
import {
  type AgendaSummary,
  greetingFor,
  summaryMessage,
} from "@/src/domain/agenda-summary";

type Props = {
  summary: AgendaSummary;
  now: Date;
};

export function AgendaHero({ summary, now }: Props) {
  const stats = [
    { term: "Hoy", value: summary.today, tone: "text-accent" },
    { term: "Esta semana", value: summary.week, tone: "text-text" },
    {
      term: "Vencidas",
      value: summary.overdue,
      tone: summary.overdue > 0 ? "text-danger" : "text-text",
    },
    { term: "Hechas", value: summary.done, tone: "text-success" },
  ];

  return (
    <section
      aria-label="Resumen"
      className="grid grid-cols-5 items-stretch gap-3"
    >
      <div className="col-span-2 flex flex-col justify-center gap-1 rounded-card border border-accent/30 bg-accent/5 p-6">
        <p className="text-lg font-extrabold tracking-tight">
          {greetingFor(now)}
        </p>
        <p className="text-muted">{summaryMessage(summary)}</p>
      </div>
      <dl className="col-span-3 grid grid-cols-4 gap-3">
        {stats.map(({ term, value, tone }) => (
          <div
            key={term}
            className="flex flex-col justify-between gap-4 rounded-card border border-border bg-surface p-4"
          >
            <dt className="eyebrow">{term}</dt>
            <dd
              className={clsx(
                "font-mono text-xl font-extrabold tracking-tight",
                tone,
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
