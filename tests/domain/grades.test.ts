import { describe, expect, it } from "vitest";
import {
  formatScore,
  isValidScale,
  normalizeScore,
  subjectAverage,
} from "@/src/domain/grades";

const SCALE = { min: 0, max: 5, pass: 3 };

function grade(
  score: number | null,
  maxScore: number,
  weightPct: number | null,
) {
  return { score, maxScore, weightPct };
}

describe("normalizeScore", () => {
  it("maps a score onto the configured scale", () => {
    expect(normalizeScore(80, 100, SCALE)).toBeCloseTo(4);
    expect(normalizeScore(4, 5, SCALE)).toBeCloseTo(4);
    expect(normalizeScore(5, 10, { min: 1, max: 5, pass: 3 })).toBeCloseTo(3);
  });
});

describe("subjectAverage", () => {
  it("returns the weighted mean, graded percent and the needed score when every grade has a weight", () => {
    const result = subjectAverage([grade(4, 5, 30), grade(60, 100, 20)], SCALE);
    // normalized: 4 and 3; Σ(n × w) = 120 + 60 = 180; Σw = 50
    expect(result.weighted).toBe(true);
    expect(result.average).toBeCloseTo(180 / 50);
    expect(result.gradedPct).toBe(50);
    expect(result.neededForPass).toBeCloseTo((3 * 100 - 180) / (100 - 50));
  });

  it("matches the Parcial 1 example: 4 of 5 with weight 30", () => {
    const result = subjectAverage([grade(4, 5, 30)], SCALE);
    expect(formatScore(result.average ?? Number.NaN)).toBe("4.00");
    expect(result.gradedPct).toBe(30);
    expect(formatScore(result.neededForPass ?? Number.NaN)).toBe("2.57");
  });

  it("returns a null needed score when the weights add up to 100", () => {
    const result = subjectAverage([grade(3, 5, 50), grade(5, 5, 50)], SCALE);
    expect(result.average).toBeCloseTo(4);
    expect(result.gradedPct).toBe(100);
    expect(result.neededForPass).toBeNull();
  });

  it("falls back to the simple mean with null percent and needed score when a weight is missing", () => {
    const result = subjectAverage([grade(4, 5, 30), grade(2, 5, null)], SCALE);
    expect(result.weighted).toBe(false);
    expect(result.average).toBeCloseTo(3);
    expect(result.gradedPct).toBeNull();
    expect(result.neededForPass).toBeNull();
  });

  it("leaves pending grades out of the average and keeps their weight as remaining", () => {
    // real report shape: 25% graded 3.7, three components still pending
    const result = subjectAverage(
      [
        grade(3.7, 5, 25),
        grade(null, 5, 25),
        grade(null, 5, 25),
        grade(null, 5, 25),
      ],
      SCALE,
    );
    expect(result.weighted).toBe(true);
    expect(result.average).toBeCloseTo(3.7);
    expect(result.gradedPct).toBe(25);
    // contribution 3.7 × 0.25 = 0.925; (3.0 − 0.925) / 0.75 ≈ 2.77
    expect(result.neededForPass).toBeCloseTo((3 - 0.925) / 0.75);
    expect(formatScore(result.neededForPass ?? Number.NaN)).toBe("2.77");
  });

  it("gives the same result with or without pending grades next to the graded ones", () => {
    const graded = [grade(4, 5, 30), grade(2, 5, null)];
    expect(subjectAverage([...graded, grade(null, 5, 40)], SCALE)).toEqual(
      subjectAverage(graded, SCALE),
    );
  });

  it("needs the pass mark when every weighted grade is still pending", () => {
    const result = subjectAverage(
      [grade(null, 5, 50), grade(null, 5, 50)],
      SCALE,
    );
    expect(result.average).toBeNull();
    expect(result.gradedPct).toBe(0);
    expect(result.neededForPass).toBe(3);
  });

  it("returns a null average for an empty list", () => {
    expect(subjectAverage([], SCALE).average).toBeNull();
  });
});

describe("formatScore and isValidScale", () => {
  it("formats with two decimals", () => {
    expect(formatScore(2.571)).toBe("2.57");
    expect(formatScore(4)).toBe("4.00");
  });

  it("accepts min < pass <= max and rejects anything else", () => {
    expect(isValidScale({ min: 0, max: 5, pass: 3 })).toBe(true);
    expect(isValidScale({ min: 0, max: 5, pass: 5 })).toBe(true);
    expect(isValidScale({ min: 0, max: 5, pass: 6 })).toBe(false);
    expect(isValidScale({ min: 3, max: 5, pass: 3 })).toBe(false);
    expect(isValidScale({ min: 0, max: 5, pass: Number.NaN })).toBe(false);
  });
});
