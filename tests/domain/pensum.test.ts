import { describe, expect, it } from "vitest";
import { PENSUM_SEED_TEXT } from "@/src/data/pensum.seed";
import {
  availability,
  chainDepth,
  dependentsOf,
  detectCycles,
  parsePensumSeed,
  progressStats,
} from "@/src/domain/pensum";
import type { Subject } from "@/src/domain/schemas";
import { normalizeText, slugify } from "@/src/domain/text";

function subject(id: string, overrides: Partial<Subject> = {}): Subject {
  return {
    id,
    name: id.toUpperCase(),
    semester: 1,
    credits: null,
    prereqIds: [],
    kind: "obligatoria",
    status: "pendiente",
    finalGrade: null,
    overrides: [],
    ...overrides,
  };
}

function seedLineCount(): number {
  return PENSUM_SEED_TEXT.split("\n").filter((line) => line.trim()).length;
}

describe("text helpers", () => {
  it("normalizes accents, case and spaces", () => {
    expect(normalizeText("  Cálculo   Diferencial ")).toBe(
      "calculo diferencial",
    );
  });

  it("slugifies without edge dashes", () => {
    expect(slugify(" Fundamentos de Electricidad, electrónica ")).toBe(
      "fundamentos-de-electricidad-electronica",
    );
  });
});

describe("parsePensumSeed", () => {
  it("returns one subject per non-empty line with unique ids and valid prereqs", () => {
    const subjects = parsePensumSeed(PENSUM_SEED_TEXT);
    expect(subjects).toHaveLength(seedLineCount());
    const ids = new Set(subjects.map((row) => row.id));
    expect(ids.size).toBe(subjects.length);
    for (const row of subjects) {
      expect(row.credits).toBeNull();
      expect(row.finalGrade).toBeNull();
      expect(row.overrides).toEqual([]);
      for (const prereqId of row.prereqIds) {
        expect(ids.has(prereqId)).toBe(true);
      }
    }
  });

  it("throws with the name of an unknown prerequisite", () => {
    const text = "1|A|O|Base|\n2|P|O|Siguiente|Materia fantasma\n";
    expect(() => parsePensumSeed(text)).toThrow(/Materia fantasma/);
  });

  it("throws on a line without five fields", () => {
    expect(() => parsePensumSeed("1|A|O|Base\n")).toThrow(/1\|A\|O\|Base/);
  });
});

describe("graph utilities", () => {
  it("finds no cycle in the seeded pensum", () => {
    expect(detectCycles(parsePensumSeed(PENSUM_SEED_TEXT))).toEqual([]);
  });

  it("finds a cycle between two mutually required subjects", () => {
    const subjects = [
      subject("a", { prereqIds: ["b"] }),
      subject("b", { prereqIds: ["a"] }),
    ];
    const cycles = detectCycles(subjects);
    expect(cycles.length).toBeGreaterThan(0);
    const cycle = cycles[0] ?? [];
    expect(cycle).toContain("a");
    expect(cycle).toContain("b");
  });

  it("computes transitive dependents and the longest chain", () => {
    const subjects = [
      subject("a", { status: "aprobada" }),
      subject("b", { prereqIds: ["a"] }),
      subject("c", { prereqIds: ["b"] }),
      subject("d", { prereqIds: ["b"] }),
      subject("f", { prereqIds: ["c"] }),
    ];
    expect([...dependentsOf(subjects, "b")].sort()).toEqual(["c", "d", "f"]);
    expect(chainDepth(subjects, "b")).toBe(2);
    expect(chainDepth(subjects, "f")).toBe(0);
  });

  it("derives availability from prerequisite status", () => {
    const a = subject("a", { status: "cursando" });
    const b = subject("b", { prereqIds: ["a"] });
    const byId = new Map([
      [a.id, a],
      [b.id, b],
    ]);
    expect(availability(a, byId, true)).toBe("cursando");
    expect(availability(b, byId, true)).toBe("disponible");
    expect(availability(b, byId, false)).toBe("bloqueada");
  });
});

describe("progressStats", () => {
  it("returns null credit progress when any credits are unknown", () => {
    const subjects = [
      subject("a", { status: "aprobada", credits: 3 }),
      subject("b", { credits: null }),
      subject("c", { status: "aprobada", credits: 2 }),
      subject("d", { credits: 4 }),
    ];
    const stats = progressStats(subjects);
    expect(stats.total).toBe(subjects.length);
    expect(stats.approved).toBe(2);
    expect(stats.pctCredits).toBeNull();
    expect(stats.pctSubjects).toBe((2 / subjects.length) * 100);
  });
});
