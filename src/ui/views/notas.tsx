import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/src/db/db";
import { getSetting, listVisibleItems } from "@/src/db/repo";
import { actaLinks } from "@/src/domain/classroom";
import { subjectAverage } from "@/src/domain/grades";
import { composeGrades } from "@/src/domain/grades-compose";
import {
  accumulatedScore,
  semesterSummary,
  upcomingEvaluations,
} from "@/src/domain/grades-summary";
import type { Grade } from "@/src/domain/schemas";
import { NotasOverview } from "@/src/ui/notas/NotasOverview";
import { SubjectGradesCard } from "@/src/ui/notas/SubjectGradesCard";

export default function NotasView() {
  const subjects = useLiveQuery(() =>
    db.subjects.orderBy("semester").toArray(),
  );
  const grades = useLiveQuery(() =>
    db.grades.filter((grade) => !grade.hidden).toArray(),
  );
  const scale = useLiveQuery(() => getSetting(db, "gradeScale"));
  const items = useLiveQuery(() => listVisibleItems(db));

  if (
    subjects === undefined ||
    grades === undefined ||
    scale === undefined ||
    items === undefined
  ) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }

  const bySubject = new Map<string, Grade[]>();
  const sorted = [...grades].sort((a, b) =>
    a.label === b.label ? 0 : a.label < b.label ? -1 : 1,
  );
  for (const grade of sorted) {
    const list = bySubject.get(grade.subjectId) ?? [];
    list.push(grade);
    bySubject.set(grade.subjectId, list);
  }
  const shown = subjects.filter(
    (subject) => subject.status === "cursando" || bySubject.has(subject.id),
  );

  if (shown.length === 0) {
    return (
      <p className="empty">
        Aún no hay materias en curso. Marca una como «cursando» en Pensum.
      </p>
    );
  }

  const now = new Date();
  const overview = semesterSummary(
    shown.map((subject) => ({
      credits: subject.credits,
      summary: subjectAverage(
        composeGrades(bySubject.get(subject.id) ?? [], scale).components,
        scale,
      ),
      accumulated: accumulatedScore(
        composeGrades(bySubject.get(subject.id) ?? [], scale).components,
        scale,
      ),
    })),
    scale,
  );

  return (
    <div className="flex flex-col gap-8">
      <NotasOverview summary={overview} scale={scale} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {shown.map((subject) => (
          <SubjectGradesCard
            key={subject.id}
            subject={subject}
            grades={bySubject.get(subject.id) ?? []}
            scale={scale}
            actaLinks={actaLinks(items, subject.id)}
            upcoming={upcomingEvaluations(items, subject.id, now)}
          />
        ))}
      </div>
    </div>
  );
}
