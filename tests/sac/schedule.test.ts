import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type UniplanDb } from "@/src/db/db";
import { getSetting } from "@/src/db/repo";
import { alignSpannedHeaders, classifyTable } from "@/src/domain/sac";
import {
  isScheduleGrid,
  parseClassText,
  parseScheduleGrid,
} from "@/src/domain/sac-schedule";
import { formatScheduleEntry, groupScheduleByDay } from "@/src/domain/schedule";
import { DEFAULT_SETTINGS, type ScheduleBlock } from "@/src/domain/schemas";
import { slugify } from "@/src/domain/text";
import { patchSubject } from "@/src/sync/merge";
import type { SacCapture } from "@/src/sync/messages";
import { captureSac, extractTables } from "@/src/sync/sac-extract";
import { importSacCapture } from "@/src/sync/sac-import";

const HTML = readFileSync(
  path.resolve("tests/fixtures/sac/pacr42-schedule.html"),
  "utf8",
);

function parseHtml(): Document {
  return new DOMParser().parseFromString(HTML, "text/html");
}

function capture(): SacCapture {
  return captureSac(parseHtml(), new Date(2026, 10, 11, 12));
}

function gridTable() {
  const grid = extractTables(parseHtml()).find(isScheduleGrid);
  if (grid === undefined) throw new Error("grid missing");
  return grid;
}

describe("parseClassText", () => {
  it("reads a glued class cell and takes the hours from its trailing range", () => {
    expect(
      parseClassText(
        "Cod. 70101Prog. 6CÁLCULO INTEGRALGrupo. 02NSubGrupo. 03/08/99 - 23/11/99Aula. B1-101 AULA6:00 pm-8:00 pm",
        1,
      ),
    ).toEqual({
      code: "70101",
      name: "CÁLCULO INTEGRAL",
      day: 1,
      start: "18:00",
      end: "20:00",
      room: "B1-101 AULA",
    });
  });

  it("gives a digit glued to the hour back to the room", () => {
    const parsed = parseClassText(
      "Cod. 70102Prog. 6FÍSICA GENERALGrupo. 01NSubGrupo.Aula. F6-2042:00 pm-4:00 pm",
      6,
    );
    expect(parsed?.room).toBe("F6-204");
    expect(parsed?.start).toBe("14:00");
    expect(parsed?.end).toBe("16:00");
  });

  it("rejects text without a code, name or hours", () => {
    expect(parseClassText("", 1)).toBeNull();
    expect(parseClassText("Cod. 70101Grupo. 01N6:00 pm-8:00 pm", 1)).toBeNull();
    expect(parseClassText("Cod. 70101Prog. 6QUÍMICAGrupo. 01N", 1)).toBeNull();
  });
});

describe("schedule grid", () => {
  it("recognises only the weekly grid among the page tables", () => {
    const tables = extractTables(parseHtml());
    expect(tables.filter(isScheduleGrid)).toHaveLength(1);
  });

  it("reads every class with its weekday column, including Saturday and a shared cell", () => {
    const classes = parseScheduleGrid(gridTable());
    const summary = classes
      .map((c) => `${c.day} ${c.start}-${c.end} ${c.name} | ${c.room}`)
      .sort();
    expect(summary).toEqual(
      [
        "1 18:00-20:00 CÁLCULO INTEGRAL | B1-101 AULA",
        "2 18:00-20:00 PROGRAMACIÓN III | B1-202 AULA MAESTRIA",
        "3 18:00-20:00 CÁLCULO INTEGRAL | B1-101 AULA",
        "4 20:00-22:00 PROGRAMACIÓN III | B1-202 AULA MAESTRIA",
        "5 18:00-19:00 SISTEMAS DE INFORMACIÓN | C2-305 AULA",
        "5 19:00-20:00 ELECTIVA DEPORTIVA | COLISEO",
        "6 14:00-16:00 INFRAESTRUCTURA COMPUTACIONAL | F6-204 SALÓN",
        "6 16:00-18:00 INFRAESTRUCTURA COMPUTACIONAL | F6-204 SALÓN",
      ].sort(),
    );
  });
});

describe("alignSpannedHeaders", () => {
  it("shifts the headers when Asignatura spans code and name, so Cred. is read and not Hor.", () => {
    const detail = extractTables(parseHtml()).find(
      (table) => table.headers[0] === "Asignatura",
    );
    if (detail === undefined) throw new Error("detail missing");
    expect(detail.rows[0]).toHaveLength(detail.headers.length + 1);
    const aligned = alignSpannedHeaders(detail);
    const classified = classifyTable(aligned, DEFAULT_SETTINGS.headerSynonyms);
    expect(classified.kind).toBe("enrollment");
    expect(classified.columns.subjectName).toBe(1);
    const credits = classified.columns.credits ?? -1;
    expect(aligned.headers[credits]).toBe("Cred.");
    expect(detail.rows[0]?.[credits]).toBe("4");
  });

  it("leaves tables whose rows match their headers untouched", () => {
    const table = { headers: ["Asignatura", "Créditos"], rows: [["X", "3"]] };
    expect(alignSpannedHeaders(table)).toBe(table);
  });
});

describe("groupScheduleByDay", () => {
  const block = (day: number, start: string, subjectId: string | null) =>
    ({
      id: `${day}-${start}`,
      subjectId,
      rawSubjectName: "NOMBRE SAC",
      day,
      start,
      end: "22:00",
      room: "",
      source: "sac",
    }) satisfies ScheduleBlock;

  it("orders by day then start and prefers the pensum name", () => {
    const days = groupScheduleByDay(
      [block(3, "18:00", "a"), block(1, "20:00", null), block(1, "08:00", "a")],
      new Map([["a", "Cálculo integral"]]),
    );
    expect(days.map((d) => d.title)).toEqual(["Lunes", "Miércoles"]);
    expect(days[0]?.entries.map((e) => e.start)).toEqual(["08:00", "20:00"]);
    expect(days[0]?.entries[1]?.name).toBe("NOMBRE SAC");
    const first = days[0]?.entries[0];
    if (first === undefined) throw new Error("entry missing");
    expect(formatScheduleEntry(first)).toBe("08:00–22:00 · Cálculo integral");
  });
});

describe("importSacCapture with the pacr42 schedule", () => {
  let db: UniplanDb;

  beforeEach(async () => {
    db = createDb(`uniplan-test-${crypto.randomUUID()}`);
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it("imports the grid blocks and the credits, ignoring the header tables", async () => {
    const run = await importSacCapture(db, capture());
    expect(run.error).toBeNull();
    const blocks = await db.scheduleBlocks.toArray();
    expect(blocks).toHaveLength(parseScheduleGrid(gridTable()).length);
    const monday = blocks.find((b) => b.day === 1);
    expect(monday?.subjectId).toBe(slugify("Cálculo integral"));
    expect(monday?.start).toBe("18:00");
    expect(monday?.room).toBe("B1-101 AULA");
    expect(await getSetting(db, "unmatchedSubjects")).toEqual([
      "ELECTIVA DEPORTIVA",
    ]);
    expect((await db.subjects.get(slugify("Cálculo integral")))?.credits).toBe(
      4,
    );
    expect(
      (await db.subjects.get(slugify("Infraestructura computacional")))
        ?.credits,
    ).toBe(3);
    expect(run.counts.created).toBe(blocks.length);
  });

  it("does not duplicate blocks on re-import and keeps a credits override", async () => {
    const id = slugify("Programación III");
    await patchSubject(db, id, { credits: 9 }, "student");
    await importSacCapture(db, capture());
    const before = await db.scheduleBlocks.count();
    const second = await importSacCapture(db, capture());
    expect(second.counts.created).toBe(0);
    expect(second.counts.updated).toBe(0);
    expect(await db.scheduleBlocks.count()).toBe(before);
    expect((await db.subjects.get(id))?.credits).toBe(9);
  });
});
