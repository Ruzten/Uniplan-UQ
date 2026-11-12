import { type Subject, subjectSchema } from "@/src/domain/schemas";
import { slugify } from "@/src/domain/text";

const STATUS_CODES: Record<string, Subject["status"]> = {
  A: "aprobada",
  C: "cursando",
  P: "pendiente",
};

const KIND_CODES: Record<string, Subject["kind"]> = {
  O: "obligatoria",
  F: "profundizacion",
};

type ParsedLine = {
  semester: number;
  status: Subject["status"];
  kind: Subject["kind"];
  name: string;
  prereqNames: string[];
};

function parseLine(line: string): ParsedLine {
  const fields = line.split("|").map((field) => field.trim());
  const [semesterField, statusField, kindField, name, prereqField] = fields;
  if (
    fields.length !== 5 ||
    semesterField === undefined ||
    statusField === undefined ||
    kindField === undefined ||
    name === undefined ||
    prereqField === undefined
  ) {
    throw new Error(`Invalid pensum line (expected 5 fields): ${line}`);
  }
  const status = STATUS_CODES[statusField];
  const kind = KIND_CODES[kindField];
  if (status === undefined || kind === undefined) {
    throw new Error(`Invalid status or kind in pensum line: ${line}`);
  }
  return {
    semester: Number(semesterField),
    status,
    kind,
    name,
    prereqNames: prereqField
      .split(";")
      .map((prereq) => prereq.trim())
      .filter((prereq) => prereq.length > 0),
  };
}

export function parsePensumSeed(text: string): Subject[] {
  const lines = text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map(parseLine);
  const idByName = new Map<string, string>();
  for (const line of lines) {
    idByName.set(line.name, slugify(line.name));
  }
  return lines.map((line) =>
    subjectSchema.parse({
      id: slugify(line.name),
      name: line.name,
      semester: line.semester,
      credits: null,
      prereqIds: line.prereqNames.map((prereqName) => {
        const prereqId = idByName.get(prereqName);
        if (prereqId === undefined) {
          throw new Error(`Unknown prerequisite: ${prereqName}`);
        }
        return prereqId;
      }),
      kind: line.kind,
      status: line.status,
      finalGrade: null,
      overrides: [],
    }),
  );
}

export function detectCycles(subjects: readonly Subject[]): string[][] {
  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const cycles: string[][] = [];

  function visit(id: string): void {
    state.set(id, "visiting");
    stack.push(id);
    for (const prereqId of byId.get(id)?.prereqIds ?? []) {
      const prereqState = state.get(prereqId);
      if (prereqState === "visiting") {
        cycles.push(stack.slice(stack.indexOf(prereqId)));
      } else if (prereqState === undefined && byId.has(prereqId)) {
        visit(prereqId);
      }
    }
    stack.pop();
    state.set(id, "done");
  }

  for (const subject of subjects) {
    if (!state.has(subject.id)) {
      visit(subject.id);
    }
  }
  return cycles;
}

function directDependents(subjects: readonly Subject[], id: string): Subject[] {
  return subjects.filter((subject) => subject.prereqIds.includes(id));
}

export function dependentsOf(
  subjects: readonly Subject[],
  id: string,
): Set<string> {
  const found = new Set<string>();
  const pending = [id];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) {
      break;
    }
    for (const dependent of directDependents(subjects, current)) {
      if (!found.has(dependent.id) && dependent.id !== id) {
        found.add(dependent.id);
        pending.push(dependent.id);
      }
    }
  }
  return found;
}

export function chainDepth(subjects: readonly Subject[], id: string): number {
  const memo = new Map<string, number>();

  function depth(current: string, path: Set<string>): number {
    const cached = memo.get(current);
    if (cached !== undefined) {
      return cached;
    }
    let longest = 0;
    for (const dependent of directDependents(subjects, current)) {
      if (path.has(dependent.id)) {
        continue;
      }
      path.add(dependent.id);
      longest = Math.max(longest, 1 + depth(dependent.id, path));
      path.delete(dependent.id);
    }
    memo.set(current, longest);
    return longest;
  }

  return depth(id, new Set([id]));
}

export type Availability = "aprobada" | "cursando" | "disponible" | "bloqueada";

export function availability(
  subject: Subject,
  byId: ReadonlyMap<string, Subject>,
  assumeCurrentPass: boolean,
): Availability {
  if (subject.status === "aprobada" || subject.status === "cursando") {
    return subject.status;
  }
  const unlocked = subject.prereqIds.every((prereqId) => {
    const prereq = byId.get(prereqId);
    if (prereq === undefined) {
      return false;
    }
    return (
      prereq.status === "aprobada" ||
      (assumeCurrentPass && prereq.status === "cursando")
    );
  });
  return unlocked ? "disponible" : "bloqueada";
}

export type ProgressStats = {
  total: number;
  approved: number;
  pctSubjects: number;
  pctCredits: number | null;
};

export function progressStats(subjects: readonly Subject[]): ProgressStats {
  const total = subjects.length;
  const approvedSubjects = subjects.filter(
    (subject) => subject.status === "aprobada",
  );
  const approved = approvedSubjects.length;
  const pctSubjects = total === 0 ? 0 : (approved / total) * 100;
  let totalCredits = 0;
  let approvedCredits = 0;
  for (const subject of subjects) {
    if (subject.credits === null) {
      return { total, approved, pctSubjects, pctCredits: null };
    }
    totalCredits += subject.credits;
    if (subject.status === "aprobada") {
      approvedCredits += subject.credits;
    }
  }
  const pctCredits =
    totalCredits === 0 ? 0 : (approvedCredits / totalCredits) * 100;
  return { total, approved, pctSubjects, pctCredits };
}

export type HighlightEdge = {
  from: string;
  to: string;
  kind: "prereq" | "dependent";
};

// Arrows to draw while a subject is hovered: its direct prerequisites point
// into it, and every subject that depends on it (directly or down the chain)
// is reached by an arrow from the subject it requires.
export function highlightEdges(
  subjects: readonly Subject[],
  id: string,
): HighlightEdge[] {
  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  const hovered = byId.get(id);
  if (hovered === undefined) return [];
  const edges: HighlightEdge[] = hovered.prereqIds
    .filter((prereq) => byId.has(prereq))
    .map((prereq) => ({ from: prereq, to: id, kind: "prereq" }));
  const reached = new Set([id, ...dependentsOf(subjects, id)]);
  for (const subject of subjects) {
    if (subject.id === id || !reached.has(subject.id)) continue;
    for (const prereq of subject.prereqIds) {
      if (reached.has(prereq)) {
        edges.push({ from: prereq, to: subject.id, kind: "dependent" });
      }
    }
  }
  return edges;
}
