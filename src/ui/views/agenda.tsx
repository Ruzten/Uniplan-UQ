import { clsx } from "clsx";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/src/db/db";
import { addManualItem, listVisibleItems } from "@/src/db/repo";
import {
  type AgendaGroupKey,
  agendaItems,
  groupItems,
} from "@/src/domain/agenda";
import { agendaSummary } from "@/src/domain/agenda-summary";
import { filterItems, type ItemFilters } from "@/src/domain/calendar";
import type { ItemType } from "@/src/domain/schemas";
import { AgendaHero } from "@/src/ui/agenda/AgendaHero";
import {
  ITEM_TYPE_LABELS,
  ItemForm,
  type ItemFormValues,
} from "@/src/ui/agenda/ItemForm";
import { ItemRow } from "@/src/ui/agenda/ItemRow";
import {
  MonthCalendar,
  type VisibleMonth,
} from "@/src/ui/agenda/MonthCalendar";
import { NextUpCard } from "@/src/ui/agenda/NextUpCard";
import { WeeklySchedule } from "@/src/ui/agenda/WeeklySchedule";

const GROUP_ORDER: readonly { key: AgendaGroupKey; title: string }[] = [
  { key: "vencidas", title: "Vencidas" },
  { key: "hoy", title: "Hoy" },
  { key: "semana", title: "Esta semana" },
  { key: "despues", title: "Más adelante" },
  { key: "sinFecha", title: "Sin fecha" },
];

type Tab = "lista" | "calendario";

const selectClass = "field w-48";

function currentMonth(): VisibleMonth {
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

export default function AgendaView() {
  const items = useLiveQuery(async () =>
    agendaItems(await listVisibleItems(db)),
  );
  const subjects = useLiveQuery(() =>
    db.subjects.orderBy("semester").toArray(),
  );
  const [tab, setTab] = useState<Tab>("lista");
  const [filters, setFilters] = useState<ItemFilters>({
    subjectId: "all",
    type: "all",
  });
  const [month, setMonth] = useState<VisibleMonth>(currentMonth);

  async function add(values: ItemFormValues) {
    await addManualItem(db, values);
  }

  if (items === undefined || subjects === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }

  const now = new Date();
  const summary = agendaSummary(items, now);
  const filtered = filterItems(items, filters);
  const groups = groupItems(filtered, now);
  const visibleGroups = GROUP_ORDER.filter(({ key }) => groups[key].length > 0);

  return (
    <div className="flex flex-col gap-8">
      <AgendaHero summary={summary} now={now} />
      <div className="grid grid-cols-3 items-start gap-6">
        <div className="col-span-2 flex min-w-0 flex-col gap-6">
          <section aria-labelledby="agenda-add" className="card">
            <h2 id="agenda-add" className="card-title mb-4">
              Agregar pendiente
            </h2>
            <ItemForm
              label="Agregar pendiente"
              subjects={subjects}
              submitLabel="Agregar"
              onSubmit={add}
            />
          </section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <fieldset aria-label="Vista de la agenda" className="segmented">
              {(["lista", "calendario"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={tab === value}
                  onClick={() => setTab(value)}
                >
                  {value === "lista" ? "Lista" : "Calendario"}
                </button>
              ))}
            </fieldset>
            <fieldset aria-label="Filtros" className="flex gap-4">
              <label className="field-label">
                <span className="text-sm text-muted">Materia</span>
                <select
                  value={filters.subjectId}
                  onChange={(event) =>
                    setFilters({ ...filters, subjectId: event.target.value })
                  }
                  className={selectClass}
                >
                  <option value="all">Todas</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                <span className="text-sm text-muted">Tipo</span>
                <select
                  value={filters.type}
                  onChange={(event) =>
                    setFilters({
                      ...filters,
                      type: event.target.value as ItemType | "all",
                    })
                  }
                  className={selectClass}
                >
                  <option value="all">Todos</option>
                  {Object.entries(ITEM_TYPE_LABELS).map(([value, text]) => (
                    <option key={value} value={value}>
                      {text}
                    </option>
                  ))}
                </select>
              </label>
            </fieldset>
          </div>
          {tab === "calendario" ? (
            <MonthCalendar
              items={filtered}
              month={month}
              onMonthChange={setMonth}
            />
          ) : visibleGroups.length === 0 ? (
            <p className="empty">
              {filters.subjectId === "all" && filters.type === "all"
                ? "No hay pendientes. Agrega el primero arriba."
                : "Ningún pendiente coincide con los filtros."}
            </p>
          ) : (
            visibleGroups.map(({ key, title }) => (
              <section
                key={key}
                aria-labelledby={`agenda-${key}`}
                className="flex flex-col gap-3"
              >
                <h2
                  id={`agenda-${key}`}
                  className={clsx(
                    "flex items-center gap-2 text-md font-bold tracking-tight",
                    key === "vencidas" && "text-danger",
                  )}
                >
                  {title}
                  <span aria-hidden="true" className="badge">
                    {groups[key].length}
                  </span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {groups[key].map((item) => (
                    <ItemRow key={item.id} item={item} subjects={subjects} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <NextUpCard next={summary.next} subjects={subjects} now={now} />
          <WeeklySchedule subjects={subjects} />
        </div>
      </div>
    </div>
  );
}
