import { describe, expect, it } from "vitest";
import { recommend } from "@/src/domain/recommend";
import type { Subject } from "@/src/domain/schemas";

function subject(
  id: string,
  semester: number,
  status: Subject["status"],
  prereqIds: string[] = [],
  credits: number | null = null,
  name: string = id.toUpperCase(),
): Subject {
  return {
    id,
    name,
    semester,
    credits,
    prereqIds,
    kind: "obligatoria",
    status,
    finalGrade: null,
    overrides: [],
  };
}

function graph(
  bStatus: Subject["status"] = "pendiente",
  credits: Partial<Record<string, number | null>> = {},
): Subject[] {
  return [
    subject("a", 1, "aprobada", [], credits.a ?? null),
    subject("b", 2, bStatus, ["a"], credits.b ?? null),
    subject("c", 3, "pendiente", ["b"], credits.c ?? null),
    subject("d", 3, "pendiente", ["b"], credits.d ?? null),
    subject("e", 2, "pendiente", [], credits.e ?? null),
    subject("f", 4, "pendiente", ["c"], credits.f ?? null),
  ];
}

const OPTIONS = { creditCap: null, courseCap: 5, assumeCurrentPass: true };

function ids(list: { subjectId: string }[]): string[] {
  return list.map((entry) => entry.subjectId);
}

describe("recommend", () => {
  it("returns only B with its hand-computed values when courseCap is 1", () => {
    const result = recommend(graph(), { ...OPTIONS, courseCap: 1 });
    expect(result).toEqual([
      {
        subjectId: "b",
        name: "B",
        semester: 2,
        unlockCount: 3,
        chainDepth: 2,
        score: 38,
        reason: "Desbloquea 3 materias; cadena de 2 semestres",
      },
    ]);
  });

  it("scores E at -2 with the no-unlock reason", () => {
    const result = recommend(graph(), OPTIONS);
    const e = result.find((entry) => entry.subjectId === "e");
    expect(e?.score).toBe(-2);
    expect(e?.reason).toBe("No desbloquea otras materias");
    expect(ids(result)).toEqual(["b", "e"]);
  });

  it("excludes C and D while B is in progress unless assumeCurrentPass is true", () => {
    const strict = recommend(graph("cursando"), {
      ...OPTIONS,
      assumeCurrentPass: false,
    });
    expect(ids(strict)).not.toContain("c");
    expect(ids(strict)).not.toContain("d");
    const assumed = recommend(graph("cursando"), OPTIONS);
    expect(ids(assumed)).toContain("c");
    expect(ids(assumed)).toContain("d");
    expect(ids(assumed)).not.toContain("b");
  });

  it("uses the singular forms when the numbers are 1", () => {
    const result = recommend(graph("cursando"), OPTIONS);
    const c = result.find((entry) => entry.subjectId === "c");
    expect(c?.reason).toBe("Desbloquea 1 materia; cadena de 1 semestre");
  });

  it("picks greedily in score order without exceeding creditCap when every candidate has credits", () => {
    const subjects = graph("cursando", { c: 4, d: 3, e: 2 });
    // ranked: C (10 + 5 - 3 = 12), E (-2), D (-3)
    const result = recommend(subjects, {
      ...OPTIONS,
      creditCap: 6,
      courseCap: 1,
    });
    expect(ids(result)).toEqual(["c", "e"]);
    const total = result.reduce(
      (sum, entry) =>
        sum + (subjects.find((s) => s.id === entry.subjectId)?.credits ?? 0),
      0,
    );
    expect(total).toBeLessThanOrEqual(6);
  });

  it("falls back to courseCap when some candidate has null credits", () => {
    const subjects = graph("cursando", { c: 4, d: 3 });
    const result = recommend(subjects, {
      ...OPTIONS,
      creditCap: 100,
      courseCap: 2,
    });
    expect(ids(result)).toEqual(["c", "e"]);
  });

  it("breaks score ties by lower semester and then by normalized name", () => {
    const subjects = [
      // S: semester 11, two direct dependents, chain 1 → 20 + 5 - 11 = 14
      subject("s", 11, "pendiente", [], null, "Sistemas"),
      subject("s1", 11, "pendiente", ["s"]),
      subject("s2", 11, "pendiente", ["s"]),
      // R: semester 1, one dependent, chain 1 → 10 + 5 - 1 = 14
      subject("r", 1, "pendiente", [], null, "Redes"),
      subject("r1", 2, "pendiente", ["r"]),
      // Same score and semester: only the normalized name decides
      subject("z", 3, "pendiente", [], null, "Zeta"),
      subject("x", 3, "pendiente", [], null, "Álgebra"),
    ];
    const result = recommend(subjects, OPTIONS);
    expect(result.find((entry) => entry.subjectId === "s")?.score).toBe(14);
    expect(result.find((entry) => entry.subjectId === "r")?.score).toBe(14);
    expect(ids(result)).toEqual(["r", "s", "x", "z"]);
  });
});
