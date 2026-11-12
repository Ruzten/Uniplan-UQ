import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import {
  availability,
  dependentsOf,
  highlightEdges,
  progressStats,
} from "@/src/domain/pensum";
import { AddSubjectPanel } from "@/src/ui/pensum/AddSubjectPanel";
import { PensumArrows } from "@/src/ui/pensum/PensumArrows";
import { PensumNotice } from "@/src/ui/pensum/PensumNotice";
import { type Highlight, SubjectCard } from "@/src/ui/pensum/SubjectCard";
import { SubjectPanel } from "@/src/ui/pensum/SubjectPanel";

const LEGEND = [
  { label: "Aprobada", dot: "bg-success" },
  { label: "Cursando", dot: "bg-info" },
  { label: "Disponible", dot: "bg-accent" },
  { label: "Bloqueada", dot: "bg-blocked" },
];

export default function PensumView() {
  const subjects = useLiveQuery(() =>
    db.subjects.orderBy("semester").toArray(),
  );
  const assumeCurrentPass = useLiveQuery(() =>
    getSetting(db, "assumeCurrentPass"),
  );
  const reviewed = useLiveQuery(() => getSetting(db, "pensumReviewed"));
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const edges = useMemo(
    () =>
      subjects === undefined || hoveredId === null
        ? []
        : highlightEdges(subjects, hoveredId),
    [subjects, hoveredId],
  );

  if (
    subjects === undefined ||
    assumeCurrentPass === undefined ||
    reviewed === undefined
  ) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }

  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  const stats = progressStats(subjects);
  const pct = Math.round(stats.pctSubjects);
  const cursando = subjects.filter(
    (subject) => subject.status === "cursando",
  ).length;
  const hovered = hoveredId === null ? undefined : byId.get(hoveredId);
  const prereqs = new Set(hovered?.prereqIds ?? []);
  const dependents =
    hovered === undefined
      ? new Set<string>()
      : dependentsOf(subjects, hovered.id);
  const open = openId === null ? undefined : byId.get(openId);
  const maxSemester = Math.max(0, ...subjects.map((s) => s.semester));
  const semesters = Array.from({ length: maxSemester }, (_, i) => i + 1);

  function openSubject(id: string) {
    setAdding(false);
    setOpenId(id);
  }

  function startAdding() {
    setOpenId(null);
    setAdding(true);
  }

  function highlightOf(id: string): Highlight {
    if (prereqs.has(id)) return "prereq";
    if (dependents.has(id)) return "dependent";
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {!reviewed && subjects.length > 0 && <PensumNotice />}
      <section
        aria-labelledby="pensum-progress"
        className="card flex flex-col gap-4"
      >
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h2 id="pensum-progress" className="eyebrow">
              Avance
            </h2>
            <p className="text-xl font-extrabold tracking-tight">
              {pct}%
              <span className="ml-2 text-md font-medium text-muted">
                del plan
              </span>
            </p>
          </div>
          <dl className="flex gap-8 text-right">
            {[
              {
                term: "Aprobadas",
                value: stats.approved,
                tone: "text-success",
              },
              { term: "Cursando", value: cursando, tone: "text-info" },
              { term: "Total", value: stats.total, tone: "text-text" },
            ].map(({ term, value, tone }) => (
              <div key={term} className="flex flex-col">
                <dt className="eyebrow">{term}</dt>
                <dd className={`text-lg font-extrabold ${tone}`}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div
          role="progressbar"
          aria-labelledby="pensum-progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full origin-left rounded-full bg-success transition-transform duration-150 ease-out"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {stats.approved} de {stats.total} materias aprobadas
          </p>
          <ul aria-label="Leyenda" className="flex gap-4 text-xs text-muted">
            {LEGEND.map(({ label, dot }) => (
              <li key={label} className="flex items-center gap-1">
                <span
                  aria-hidden="true"
                  className={`size-2 shrink-0 rounded-full ${dot}`}
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <div className="flex items-center justify-between gap-4">
        <p className="hint">
          Pasa el cursor por una materia para ver sus prerrequisitos; haz clic
          para editarla.
        </p>
        <button type="button" onClick={startAdding} className="btn">
          <Plus aria-hidden="true" size={16} />
          Agregar materia
        </button>
      </div>
      <div className="flex gap-4">
        {subjects.length === 0 ? (
          <div className="empty flex flex-1 flex-col items-center gap-3">
            <p>
              Aún no tienes materias. Agrega la primera o carga tu pensum
              completo desde Ajustes.
            </p>
            <button
              type="button"
              onClick={() => void setSetting(db, "activeView", "ajustes")}
              className="btn btn-sm"
            >
              Ir a Ajustes
            </button>
          </div>
        ) : (
          <div className="min-w-0 flex-1 overflow-x-auto pb-3">
            <div ref={mapRef} className="relative flex w-max gap-6">
              <PensumArrows containerRef={mapRef} edges={edges} />
              {semesters.map((semester) => {
                const inSemester = subjects.filter(
                  (subject) => subject.semester === semester,
                );
                const credits = inSemester.reduce(
                  (sum, subject) => sum + (subject.credits ?? 0),
                  0,
                );
                return (
                  <section
                    key={semester}
                    aria-labelledby={`pensum-semester-${semester}`}
                    className="flex w-40 shrink-0 flex-col gap-3"
                  >
                    <div className="flex items-baseline justify-between gap-2 border-b border-border pb-2">
                      <h2
                        id={`pensum-semester-${semester}`}
                        className="text-md font-extrabold tracking-tight"
                      >
                        Semestre {semester}
                      </h2>
                      {credits > 0 && (
                        <span className="text-xs text-muted">{credits} cr</span>
                      )}
                    </div>
                    {inSemester.length === 0 ? (
                      <p className="text-sm text-muted">Sin materias</p>
                    ) : (
                      inSemester.map((subject) => (
                        <SubjectCard
                          key={subject.id}
                          subject={subject}
                          state={availability(subject, byId, assumeCurrentPass)}
                          highlight={highlightOf(subject.id)}
                          selected={subject.id === openId}
                          onHover={setHoveredId}
                          onOpen={openSubject}
                        />
                      ))
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        )}
        {adding && (
          <AddSubjectPanel
            subjects={subjects}
            onAdded={openSubject}
            onClose={() => setAdding(false)}
          />
        )}
        {open !== undefined && (
          <SubjectPanel
            key={open.id}
            subject={open}
            subjects={subjects}
            onClose={() => setOpenId(null)}
          />
        )}
      </div>
    </div>
  );
}
