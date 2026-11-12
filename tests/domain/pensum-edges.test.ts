import { describe, expect, it } from "vitest";
import { highlightEdges } from "@/src/domain/pensum";
import type { Subject } from "@/src/domain/schemas";

function subject(id: string, prereqIds: string[] = []): Subject {
  return {
    id,
    name: id,
    semester: 1,
    credits: null,
    prereqIds,
    kind: "obligatoria",
    status: "pendiente",
    finalGrade: null,
    overrides: [],
  };
}

const SUBJECTS = [
  subject("diferencial"),
  subject("algebra"),
  subject("integral", ["diferencial"]),
  subject("multivariado", ["integral", "algebra"]),
  subject("ecuaciones", ["integral"]),
  subject("numerico", ["ecuaciones"]),
  subject("fisica", ["diferencial"]),
];

describe("highlightEdges", () => {
  it("points prerequisites into the subject and follows the dependent chain", () => {
    expect(highlightEdges(SUBJECTS, "integral")).toEqual([
      { from: "diferencial", to: "integral", kind: "prereq" },
      { from: "integral", to: "multivariado", kind: "dependent" },
      { from: "integral", to: "ecuaciones", kind: "dependent" },
      { from: "ecuaciones", to: "numerico", kind: "dependent" },
    ]);
  });

  it("ignores unknown subjects and missing prerequisites", () => {
    expect(highlightEdges(SUBJECTS, "nada")).toEqual([]);
    expect(highlightEdges([subject("a", ["fantasma"])], "a")).toEqual([]);
  });
});
