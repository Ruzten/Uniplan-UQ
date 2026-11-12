import { describe, expect, it } from "vitest";
import {
  dayKey,
  filterItems,
  itemsByDay,
  monthMatrix,
} from "@/src/domain/calendar";
import type { Item, ItemType } from "@/src/domain/schemas";

function item(
  id: string,
  type: ItemType,
  subjectId: string | null,
  due: Date | null = null,
): Item {
  return {
    id,
    type,
    title: id,
    subjectId,
    dueAt: due === null ? null : due.toISOString(),
    weightPct: null,
    notes: "",
    done: false,
    links: [],
    isActa: false,
    source: "manual",
    externalId: null,
    overrides: [],
    hidden: false,
    createdAt: new Date(2026, 0, 1).toISOString(),
    updatedAt: new Date(2026, 0, 1).toISOString(),
  };
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

describe("monthMatrix", () => {
  const cases: [number, number][] = [
    [2026, 1],
    [2026, 2],
    [2026, 5],
    [2027, 1],
    [2028, 1],
  ];

  it.each(cases)(
    "returns Monday-first 7-day weeks covering every day of %i-%i",
    (year, monthIndex) => {
      const weeks = monthMatrix(year, monthIndex);
      for (const week of weeks) {
        expect(week).toHaveLength(7);
        expect(week[0]?.getDay()).toBe(1);
      }
      const keys = new Set(weeks.flat().map(dayKey));
      for (let day = 1; day <= daysInMonth(year, monthIndex); day += 1) {
        expect(keys.has(dayKey(new Date(year, monthIndex, day)))).toBe(true);
      }
      const lastWeek = weeks[weeks.length - 1];
      expect(weeks[0]?.some((date) => date.getMonth() === monthIndex)).toBe(
        true,
      );
      expect(lastWeek?.some((date) => date.getMonth() === monthIndex)).toBe(
        true,
      );
    },
  );
});

describe("dayKey and itemsByDay", () => {
  it("formats a local date as yyyy-MM-dd", () => {
    expect(dayKey(new Date(2026, 2, 5, 23, 30))).toBe("2026-03-05");
  });

  it("buckets dated items by local day and skips undated ones", () => {
    const byDay = itemsByDay([
      item("a", "tarea", null, new Date(2026, 2, 5, 8)),
      item("b", "tarea", null, new Date(2026, 2, 5, 22)),
      item("c", "tarea", null),
    ]);
    expect(byDay.get("2026-03-05")?.map((entry) => entry.id)).toEqual([
      "a",
      "b",
    ]);
    expect([...byDay.keys()]).toEqual(["2026-03-05"]);
  });
});

describe("filterItems", () => {
  const items = [
    item("calc-parcial", "parcial", "calculo"),
    item("calc-tarea", "tarea", "calculo"),
    item("fis-parcial", "parcial", "fisica"),
    item("libre", "quiz", null),
  ];

  it("keeps only items that match both the subject and the type", () => {
    const result = filterItems(items, {
      subjectId: "calculo",
      type: "parcial",
    });
    expect(result.map((entry) => entry.id)).toEqual(["calc-parcial"]);
  });

  it("filters by a single dimension when the other is all", () => {
    expect(
      filterItems(items, { subjectId: "all", type: "parcial" }).map(
        (entry) => entry.id,
      ),
    ).toEqual(["calc-parcial", "fis-parcial"]);
  });

  it("returns every item when both filters are all", () => {
    expect(filterItems(items, { subjectId: "all", type: "all" })).toEqual(
      items,
    );
  });
});
