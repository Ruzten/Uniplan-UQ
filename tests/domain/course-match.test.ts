import { describe, expect, it } from "vitest";
import { PENSUM_SEED_TEXT } from "@/src/data/pensum.seed";
import { matchCourse } from "@/src/domain/classroom";
import { courseWords, matchCourseLoosely } from "@/src/domain/course-match";
import { parsePensumSeed } from "@/src/domain/pensum";
import type { Subject } from "@/src/domain/schemas";

const CURRENT = new Set([
  "calculo-integral",
  "infraestructura-computacional",
  "sistemas-de-informacion",
  "programacion-iii",
]);
const SUBJECTS = parsePensumSeed(PENSUM_SEED_TEXT).map((subject) =>
  CURRENT.has(subject.id)
    ? { ...subject, status: "cursando" as const }
    : subject,
);

function subject(name: string, status: Subject["status"]): Subject {
  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    semester: 1,
    credits: null,
    prereqIds: [],
    kind: "obligatoria",
    status,
    finalGrade: null,
    overrides: [],
  };
}

describe("courseWords", () => {
  it("drops period, group and shift noise", () => {
    expect(courseWords("Calculo Integral 2026B Grupo 2")).toEqual([
      "calculo",
      "integral",
    ]);
    expect(courseWords("2025/2 Programacion II- 01N")).toEqual([
      "programacion",
      "ii",
    ]);
    expect(courseWords("Infra-noche-2026-2")).toEqual(["infra"]);
  });
});

describe("matchCourse with real Classroom names", () => {
  const cases: [string, string | null][] = [
    ["Calculo Integral 2026B Grupo 2", "calculo-integral"],
    ["Infra-noche-2026-2", "infraestructura-computacional"],
    ["Sistemas de información Noche 20262", "sistemas-de-informacion"],
    ["SISTEMA DE INFORMACIÓN", "sistemas-de-informacion"],
    ["2025/2 Programacion II- 01N", "programacion-ii"],
    ["Maratones de Programación", null],
  ];
  for (const [course, expected] of cases) {
    it(`${course} → ${expected ?? "sin asociar"}`, () => {
      expect(matchCourse(course, SUBJECTS, {})?.id ?? null).toBe(expected);
    });
  }
});

describe("matchCourseLoosely", () => {
  it("prefers the longest contained subject name", () => {
    const subjects = [
      subject("Física", "pendiente"),
      subject("Física general", "pendiente"),
    ];
    expect(matchCourseLoosely("Física general G3", subjects)?.name).toBe(
      "Física general",
    );
  });

  it("breaks ties with the subject being taken and refuses real ambiguity", () => {
    const both = [
      subject("Programación avanzada", "aprobada"),
      subject("Programación aplicada", "cursando"),
    ];
    expect(matchCourseLoosely("Progr ap", both)).toBeNull();
    expect(matchCourseLoosely("Prog", both)?.name).toBe(
      "Programación aplicada",
    );
    const pending = [
      subject("Programación avanzada", "pendiente"),
      subject("Programación aplicada", "pendiente"),
    ];
    expect(matchCourseLoosely("Prog", pending)).toBeNull();
  });
});
