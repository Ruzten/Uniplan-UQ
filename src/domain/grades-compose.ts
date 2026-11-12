import { normalizeScore } from "@/src/domain/grades";
import { type GradeKind, gradeKind } from "@/src/domain/grades-summary";
import type { Grade, GradeScale } from "@/src/domain/schemas";
import { normalizeText } from "@/src/domain/text";

// How the UQ grades a subject: the SAC holds the components and their weights
// (Parcial 1, Parcial 2, Seguimiento…). Classroom and Aulas Virtuales only hold
// activities: every follow-up activity is averaged into the single SAC
// "Seguimiento" grade, and a platform "Parcial N" is that same SAC parcial.
// While the SAC has no grade for a component, the activities estimate it.

export type ComposedGrade = {
  key: string;
  label: string;
  kind: GradeKind;
  score: number | null;
  maxScore: number;
  weightPct: number | null;
  estimated: boolean;
  grade: Grade | null;
};

export type GradeComposition = {
  components: ComposedGrade[];
  activities: Grade[];
  followUpAverage: number | null;
  followUpCount: number;
  structured: boolean;
};

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };

export function parcialNumber(label: string): number | null {
  const match = /parcial\s*(\d+|iv|v|i{1,3})\b/.exec(normalizeText(label));
  const token = match?.[1];
  if (token === undefined) return null;
  return /^\d+$/.test(token) ? Number(token) : (ROMAN[token] ?? null);
}

function isComponent(grade: Grade): boolean {
  return (
    (grade.source === "sac" || grade.source === "manual") &&
    grade.weightPct !== null
  );
}

function fromScale(value: number, maxScore: number, scale: GradeScale): number {
  const span = scale.max - scale.min;
  return span <= 0 ? 0 : ((value - scale.min) / span) * maxScore;
}

function plain(grade: Grade): ComposedGrade {
  return {
    key: grade.id,
    label: grade.label,
    kind: gradeKind(grade.label),
    score: grade.score,
    maxScore: grade.maxScore,
    weightPct: grade.weightPct,
    estimated: false,
    grade,
  };
}

export function composeGrades(
  grades: readonly Grade[],
  scale: GradeScale,
): GradeComposition {
  const components = grades.filter(isComponent);
  const activities = grades.filter((grade) => !isComponent(grade));
  const followUp = activities.filter(
    (grade) => gradeKind(grade.label) === "seguimiento" && grade.score !== null,
  );
  const followUpAverage =
    followUp.length === 0
      ? null
      : followUp.reduce(
          (sum, grade) =>
            sum + normalizeScore(grade.score ?? 0, grade.maxScore, scale),
          0,
        ) / followUp.length;
  const parciales = new Map<number, number>();
  for (const grade of activities) {
    const number = parcialNumber(grade.label);
    if (number !== null && grade.score !== null && !parciales.has(number)) {
      parciales.set(number, normalizeScore(grade.score, grade.maxScore, scale));
    }
  }

  if (components.length > 0) {
    return {
      components: components.map((grade) => {
        const base = plain(grade);
        if (grade.score !== null) return base;
        const number = parcialNumber(grade.label);
        const estimate =
          base.kind === "seguimiento"
            ? followUpAverage
            : number === null
              ? null
              : (parciales.get(number) ?? null);
        return estimate === null
          ? base
          : {
              ...base,
              score: fromScale(estimate, grade.maxScore, scale),
              estimated: true,
            };
      }),
      activities,
      followUpAverage,
      followUpCount: followUp.length,
      structured: true,
    };
  }

  // No SAC components yet: each parcial counts once and all follow-up work
  // counts as one averaged grade.
  const fallback: ComposedGrade[] = activities
    .filter((grade) => gradeKind(grade.label) === "parcial")
    .map(plain);
  if (followUpAverage !== null) {
    fallback.push({
      key: "seguimiento-promedio",
      label: `Seguimiento (promedio de ${followUp.length})`,
      kind: "seguimiento",
      score: fromScale(followUpAverage, scale.max, scale),
      maxScore: scale.max,
      weightPct: null,
      estimated: true,
      grade: null,
    });
  }
  return {
    components: fallback,
    activities,
    followUpAverage,
    followUpCount: followUp.length,
    structured: false,
  };
}
