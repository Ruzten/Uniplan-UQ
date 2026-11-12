import type { Subject } from "@/src/domain/schemas";
import { looseName } from "@/src/domain/text";

// Classroom course names carry noise the pensum does not: the period
// ("2026B", "2025/2", "20262"), the group ("Grupo 2", "01N") and the shift
// ("Noche"). This module strips that noise and matches what is left.

const STOPWORDS = new Set([
  "de",
  "del",
  "la",
  "las",
  "el",
  "los",
  "y",
  "e",
  "en",
  "a",
]);

const NOISE = new Set([
  "ra",
  "arm",
  "grupo",
  "gr",
  "grp",
  "noche",
  "nocturna",
  "nocturno",
  "diurna",
  "diurno",
  "jornada",
  "semestre",
  "periodo",
  "sede",
  "virtual",
  "presencial",
]);

function isNoise(word: string): boolean {
  if (NOISE.has(word)) return true;
  if (/^\d+$/.test(word)) return true; // years, group numbers, "20262"
  if (/^(19|20)\d{2}[a-z]?$/.test(word)) return true; // "2026b"
  if (/^\d{1,3}[a-z]$/.test(word)) return true; // "01n", "2a"
  return false;
}

export function courseWords(name: string): string[] {
  return looseName(name)
    .split(" ")
    .filter((word) => word !== "" && !STOPWORDS.has(word) && !isNoise(word));
}

function subjectWords(subject: Subject): string[] {
  return looseName(subject.name)
    .split(" ")
    .filter((word) => word !== "" && !STOPWORDS.has(word));
}

function pickOne(candidates: readonly Subject[]): Subject | null {
  if (candidates.length === 1) return candidates[0] ?? null;
  const current = candidates.filter((subject) => subject.status === "cursando");
  return current.length === 1 ? (current[0] ?? null) : null;
}

export function matchCourseLoosely(
  courseName: string,
  subjects: readonly Subject[],
): Subject | null {
  const words = courseWords(courseName);
  if (words.length === 0) return null;
  const wordSet = new Set(words);
  const key = words.join(" ");

  const exact = subjects.filter(
    (subject) => subjectWords(subject).join(" ") === key,
  );
  if (exact.length > 0) return pickOne(exact);

  // Every word of the subject appears in the course name; keep the longest.
  const contained = subjects
    .map((subject) => ({ subject, words: subjectWords(subject) }))
    .filter(
      (entry) =>
        entry.words.length > 0 &&
        entry.words.every((word) => wordSet.has(word)),
    );
  if (contained.length > 0) {
    const longest = Math.max(...contained.map((entry) => entry.words.length));
    return pickOne(
      contained
        .filter((entry) => entry.words.length === longest)
        .map((entry) => entry.subject),
    );
  }

  // Short abbreviations such as "Infra" or "Calc Integral": each course word
  // (4+ letters) is a prefix of the subject word in the same position.
  if (words.length <= 2 && words.every((word) => word.length >= 4)) {
    const abbreviated = subjects.filter((subject) => {
      const target = subjectWords(subject);
      return words.every((word, index) => target[index]?.startsWith(word));
    });
    return pickOne(abbreviated);
  }
  return null;
}
