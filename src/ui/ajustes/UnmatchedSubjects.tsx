import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import type { Subject } from "@/src/domain/schemas";
import { normalizeText } from "@/src/domain/text";

const fieldClass = "field";

async function associate(rawName: string, subjectId: string): Promise<void> {
  const aliases = await getSetting(db, "subjectAliases");
  await setSetting(db, "subjectAliases", {
    ...aliases,
    [normalizeText(rawName)]: subjectId,
  });
  const unmatched = await getSetting(db, "unmatchedSubjects");
  await setSetting(
    db,
    "unmatchedSubjects",
    unmatched.filter((name) => name !== rawName),
  );
}

function UnmatchedRow({
  name,
  subjects,
}: {
  name: string;
  subjects: Subject[];
}) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  return (
    <li className="flex items-center gap-3 rounded-control border border-border bg-bg px-3 py-2">
      <span className="flex-1 font-medium">{name}</span>
      <label className="flex items-center gap-2">
        <span className="text-sm text-muted">Materia</span>
        <select
          aria-label={`Materia para ${name}`}
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          className={fieldClass}
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={subjectId === ""}
        onClick={() => void associate(name, subjectId)}
        aria-label={`Asociar ${name}`}
        className="btn"
      >
        Asociar
      </button>
    </li>
  );
}

export default function UnmatchedSubjects() {
  const data = useLiveQuery(async () => {
    const names = await getSetting(db, "unmatchedSubjects");
    const subjects = await db.subjects.toArray();
    subjects.sort(
      (a, b) => a.semester - b.semester || a.name.localeCompare(b.name, "es"),
    );
    return { names, subjects };
  });

  if (data === undefined) {
    return (
      <p role="status" className="text-muted">
        Cargando…
      </p>
    );
  }
  if (data.names.length === 0) {
    return <p className="empty">No hay nombres sin asociar.</p>;
  }
  return (
    <ul className="flex flex-col gap-2" aria-label="Nombres sin asociar">
      {data.names.map((name) => (
        <UnmatchedRow key={name} name={name} subjects={data.subjects} />
      ))}
    </ul>
  );
}
