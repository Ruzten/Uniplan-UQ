import { describe, expect, it } from "vitest";
import { subjectAverage } from "@/src/domain/grades";
import { composeGrades, parcialNumber } from "@/src/domain/grades-compose";
import type { Grade, GradeScale } from "@/src/domain/schemas";

const SCALE: GradeScale = { min: 0, max: 5, pass: 3 };

let next = 0;
function grade(
  label: string,
  score: number | null,
  source: Grade["source"],
  weightPct: number | null = null,
  maxScore = 5,
): Grade {
  next += 1;
  return {
    id: `g${next}`,
    subjectId: "calculo",
    label,
    score,
    maxScore,
    weightPct,
    source,
    externalId: source === "manual" ? null : `x|${next}`,
    overrides: [],
    hidden: false,
    updatedAt: new Date(2026, 0, 1).toISOString(),
  };
}

describe("parcialNumber", () => {
  it("reads arabic and roman numbers after parcial", () => {
    expect(parcialNumber("Parcial 1 - Infraestructura")).toBe(1);
    expect(parcialNumber("Entrega del Parcial 2")).toBe(2);
    expect(parcialNumber("Parcial III")).toBe(3);
    expect(parcialNumber("PARCIAL I")).toBe(1);
    expect(parcialNumber("Taller")).toBeNull();
  });
});

describe("composeGrades with SAC components", () => {
  const sac = [
    grade("Parcial 1", 3.4, "sac", 25),
    grade("Parcial 2", null, "sac", 25),
    grade("Parcial 3", null, "sac", 25),
    grade("Seguimiento", null, "sac", 25),
  ];
  const platform = [
    grade("Taller 1", 4, "classroom"),
    grade("Foro", 3, "moodle"),
    grade("Quiz pendiente", null, "moodle"),
    grade("Entrega del Parcial 2", 40, "classroom", null, 50),
  ];

  it("averages follow-up activities into the SAC Seguimiento and maps parciales", () => {
    const result = composeGrades([...sac, ...platform], SCALE);
    expect(result.structured).toBe(true);
    expect(result.followUpCount).toBe(2);
    expect(result.followUpAverage).toBeCloseTo(3.5);
    const byLabel = new Map(result.components.map((c) => [c.label, c]));
    expect(byLabel.get("Parcial 1")).toMatchObject({
      score: 3.4,
      estimated: false,
    });
    expect(byLabel.get("Parcial 2")?.score).toBeCloseTo(4);
    expect(byLabel.get("Parcial 2")?.estimated).toBe(true);
    expect(byLabel.get("Parcial 3")).toMatchObject({
      score: null,
      estimated: false,
    });
    expect(byLabel.get("Seguimiento")?.score).toBeCloseTo(3.5);
    expect(result.activities).toHaveLength(4);
  });

  it("never lets a platform activity count as a weighted component", () => {
    const { components } = composeGrades([...sac, ...platform], SCALE);
    const summary = subjectAverage(components, SCALE);
    // 3.4, 4 and 3.5 at 25% each; Parcial 3 still pending
    expect(summary.average).toBeCloseTo(3.633, 2);
    expect(summary.gradedPct).toBe(75);
  });

  it("keeps a real SAC grade over any estimate", () => {
    const { components } = composeGrades(
      [grade("Seguimiento", 2, "sac", 30), grade("Taller", 5, "moodle")],
      SCALE,
    );
    expect(components[0]).toMatchObject({ score: 2, estimated: false });
  });
});

describe("composeGrades without SAC components", () => {
  it("counts each parcial once and all follow-up work as one average", () => {
    const { components, structured } = composeGrades(
      [
        grade("Parcial 1", 3.7, "moodle"),
        grade("Entrega obligatoria", 3.7, "moodle"),
        grade("Foro", 0, "moodle"),
        grade("Taller", 5, "moodle"),
      ],
      SCALE,
    );
    expect(structured).toBe(false);
    expect(components.map((c) => c.label)).toEqual([
      "Parcial 1",
      "Seguimiento (promedio de 3)",
    ]);
    expect(components[1]?.score).toBeCloseTo(2.9);
    expect(subjectAverage(components, SCALE).average).toBeCloseTo(3.3);
  });
});
