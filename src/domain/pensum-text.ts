import { detectCycles } from "@/src/domain/pensum";
import { type Subject, subjectSchema } from "@/src/domain/schemas";
import { normalizeText, slugify } from "@/src/domain/text";

// Shareable pensum format, one subject per line:
//   semestre | nombre | créditos | prerrequisitos (separados por ;) | tipo
// Créditos, prerrequisitos and tipo are optional. Tabs work as separators too,
// so a range copied from a spreadsheet pastes as-is. Lines starting with # are
// comments; a first line whose first column is "semestre" is a header.

export const PENSUM_TEMPLATE = `# semestre | nombre | créditos | prerrequisitos (separados por ;) | tipo
1 | Cálculo diferencial | 4 |
1 | Introducción a la carrera | 2 |
2 | Cálculo integral | 4 | Cálculo diferencial
3 | Ecuaciones diferenciales | 4 | Cálculo integral
8 | Electiva profesional | 3 | | profundización
`;

export const MAX_SEMESTER = 11;

export type PensumLineError = { line: number; message: string };

export type PensumParse = {
  subjects: Subject[];
  errors: PensumLineError[];
};

export type NewSubjectInput = {
  name: string;
  semester: number;
  credits: number | null;
  kind: Subject["kind"];
};

type Draft = {
  line: number;
  semester: number;
  name: string;
  credits: number | null;
  prereqNames: string[];
  kind: Subject["kind"];
};

function parseKind(value: string): Subject["kind"] | null {
  const normalized = normalizeText(value);
  if (normalized === "" || normalized.startsWith("obligatori")) {
    return "obligatoria";
  }
  if (
    normalized.startsWith("profundizacion") ||
    normalized.startsWith("electiv")
  ) {
    return "profundizacion";
  }
  return null;
}

function parseDraft(raw: string, line: number): Draft | string {
  const fields = raw.split(/[|\t]/).map((field) => field.trim());
  const [semesterField = "", name = "", creditsField = "", prereqField = ""] =
    fields;
  const kindField = fields[4] ?? "";
  const semester = Number(semesterField);
  if (
    semesterField === "" ||
    !Number.isInteger(semester) ||
    semester < 1 ||
    semester > MAX_SEMESTER
  ) {
    return `El semestre debe ser un número entero entre 1 y ${MAX_SEMESTER}`;
  }
  if (slugify(name) === "") {
    return "Falta el nombre de la materia";
  }
  let credits: number | null = null;
  if (creditsField !== "") {
    credits = Number(creditsField.replace(",", "."));
    if (Number.isNaN(credits) || credits <= 0) {
      return "Los créditos deben ser un número mayor que 0 o quedar vacíos";
    }
  }
  const kind = parseKind(kindField);
  if (kind === null) {
    return "El tipo debe ser «obligatoria» o «profundización»";
  }
  return {
    line,
    semester,
    name,
    credits,
    prereqNames: prereqField
      .split(";")
      .map((prereq) => prereq.trim())
      .filter((prereq) => prereq.length > 0),
    kind,
  };
}

function isHeader(raw: string): boolean {
  const first = raw.split(/[|\t]/)[0] ?? "";
  return normalizeText(first.trim()) === "semestre";
}

export function parsePensumText(text: string): PensumParse {
  const errors: PensumLineError[] = [];
  const drafts: Draft[] = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;
    if (drafts.length === 0 && errors.length === 0 && isHeader(trimmed)) {
      return;
    }
    const draft = parseDraft(trimmed, line);
    if (typeof draft === "string") {
      errors.push({ line, message: draft });
    } else {
      drafts.push(draft);
    }
  });

  const lineById = new Map<string, number>();
  for (const draft of drafts) {
    const id = slugify(draft.name);
    const previous = lineById.get(id);
    if (previous !== undefined) {
      errors.push({
        line: draft.line,
        message: `«${draft.name}» ya aparece en la línea ${previous}`,
      });
    } else {
      lineById.set(id, draft.line);
    }
  }

  const subjects: Subject[] = [];
  for (const draft of drafts) {
    const id = slugify(draft.name);
    if (lineById.get(id) !== draft.line) continue;
    const prereqIds: string[] = [];
    for (const prereqName of draft.prereqNames) {
      const prereqId = slugify(prereqName);
      if (!lineById.has(prereqId)) {
        errors.push({
          line: draft.line,
          message: `El prerrequisito «${prereqName}» no está en la lista`,
        });
      } else if (prereqId === id) {
        errors.push({
          line: draft.line,
          message: "Una materia no puede ser su propio prerrequisito",
        });
      } else if (!prereqIds.includes(prereqId)) {
        prereqIds.push(prereqId);
      }
    }
    subjects.push(
      subjectSchema.parse({
        id,
        name: draft.name,
        semester: draft.semester,
        credits: draft.credits,
        prereqIds,
        kind: draft.kind,
        status: "pendiente",
        finalGrade: null,
        overrides: [],
      }),
    );
  }

  if (detectCycles(subjects).length > 0) {
    errors.push({
      line: 0,
      message: "Los prerrequisitos forman un ciclo; revisa las dependencias",
    });
  }
  errors.sort((a, b) => a.line - b.line);
  return { subjects: errors.length === 0 ? subjects : [], errors };
}

export function pensumToText(subjects: readonly Subject[]): string {
  const names = new Map(subjects.map((subject) => [subject.id, subject.name]));
  const sorted = [...subjects].sort((a, b) =>
    a.semester !== b.semester
      ? a.semester - b.semester
      : a.name.localeCompare(b.name, "es"),
  );
  const lines = sorted.map((subject) => {
    const prereqs = subject.prereqIds
      .map((id) => names.get(id))
      .filter((name): name is string => name !== undefined)
      .join("; ");
    const fields = [
      String(subject.semester),
      subject.name,
      subject.credits === null ? "" : String(subject.credits),
      prereqs,
    ];
    if (subject.kind === "profundizacion") fields.push("profundización");
    return fields.join(" | ").trimEnd();
  });
  return `# semestre | nombre | créditos | prerrequisitos (separados por ;) | tipo\n${lines.join("\n")}\n`;
}

export function withoutProgress(subjects: readonly Subject[]): Subject[] {
  return subjects.map((subject) => ({
    ...subject,
    status: "pendiente",
    finalGrade: null,
    overrides: [],
  }));
}

export function buildSubject(
  input: NewSubjectInput,
  existing: readonly Subject[],
): Subject | string {
  const name = input.name.trim();
  const id = slugify(name);
  if (id === "") {
    return "El nombre es obligatorio";
  }
  if (existing.some((subject) => subject.id === id)) {
    return "Ya existe una materia con ese nombre";
  }
  if (
    !Number.isInteger(input.semester) ||
    input.semester < 1 ||
    input.semester > MAX_SEMESTER
  ) {
    return `El semestre debe estar entre 1 y ${MAX_SEMESTER}`;
  }
  if (
    input.credits !== null &&
    (Number.isNaN(input.credits) || input.credits <= 0)
  ) {
    return "Los créditos deben ser un número mayor que 0";
  }
  return subjectSchema.parse({
    id,
    name,
    semester: input.semester,
    credits: input.credits,
    prereqIds: [],
    kind: input.kind,
    status: "pendiente",
    finalGrade: null,
    overrides: [],
  });
}
