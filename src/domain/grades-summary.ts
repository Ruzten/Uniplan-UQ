import { normalizeScore, type SubjectAverage } from "@/src/domain/grades";
import type { Grade, GradeScale, Item, ItemType } from "@/src/domain/schemas";
import { normalizeText } from "@/src/domain/text";

// asegurada: the accumulated grade (pending counted as the minimum) already
// passes. vas-bien: what is graded averages a pass but it is not secured yet.
export type GradeStanding =
  | "asegurada"
  | "vas-bien"
  | "en-riesgo"
  | "sin-notas";

export type GradeKind = "parcial" | "seguimiento";

type ScoredGrade = Pick<Grade, "score" | "maxScore" | "weightPct">;

export type NeededState =
  | { kind: "asegurada" }
  | { kind: "alcanzable"; needed: number }
  | { kind: "imposible" };

export type SemesterEntry = {
  credits: number | null;
  summary: SubjectAverage;
  accumulated: number | null;
};

export type SemesterSummary = {
  average: number | null;
  creditWeighted: boolean;
  subjects: number;
  graded: number;
  atRisk: number;
  evaluatedPct: number | null;
};

const EVALUATION_TYPES: readonly ItemType[] = ["parcial", "quiz", "proyecto"];

export function gradeKind(label: string): GradeKind {
  return normalizeText(label).includes("parcial") ? "parcial" : "seguimiento";
}

// What the student has so far if everything not yet graded scored the
// minimum: pending grades and any weight with no grade yet count as 0.
export function accumulatedScore(
  grades: readonly ScoredGrade[],
  scale: GradeScale,
): number | null {
  if (grades.length === 0) return null;
  const weighted = grades.every((grade) => grade.weightPct !== null);
  if (weighted) {
    const totalWeight = grades.reduce(
      (sum, grade) => sum + (grade.weightPct ?? 0),
      0,
    );
    if (totalWeight > 0) {
      const earned = grades.reduce(
        (sum, grade) =>
          grade.score === null
            ? sum
            : sum +
              (normalizeScore(grade.score, grade.maxScore, scale) - scale.min) *
                (grade.weightPct ?? 0),
        0,
      );
      return scale.min + earned / Math.max(100, totalWeight);
    }
  }
  const sum = grades.reduce(
    (acc, grade) =>
      acc +
      (grade.score === null
        ? scale.min
        : normalizeScore(grade.score, grade.maxScore, scale)),
    0,
  );
  return sum / grades.length;
}

export function standingOf(
  summary: SubjectAverage,
  accumulated: number | null,
  scale: GradeScale,
): GradeStanding {
  if (accumulated !== null && accumulated >= scale.pass) return "asegurada";
  if (summary.average === null) return "sin-notas";
  return summary.average >= scale.pass ? "vas-bien" : "en-riesgo";
}

export function neededState(needed: number, scale: GradeScale): NeededState {
  if (needed <= scale.min) return { kind: "asegurada" };
  if (needed > scale.max) return { kind: "imposible" };
  return { kind: "alcanzable", needed };
}

// Final grade if every remaining percent were scored `hypothetical`.
export function projectedFinal(
  summary: SubjectAverage,
  hypothetical: number,
): number | null {
  if (
    !summary.weighted ||
    summary.average === null ||
    summary.gradedPct === null ||
    summary.gradedPct >= 100
  ) {
    return null;
  }
  const done = summary.average * summary.gradedPct;
  return (done + hypothetical * (100 - summary.gradedPct)) / 100;
}

export function semesterSummary(
  entries: readonly SemesterEntry[],
  scale: GradeScale,
): SemesterSummary {
  const graded = entries.filter((entry) => entry.accumulated !== null);
  const creditWeighted =
    graded.length > 0 &&
    graded.every((entry) => entry.credits !== null && entry.credits > 0);
  let average: number | null = null;
  if (graded.length > 0) {
    let sum = 0;
    let weight = 0;
    for (const entry of graded) {
      const w = creditWeighted ? (entry.credits ?? 0) : 1;
      sum += (entry.accumulated ?? 0) * w;
      weight += w;
    }
    average = sum / weight;
  }
  const evaluated = entries
    .map((entry) => entry.summary.gradedPct)
    .filter((pct): pct is number => pct !== null);
  return {
    average,
    creditWeighted,
    subjects: entries.length,
    graded: graded.length,
    atRisk: graded.filter(
      (entry) =>
        standingOf(entry.summary, entry.accumulated, scale) === "en-riesgo",
    ).length,
    evaluatedPct:
      evaluated.length === 0
        ? null
        : evaluated.reduce((acc, pct) => acc + pct, 0) / evaluated.length,
  };
}

export function upcomingEvaluations(
  items: readonly Item[],
  subjectId: string,
  now: Date,
): Item[] {
  const nowMs = now.getTime();
  return items
    .filter(
      (item) =>
        item.subjectId === subjectId &&
        !item.done &&
        item.dueAt !== null &&
        Date.parse(item.dueAt) >= nowMs &&
        EVALUATION_TYPES.includes(item.type),
    )
    .sort((a, b) => Date.parse(a.dueAt ?? "") - Date.parse(b.dueAt ?? ""));
}
