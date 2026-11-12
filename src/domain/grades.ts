import type { Grade, GradeScale } from "@/src/domain/schemas";

export type SubjectAverage = {
  average: number | null;
  weighted: boolean;
  gradedPct: number | null;
  neededForPass: number | null;
};

type ScoredGrade = Pick<Grade, "score" | "maxScore" | "weightPct">;

export function normalizeScore(
  score: number,
  maxScore: number,
  scale: GradeScale,
): number {
  return scale.min + (score / maxScore) * (scale.max - scale.min);
}

// Pending grades (score null) are left out of the average; their weight stays
// in the remaining percent (100 − graded weight), which also holds any weight
// no grade has been assigned yet.
export function subjectAverage(
  grades: readonly ScoredGrade[],
  scale: GradeScale,
): SubjectAverage {
  const graded = grades.flatMap((grade) =>
    grade.score === null ? [] : [{ ...grade, score: grade.score }],
  );
  if (graded.length === 0) {
    const pendingWeighted =
      grades.length > 0 && grades.every((grade) => grade.weightPct !== null);
    return {
      average: null,
      weighted: pendingWeighted,
      gradedPct: pendingWeighted ? 0 : null,
      neededForPass: pendingWeighted ? scale.pass : null,
    };
  }
  const normalized = graded.map((grade) => ({
    value: normalizeScore(grade.score, grade.maxScore, scale),
    weight: grade.weightPct,
  }));
  const weights = normalized.map((entry) => entry.weight);
  const allWeighted = weights.every((weight) => weight !== null);
  const totalWeight = weights.reduce<number>(
    (sum, weight) => sum + (weight ?? 0),
    0,
  );
  if (!allWeighted || totalWeight === 0) {
    const sum = normalized.reduce((acc, entry) => acc + entry.value, 0);
    return {
      average: sum / normalized.length,
      weighted: false,
      gradedPct: null,
      neededForPass: null,
    };
  }
  const weightedSum = normalized.reduce(
    (acc, entry) => acc + entry.value * (entry.weight ?? 0),
    0,
  );
  return {
    average: weightedSum / totalWeight,
    weighted: true,
    gradedPct: totalWeight,
    neededForPass:
      totalWeight >= 100
        ? null
        : (scale.pass * 100 - weightedSum) / (100 - totalWeight),
  };
}

export function formatScore(n: number): string {
  return n.toFixed(2);
}

export function isValidScale(scale: GradeScale): boolean {
  return (
    Number.isFinite(scale.min) &&
    Number.isFinite(scale.max) &&
    Number.isFinite(scale.pass) &&
    scale.min < scale.pass &&
    scale.pass <= scale.max
  );
}
