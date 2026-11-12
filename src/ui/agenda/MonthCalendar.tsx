import { clsx } from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { dayKey, itemsByDay, monthMatrix } from "@/src/domain/calendar";
import type { Item } from "@/src/domain/schemas";

export type VisibleMonth = { year: number; monthIndex: number };

type Props = {
  items: readonly Item[];
  month: VisibleMonth;
  onMonthChange: (month: VisibleMonth) => void;
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function shift(month: VisibleMonth, delta: number): VisibleMonth {
  const date = new Date(month.year, month.monthIndex + delta, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

const navClass = "btn btn-sm";

export function MonthCalendar({ items, month, onMonthChange }: Props) {
  const weeks = monthMatrix(month.year, month.monthIndex);
  const byDay = itemsByDay(items);
  const todayKey = dayKey(new Date());
  const title = format(new Date(month.year, month.monthIndex, 1), "LLLL yyyy", {
    locale: es,
  });

  return (
    <section
      aria-labelledby="calendar-title"
      className="card flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(shift(month, -1))}
          className={navClass}
        >
          <ChevronLeft aria-hidden="true" size={16} />
          Mes anterior
        </button>
        <h2 id="calendar-title" className="section-title capitalize">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => onMonthChange(shift(month, 1))}
          className={navClass}
        >
          Mes siguiente
          <ChevronRight aria-hidden="true" size={16} />
        </button>
      </div>
      <table className="w-full table-fixed border-separate border-spacing-1">
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday} scope="col" className="eyebrow pb-2">
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={dayKey(week[0] ?? new Date(month.year, month.monthIndex))}>
              {week.map((day) => {
                const key = dayKey(day);
                const inMonth = day.getMonth() === month.monthIndex;
                const dayItems = inMonth ? (byDay.get(key) ?? []) : [];
                return (
                  <td
                    key={key}
                    data-date={inMonth ? key : undefined}
                    className={clsx(
                      "h-24 rounded-control border p-2 align-top",
                      inMonth
                        ? "border-border bg-bg"
                        : "border-transparent opacity-40",
                      key === todayKey && inMonth && "border-accent",
                    )}
                  >
                    <span
                      className={clsx(
                        "inline-flex size-6 items-center justify-center rounded-full text-sm",
                        key === todayKey && inMonth
                          ? "bg-accent font-bold text-bg"
                          : "text-muted",
                      )}
                    >
                      {day.getDate()}
                    </span>
                    <ul className="mt-1 flex flex-col gap-1">
                      {dayItems.map((item) => (
                        <li
                          key={item.id}
                          className={clsx(
                            "truncate rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent",
                            item.done && "text-muted line-through",
                          )}
                        >
                          {item.title}
                        </li>
                      ))}
                    </ul>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
