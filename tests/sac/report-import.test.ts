import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDb, type UniplanDb } from "@/src/db/db";
import { getSetting } from "@/src/db/repo";
import { slugify } from "@/src/domain/text";
import { editRecord, patchSubject, removeRecord } from "@/src/sync/merge";
import type { SacCapture } from "@/src/sync/messages";
import { captureSac } from "@/src/sync/sac-extract";
import { importSacCapture } from "@/src/sync/sac-import";

function reportCapture(): SacCapture {
  const html = readFileSync(
    path.resolve("tests/fixtures/sac/notr62-report.html"),
    "utf8",
  );
  const doc = new DOMParser().parseFromString(html, "text/html");
  return captureSac(doc, new Date(2026, 10, 11, 12));
}

// Simulates the professor posting Cálculo integral's Parcial 2: the first
// "0 - (25%)" token of the fixture (and its bare duplicate) gets a score.
function withCalculoParcial2(capture: SacCapture, score: string): SacCapture {
  const texts = [...capture.texts];
  const index = texts.indexOf("0 - (25%)");
  texts[index] = `${score} - (25%)`;
  texts[index - 1] = score;
  return { ...capture, texts };
}

let db: UniplanDb;

beforeEach(async () => {
  db = createDb(`uniplan-test-${crypto.randomUUID()}`);
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe("importSacCapture with the notr62 report", () => {
  it("imports every component with its weight and zero scores as pending", async () => {
    const run = await importSacCapture(db, reportCapture());
    expect(run.error).toBeNull();
    expect(run.counts.unmatched).toBe(1);
    expect(await getSetting(db, "unmatchedSubjects")).toContain(
      "ELECTIVA DEPORTIVA",
    );
    const grades = await db.grades.toArray();
    expect(grades.every((grade) => grade.source === "sac")).toBe(true);
    expect(grades.every((grade) => grade.score !== 0)).toBe(true);
    const calculo = grades.filter(
      (grade) => grade.subjectId === slugify("Cálculo integral"),
    );
    expect(
      calculo
        .map((g) => [g.label, g.score, g.weightPct])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    ).toEqual([
      ["Parcial 1", 3.4, 25],
      ["Parcial 2", null, 25],
      ["Parcial 3", null, 25],
      ["Seguimiento", 4, 25],
    ]);
    const parcial = calculo.find((g) => g.label === "Parcial 1");
    expect(parcial?.externalId).toBe("sac|report|70101|parcial 1");
    const proyecto = grades.find((g) => g.label === "PROYECTO");
    expect(proyecto?.score).toBeNull();
    expect(proyecto?.weightPct).toBe(30);
    expect(run.counts.created).toBe(grades.length);
  });

  it("fills a pending grade in when a later report brings its score", async () => {
    const capture = reportCapture();
    await importSacCapture(db, capture);
    const count = await db.grades.count();
    const later = withCalculoParcial2(capture, "3.1");
    const run = await importSacCapture(db, later);
    expect(run.counts.created).toBe(0);
    expect(run.counts.updated).toBe(1);
    expect(await db.grades.count()).toBe(count);
    const parcial2 = (await db.grades.toArray()).find(
      (g) => g.externalId === "sac|report|70101|parcial 2",
    );
    expect(parcial2?.score).toBe(3.1);
  });

  it("keeps a score the student typed on a pending grade", async () => {
    const capture = reportCapture();
    await importSacCapture(db, capture);
    const pending = (await db.grades.toArray()).find(
      (g) => g.externalId === "sac|report|70101|parcial 2",
    );
    if (pending === undefined) throw new Error("pending grade missing");
    await editRecord(db, "grades", pending.id, { score: 0 });

    await importSacCapture(db, capture);
    expect((await db.grades.get(pending.id))?.score).toBe(0);
    await importSacCapture(db, withCalculoParcial2(capture, "3.1"));
    expect((await db.grades.get(pending.id))?.score).toBe(0);
  });

  it("stores a positive Definitiva as the subject final grade", async () => {
    await importSacCapture(db, reportCapture());
    const infra = await db.subjects.get(
      slugify("Infraestructura computacional"),
    );
    expect(infra?.finalGrade).toBe(2.81);
  });

  it("is idempotent when the same report is imported again", async () => {
    const capture = reportCapture();
    await importSacCapture(db, capture);
    const before = await db.grades.toArray();
    const second = await importSacCapture(db, capture);
    expect(second.counts.created).toBe(0);
    expect(second.counts.updated).toBe(0);
    expect(await db.grades.count()).toBe(before.length);
  });

  it("keeps student overrides, tombstones and a student final grade", async () => {
    const capture = reportCapture();
    await importSacCapture(db, capture);
    const grades = await db.grades.toArray();
    const edited = grades.find(
      (g) => g.externalId === "sac|report|70101|parcial 1",
    );
    const removed = grades.find(
      (g) => g.externalId === "sac|report|70101|seguimiento",
    );
    if (edited === undefined || removed === undefined) {
      throw new Error("expected grades missing");
    }
    await editRecord(db, "grades", edited.id, { score: 4.9 });
    await removeRecord(db, "grades", removed.id);
    const programacion = slugify("Programación III");
    await patchSubject(db, programacion, { finalGrade: 4.1 }, "student");

    await importSacCapture(db, capture);

    expect((await db.grades.get(edited.id))?.score).toBe(4.9);
    expect((await db.grades.get(removed.id))?.hidden).toBe(true);
    expect((await db.subjects.get(programacion))?.finalGrade).toBe(4.1);
    expect(await db.grades.count()).toBe(grades.length);
  });
});
