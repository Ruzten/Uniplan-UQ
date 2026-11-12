import { describe, expect, it } from "vitest";
import {
  agendaItems,
  groupItems,
  isoToLocalInput,
  localInputToIso,
} from "@/src/domain/agenda";
import type { Item } from "@/src/domain/schemas";

function item(title: string, due: Date | null, done = false): Item {
  return {
    id: title,
    type: "tarea",
    title,
    subjectId: null,
    dueAt: due === null ? null : due.toISOString(),
    weightPct: null,
    notes: "",
    done,
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

function titles(list: Item[]): string[] {
  return list.map((entry) => entry.title);
}

// Wednesday 2026-03-11, 12:00 local time. The week runs Monday 9 to Sunday 15.
const NOW = new Date(2026, 2, 11, 12);

describe("groupItems", () => {
  it("places each item in its group, with Monday as the start of the week", () => {
    const groups = groupItems(
      [
        item("vencida", new Date(2026, 2, 10, 23)),
        item("hoy", new Date(2026, 2, 11, 18)),
        item("semana", new Date(2026, 2, 15, 20)),
        item("despues", new Date(2026, 2, 16, 8)),
        item("sin fecha", null),
      ],
      NOW,
    );
    expect(titles(groups.vencidas)).toEqual(["vencida"]);
    expect(titles(groups.hoy)).toEqual(["hoy"]);
    expect(titles(groups.semana)).toEqual(["semana"]);
    expect(titles(groups.despues)).toEqual(["despues"]);
    expect(titles(groups.sinFecha)).toEqual(["sin fecha"]);
  });

  it("treats Monday of the next week as later, not this week", () => {
    const sunday = new Date(2026, 2, 15, 10);
    const groups = groupItems(
      [item("lunes", new Date(2026, 2, 16, 0, 30))],
      sunday,
    );
    expect(titles(groups.despues)).toEqual(["lunes"]);
    expect(groups.semana).toEqual([]);
  });

  it("drops a done item dated before today and keeps an earlier part of today", () => {
    const groups = groupItems(
      [
        item("hecha vieja", new Date(2026, 2, 9, 10), true),
        item("temprano hoy", new Date(2026, 2, 11, 7)),
      ],
      NOW,
    );
    expect(groups.vencidas).toEqual([]);
    expect(titles(groups.hoy)).toEqual(["temprano hoy"]);
  });

  it("orders by due date and then by title", () => {
    const groups = groupItems(
      [
        item("b", new Date(2026, 2, 13, 10)),
        item("c", new Date(2026, 2, 12, 10)),
        item("a", new Date(2026, 2, 13, 10)),
      ],
      NOW,
    );
    expect(titles(groups.semana)).toEqual(["c", "a", "b"]);
  });
});

describe("local datetime conversion", () => {
  it("round-trips a local datetime-local value through UTC ISO", () => {
    const iso = localInputToIso("2026-03-15T10:00");
    expect(iso).toBe(new Date(2026, 2, 15, 10).toISOString());
    expect(isoToLocalInput(iso)).toBe("2026-03-15T10:00");
  });

  it("maps an empty value to null", () => {
    expect(localInputToIso("")).toBeNull();
    expect(isoToLocalInput(null)).toBe("");
  });
});

describe("agendaItems", () => {
  it("leaves acta documents out of the agenda", () => {
    const task = item("Taller", null);
    const acta = { ...item("Acta de concertación", null), isActa: true };
    expect(agendaItems([task, acta])).toEqual([task]);
  });
});
