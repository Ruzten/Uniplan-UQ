import { clsx } from "clsx";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays,
  ChevronRight,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import type { ViewId } from "@/src/domain/schemas";
import { useMoodleAutoSync } from "@/src/ui/shared/useMoodleAutoSync";
import { resolveViewId, VIEWS, viewComponent } from "@/src/ui/views";

export function App() {
  useMoodleAutoSync();
  const active = useLiveQuery(async () =>
    resolveViewId(await getSetting(db, "activeView")),
  );

  function select(id: ViewId) {
    void setSetting(db, "activeView", id);
  }

  const careerName = useLiveQuery(() => getSetting(db, "careerName"));
  const ActiveView = active === undefined ? null : viewComponent(active);
  const entry = VIEWS.find(({ id }) => id === active);
  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  return (
    <div className="flex min-h-screen min-w-5xl">
      <div className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
        <div className="flex items-center gap-3 border-b border-border px-6 py-6">
          <span
            aria-hidden="true"
            className="flex size-10 items-center justify-center rounded-control bg-accent text-bg"
          >
            <GraduationCap size={22} strokeWidth={2.25} />
          </span>
          <div className="flex min-w-0 flex-col">
            <h1 className="text-md font-extrabold tracking-tight">
              Uniplan UQ
            </h1>
            <p className="truncate text-xs text-muted">{careerName ?? ""}</p>
          </div>
        </div>
        <nav
          aria-label="Secciones"
          className="flex flex-1 flex-col gap-1 px-4 py-6"
        >
          <p aria-hidden="true" className="eyebrow mb-2 px-3">
            Menú
          </p>
          {VIEWS.map(({ id, label, icon: Icon }) => {
            const isActive = id === active;
            return (
              <button
                key={id}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => select(id)}
                className={clsx(
                  "group relative flex items-center gap-3 rounded-control px-3 py-2 text-left font-medium",
                  isActive
                    ? "bg-accent/10 font-semibold text-text"
                    : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <span
                  aria-hidden="true"
                  className={clsx(
                    "absolute top-2 bottom-2 left-0 w-1 origin-center rounded-full bg-accent transition-transform duration-150 ease-out",
                    isActive ? "scale-y-100" : "scale-y-0",
                  )}
                />
                <span
                  aria-hidden="true"
                  className={clsx(
                    "flex size-8 items-center justify-center rounded-control",
                    isActive
                      ? "bg-accent text-bg"
                      : "bg-surface-2 text-muted group-hover:text-text",
                  )}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                </span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
        <div className="m-4 flex items-start gap-3 rounded-control border border-border bg-bg p-3">
          <ShieldCheck
            aria-hidden="true"
            size={16}
            className="mt-0.5 shrink-0 text-accent"
          />
          <p className="text-xs text-muted">
            Tus datos viven solo en este equipo.
          </p>
        </div>
      </div>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-300 px-12 py-8">
          {entry !== undefined && (
            <header className="mb-8 flex flex-col gap-6 border-b border-border pb-8">
              <div className="flex items-center justify-between gap-4 text-sm">
                <p className="flex items-center gap-2 text-muted">
                  <span>Uniplan</span>
                  <ChevronRight aria-hidden="true" size={14} />
                  <span className="font-medium text-text">{entry.label}</span>
                </p>
                <p className="badge gap-2 px-3 py-1 text-sm">
                  <CalendarDays
                    aria-hidden="true"
                    size={14}
                    className="text-accent"
                  />
                  <span className="inline-block first-letter:uppercase">
                    {today}
                  </span>
                </p>
              </div>
              <div className="flex items-end justify-between gap-6">
                <p className="text-xl font-extrabold tracking-tight">
                  {entry.label}
                </p>
                <p className="max-w-md text-right text-muted">
                  {entry.description}
                </p>
              </div>
            </header>
          )}
          {ActiveView === null ? (
            <p role="status" className="text-muted">
              Cargando…
            </p>
          ) : (
            <div key={active} className="view-enter">
              <ActiveView />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
