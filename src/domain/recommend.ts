import { availability, chainDepth, dependentsOf } from "@/src/domain/pensum";
import type { Settings, Subject } from "@/src/domain/schemas";
import { normalizeText } from "@/src/domain/text";

export type Recommendation = {
  subjectId: string;
  name: string;
  semester: number;
  unlockCount: number;
  chainDepth: number;
  score: number;
  reason: string;
};

export type RecommendOptions = Pick<
  Settings,
  "creditCap" | "courseCap" | "assumeCurrentPass"
>;

function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm;
}

export function recommendationReason(
  unlockCount: number,
  depth: number,
): string {
  if (unlockCount === 0) {
    return "No desbloquea otras materias";
  }
  return `Desbloquea ${unlockCount} ${plural(unlockCount, "materia", "materias")}; cadena de ${depth} ${plural(depth, "semestre", "semestres")}`;
}

function compare(a: Recommendation, b: Recommendation): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }
  if (a.semester !== b.semester) {
    return a.semester - b.semester;
  }
  const nameA = normalizeText(a.name);
  const nameB = normalizeText(b.name);
  if (nameA === nameB) {
    return 0;
  }
  return nameA < nameB ? -1 : 1;
}

export function recommend(
  subjects: readonly Subject[],
  { creditCap, courseCap, assumeCurrentPass }: RecommendOptions,
): Recommendation[] {
  const byId = new Map(subjects.map((subject) => [subject.id, subject]));
  const candidates = subjects.filter(
    (subject) =>
      subject.status === "pendiente" &&
      availability(subject, byId, assumeCurrentPass) === "disponible",
  );
  const ranked = candidates
    .map((subject) => {
      const unlockCount = dependentsOf(subjects, subject.id).size;
      const depth = chainDepth(subjects, subject.id);
      return {
        subjectId: subject.id,
        name: subject.name,
        semester: subject.semester,
        unlockCount,
        chainDepth: depth,
        score: unlockCount * 10 + depth * 5 - subject.semester,
        reason: recommendationReason(unlockCount, depth),
      };
    })
    .sort(compare);

  const allHaveCredits = candidates.every(
    (subject) => subject.credits !== null,
  );
  if (creditCap === null || !allHaveCredits) {
    return ranked.slice(0, Math.max(0, courseCap));
  }
  const picked: Recommendation[] = [];
  let total = 0;
  for (const entry of ranked) {
    const credits = byId.get(entry.subjectId)?.credits ?? 0;
    if (total + credits <= creditCap) {
      picked.push(entry);
      total += credits;
    }
  }
  return picked;
}
