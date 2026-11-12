import { describe, expect, it } from "vitest";
import {
  agendaSummary,
  daysUntilLabel,
  dueTone,
  greetingFor,
  summaryMessage,
} from "@/src/domain/agenda-summary";
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

// Wednesday 2026-03-11, 12:00 local time. The week runs Monday 9 to Sunday 15.
const NOW = new Date(2026, 2, 11, 12);

describe("agendaSummary", () => {
  it("counts pending work by window and picks the next upcoming item", () => {
    const summary = agendaSummary(
      [
        item("vencida", new Date(2026, 2, 10, 8)),
        item("hoy hecha", new Date(2026, 2, 11, 18), true),
        item("hoy", new Date(2026, 2, 11, 18)),
        item("viernes", new Date(2026, 2, 13, 8)),
        item("lunes", new Date(2026, 2, 16, 8)),
        item("sin fecha", null),
      ],
      NOW,
    );
    expect(summary).toMatchObject({ today: 1, week: 2, overdue: 1, done: 1 });
    expect(summary.next?.title).toBe("hoy");
  });

  it("returns no next item when nothing pending lies ahead", () => {
    const summary = agendaSummary(
      [item("pasada", new Date(2026, 2, 11, 9)), item("sin fecha", null)],
      NOW,
    );
    expect(summary.next).toBeNull();
    expect(summary.today).toBe(1);
  });
});

describe("greetingFor", () => {
  it("greets by the hour of the day", () => {
    expect(greetingFor(new Date(2026, 2, 11, 7))).toBe("Buenos días");
    expect(greetingFor(new Date(2026, 2, 11, 15))).toBe("Buenas tardes");
    expect(greetingFor(new Date(2026, 2, 11, 21))).toBe("Buenas noches");
  });
});

describe("dueTone", () => {
  it("classifies items by how close their due date is", () => {
    expect(dueTone(item("a", new Date(2026, 2, 10, 8)), NOW)).toBe("overdue");
    expect(dueTone(item("b", new Date(2026, 2, 10, 8), true), NOW)).toBe(
      "later",
    );
    expect(dueTone(item("c", new Date(2026, 2, 11, 20)), NOW)).toBe("today");
    expect(dueTone(item("d", new Date(2026, 2, 13, 8)), NOW)).toBe("soon");
    expect(dueTone(item("e", new Date(2026, 2, 20, 8)), NOW)).toBe("later");
    expect(dueTone(item("f", null), NOW)).toBe("none");
  });
});

describe("daysUntilLabel", () => {
  it("speaks in days from today", () => {
    expect(daysUntilLabel(new Date(2026, 2, 11, 20).toISOString(), NOW)).toBe(
      "Hoy",
    );
    expect(daysUntilLabel(new Date(2026, 2, 12, 8).toISOString(), NOW)).toBe(
      "Mañana",
    );
    expect(daysUntilLabel(new Date(2026, 2, 14, 8).toISOString(), NOW)).toBe(
      "En 3 días",
    );
  });
});

describe("summaryMessage", () => {
  const base = { today: 0, done: 0, next: null };
  it("describes the week and the overdue work", () => {
    expect(summaryMessage({ ...base, week: 0, overdue: 0 })).toBe(
      "No tienes pendientes esta semana.",
    );
    expect(summaryMessage({ ...base, week: 1, overdue: 0 })).toBe(
      "Tienes 1 pendiente esta semana.",
    );
    expect(summaryMessage({ ...base, week: 3, overdue: 2 })).toBe(
      "Tienes 3 pendientes esta semana y 2 vencidos.",
    );
  });
});
