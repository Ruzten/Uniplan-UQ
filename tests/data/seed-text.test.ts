import { describe, expect, it } from "vitest";
import { PENSUM_SEED_TEXT } from "@/src/data/pensum.seed";

describe("pensum seed text", () => {
  it("has five pipe-separated fields on every line", () => {
    const lines = PENSUM_SEED_TEXT.split("\n").filter((line) => line.trim());
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(line.split("|")).toHaveLength(5);
    }
  });
});
