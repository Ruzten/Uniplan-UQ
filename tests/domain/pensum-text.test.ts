import { describe, expect, it } from "vitest";
import { PENSUM_SEED_TEXT } from "@/src/data/pensum.seed";
import { parsePensumSeed } from "@/src/domain/pensum";
import {
  buildSubject,
  PENSUM_TEMPLATE,
  parsePensumText,
  pensumToText,
  withoutProgress,
} from "@/src/domain/pensum-text";

describe("parsePensumText", () => {
  it("reads the template into pending subjects linked by prerequisite", () => {
    const { subjects, errors } = parsePensumText(PENSUM_TEMPLATE);
    expect(errors).toEqual([]);
    const integral = subjects.find((s) => s.name === "Cálculo integral");
    expect(integral).toMatchObject({
      semester: 2,
      credits: 4,
      prereqIds: ["calculo-diferencial"],
      status: "pendiente",
      kind: "obligatoria",
    });
    const elective = subjects.find((s) => s.name === "Electiva profesional");
    expect(elective?.kind).toBe("profundizacion");
  });

  it("accepts tab separated rows with a header, accents and case aside", () => {
    const text =
      "Semestre\tNombre\tCréditos\tPrerrequisitos\n1\tFísica I\t3\t\n2\tFísica II\t3,5\tfisica i\n";
    const { subjects, errors } = parsePensumText(text);
    expect(errors).toEqual([]);
    expect(subjects.map((s) => s.id)).toEqual(["fisica-i", "fisica-ii"]);
    expect(subjects[1]?.credits).toBe(3.5);
    expect(subjects[1]?.prereqIds).toEqual(["fisica-i"]);
  });

  it("reports every bad line and returns no subjects", () => {
    const text = [
      "0 | Sin semestre |",
      "1 | |",
      "1 | Química | -2 |",
      "2 | Química orgánica | | Química; Biología",
      "2 | química orgánica |",
      "3 | Tesis | | | opcional",
    ].join("\n");
    const { subjects, errors } = parsePensumText(text);
    expect(subjects).toEqual([]);
    expect([...new Set(errors.map((error) => error.line))]).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("rejects prerequisites that form a cycle", () => {
    const { subjects, errors } = parsePensumText("1 | A | | B\n1 | B | | A\n");
    expect(subjects).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});

describe("pensumToText", () => {
  it("round-trips the seeded pensum without the student's progress", () => {
    const seed = parsePensumSeed(PENSUM_SEED_TEXT);
    const { subjects, errors } = parsePensumText(pensumToText(seed));
    expect(errors).toEqual([]);
    const byId = new Map(subjects.map((s) => [s.id, s]));
    for (const original of seed) {
      expect(byId.get(original.id)).toMatchObject({
        name: original.name,
        semester: original.semester,
        kind: original.kind,
        prereqIds: original.prereqIds,
        status: "pendiente",
      });
    }
  });
});

describe("withoutProgress", () => {
  it("resets status, final grade and overrides", () => {
    const seed = parsePensumSeed(PENSUM_SEED_TEXT).map((s) => ({
      ...s,
      finalGrade: 4,
      overrides: ["status"],
    }));
    for (const subject of withoutProgress(seed)) {
      expect(subject).toMatchObject({
        status: "pendiente",
        finalGrade: null,
        overrides: [],
      });
    }
  });
});

describe("buildSubject", () => {
  const existing = parsePensumSeed(PENSUM_SEED_TEXT);
  it("creates a pending subject with a slug id", () => {
    const result = buildSubject(
      {
        name: " Biología celular ",
        semester: 2,
        credits: 3,
        kind: "obligatoria",
      },
      existing,
    );
    expect(result).toMatchObject({
      id: "biologia-celular",
      name: "Biología celular",
      status: "pendiente",
      prereqIds: [],
    });
  });

  it("refuses duplicates, empty names and out of range values", () => {
    const base = { semester: 1, credits: null, kind: "obligatoria" } as const;
    expect(
      typeof buildSubject({ ...base, name: "cálculo INTEGRAL" }, existing),
    ).toBe("string");
    expect(typeof buildSubject({ ...base, name: "  " }, existing)).toBe(
      "string",
    );
    expect(
      typeof buildSubject({ ...base, name: "Nueva", semester: 12 }, existing),
    ).toBe("string");
    expect(
      typeof buildSubject({ ...base, name: "Nueva", credits: 0 }, existing),
    ).toBe("string");
  });
});
