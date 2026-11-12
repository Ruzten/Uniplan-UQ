import { describe, expect, it } from "vitest";
import { type SubjectAverage, subjectAverage } from "@/src/domain/grades";
import {
  accumulatedScore,
  gradeKind,
  neededState,
  projectedFinal,
  semesterSummary,
  standingOf,
  upcomingEvaluations,
} from "@/src/domain/grades-summary";
import type { GradeScale, Item, ItemType } from "@/src/domain/schemas";

const SCALE: GradeScale = { min: 0, max: 5, pass: 3 };

function summary(average: number | null, gradedPct: number | null = null) {
  return {
    average,
    weighted: gradedPct !== null,
    gradedPct,
    neededForPass: null,
  } satisfies SubjectAverage;
}

function item(
  title: string,
  type: ItemType,
  due: Date | null,
  overrides: Partial<Item> = {},
): Item {
  return {
    id: title,
    type,
    title,
    subjectId: "calculo",
    dueAt: due === null ? null : due.toISOString(),
    weightPct: null,
    notes: "",
    done: false,
    links: [],
    isActa: false,
    source: "manual",
    externalId: null,
    overrides: [],
    hidden: false,
    createdAt: new Date(2026, 0, 1).toISOString(),
    updatedAt: new Date(2026, 0, 1).toISOString(),
    ...overrides,
  };
}

const NOW = new Date(2026, 2, 11, 12);

describe("standingOf", () => {
  it("only calls a subject secured when the accumulated grade passes", () => {
    expect(standingOf(summary(null), null, SCALE)).toBe("sin-notas");
    expect(standingOf(summary(4, 30), 1.2, SCALE)).toBe("vas-bien");
    expect(standingOf(summary(2.5, 30), 0.75, SCALE)).toBe("en-riesgo");
    expect(standingOf(summary(4, 80), 3.2, SCALE)).toBe("asegurada");
  });
});

describe("accumulatedScore", () => {
  it("counts pending and unassigned weight as zero", () => {
    expect(
      accumulatedScore([{ score: 4, maxScore: 5, weightPct: 30 }], SCALE),
    ).toBeCloseTo(1.2);
    expect(
      accumulatedScore(
        [
          { score: 3.4, maxScore: 5, weightPct: 25 },
          { score: 4, maxScore: 5, weightPct: 25 },
          { score: null, maxScore: 5, weightPct: 25 },
          { score: null, maxScore: 5, weightPct: 25 },
        ],
        SCALE,
      ),
    ).toBeCloseTo(1.85);
  });

  it("averages every grade with pending as zero when weights are missing", () => {
    expect(
      accumulatedScore(
        [
          { score: 4, maxScore: 5, weightPct: null },
          { score: null, maxScore: 5, weightPct: null },
        ],
        SCALE,
      ),
    ).toBeCloseTo(2);
    expect(accumulatedScore([], SCALE)).toBeNull();
  });

  it("uses the scale minimum as the floor", () => {
    const scale = { min: 1, max: 5, pass: 3 };
    expect(
      accumulatedScore([{ score: null, maxScore: 5, weightPct: 50 }], scale),
    ).toBe(1);
  });
});

describe("gradeKind", () => {
  it("is parcial only when the label says so", () => {
    expect(gradeKind("Notas Parcial 1")).toBe("parcial");
    expect(gradeKind("PARCIAL 2")).toBe("parcial");
    expect(gradeKind("Actividad Calificable")).toBe("seguimiento");
    expect(gradeKind("Examen final")).toBe("seguimiento");
  });
});

describe("neededState", () => {
  it("says whether the pass is secured, reachable or out of reach", () => {
    expect(neededState(-1, SCALE)).toEqual({ kind: "asegurada" });
    expect(neededState(0, SCALE)).toEqual({ kind: "asegurada" });
    expect(neededState(2.57, SCALE)).toEqual({
      kind: "alcanzable",
      needed: 2.57,
    });
    expect(neededState(5.2, SCALE)).toEqual({ kind: "imposible" });
  });
});

describe("projectedFinal", () => {
  it("fills the remaining percent with the hypothetical score", () => {
    const current = subjectAverage(
      [{ score: 4, maxScore: 5, weightPct: 30 }],
      SCALE,
    );
    expect(projectedFinal(current, 3)).toBeCloseTo(3.3);
    expect(projectedFinal(current, 5)).toBeCloseTo(4.7);
  });

  it("has nothing to project without weights or with everything graded", () => {
    expect(projectedFinal(summary(4), 3)).toBeNull();
    expect(projectedFinal(summary(4, 100), 3)).toBeNull();
    expect(projectedFinal(summary(null, 0), 3)).toBeNull();
  });
});

describe("semesterSummary", () => {
  it("weights by credits when every graded subject has them", () => {
    const result = semesterSummary(
      [
        { credits: 4, summary: summary(4, 50), accumulated: 4 },
        { credits: 2, summary: summary(2.5, 30), accumulated: 2.5 },
        { credits: null, summary: summary(null), accumulated: null },
      ],
      SCALE,
    );
    expect(result.creditWeighted).toBe(true);
    expect(result.average).toBeCloseTo(3.5);
    expect(result).toMatchObject({ subjects: 3, graded: 2, atRisk: 1 });
    expect(result.evaluatedPct).toBeCloseTo(40);
  });

  it("falls back to a plain mean when credits are missing", () => {
    const result = semesterSummary(
      [
        { credits: null, summary: summary(4), accumulated: 4 },
        { credits: 3, summary: summary(2), accumulated: 2 },
      ],
      SCALE,
    );
    expect(result.creditWeighted).toBe(false);
    expect(result.average).toBeCloseTo(3);
    expect(result.evaluatedPct).toBeNull();
  });

  it("has no average when nothing is graded", () => {
    expect(semesterSummary([], SCALE).average).toBeNull();
  });
});

describe("upcomingEvaluations", () => {
  it("lists future pending exams of the subject, soonest first", () => {
    const result = upcomingEvaluations(
      [
        item("proyecto", "proyecto", new Date(2026, 2, 20)),
        item("parcial", "parcial", new Date(2026, 2, 13)),
        item("tarea", "tarea", new Date(2026, 2, 12)),
        item("pasado", "parcial", new Date(2026, 2, 10)),
        item("hecho", "quiz", new Date(2026, 2, 14), { done: true }),
        item("otra", "quiz", new Date(2026, 2, 14), { subjectId: "fisica" }),
        item("sin fecha", "parcial", null),
      ],
      "calculo",
      NOW,
    );
    expect(result.map((entry) => entry.title)).toEqual(["parcial", "proyecto"]);
  });
});
