import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";
import { createDb, type UniplanDb } from "@/src/db/db";
import {
  addManualGrade,
  addManualItem,
  getSetting,
  setSetting,
} from "@/src/db/repo";
import {
  actaLinks,
  type CourseWork,
  mapCourseWork,
  mapSubmissionGrade,
} from "@/src/domain/classroom";
import type { Item } from "@/src/domain/schemas";
import { slugify } from "@/src/domain/text";
import {
  CLASSROOM_API,
  listAll,
  syncClassroom,
  TOKEN_KEY,
} from "@/src/sync/classroom-client";

const FIXTURES = path.resolve("tests/fixtures/classroom");

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8"));
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fixtureFetch() {
  return vi.fn(async (url: string) => {
    const parsed = new URL(url);
    const route = parsed.pathname;
    if (route === "/v1/courses") {
      return json(
        fixture(
          parsed.searchParams.get("pageToken") === "page-2"
            ? "courses.page2.json"
            : "courses.page1.json",
        ),
      );
    }
    if (route === "/v1/courses/1001/courseWork") {
      return json(fixture("coursework.1001.json"));
    }
    if (route === "/v1/courses/1001/courseWork/-/studentSubmissions") {
      return json(fixture("submissions.1001.json"));
    }
    if (route === "/v1/courses/1001/courseWorkMaterials") {
      return json(fixture("materials.1001.json"));
    }
    return json({});
  });
}

function work(overrides: Partial<CourseWork> = {}): CourseWork {
  return { courseId: "1", id: "w", title: "Taller", ...overrides };
}

let db: UniplanDb;

beforeEach(async () => {
  fakeBrowser.reset();
  db = createDb(`uniplan-test-${crypto.randomUUID()}`);
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe("listAll", () => {
  it("follows nextPageToken and returns both pages in order", async () => {
    const fetchImpl = fixtureFetch();
    const courses = (await listAll(
      "/v1/courses?courseStates=ACTIVE&studentId=me",
      "courses",
      "token",
      fetchImpl,
    )) as { id: string }[];
    expect(courses.map((course) => course.id)).toEqual([
      "1001",
      "1002",
      "1003",
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const second = new URL(String(fetchImpl.mock.calls[1]?.[0]));
    expect(second.searchParams.get("pageToken")).toBe("page-2");
    expect(second.searchParams.get("studentId")).toBe("me");
  });

  it("treats a response without the list key as an empty list", async () => {
    const fetchImpl = vi.fn(async () => json({}));
    expect(
      await listAll("/v1/courses/9/courseWork", "courseWork", "t", fetchImpl),
    ).toEqual([]);
  });
});

describe("mapping", () => {
  it("builds dueAt in UTC and leaves it null without a dueDate", () => {
    const dated = mapCourseWork(
      work({
        dueDate: { year: 2026, month: 11, day: 20 },
        dueTime: { hours: 23, minutes: 59 },
      }),
      null,
    );
    expect(dated.dueAt).toBe("2026-11-20T23:59:00.000Z");
    expect(mapCourseWork(work(), null).dueAt).toBeNull();
    const noTime = mapCourseWork(
      work({ dueDate: { year: 2026, month: 1, day: 5 } }),
      null,
    );
    expect(noTime.dueAt).toBe("2026-01-05T23:59:00.000Z");
    const partialTime = mapCourseWork(
      work({
        dueDate: { year: 2026, month: 1, day: 5 },
        dueTime: { hours: 1 },
      }),
      null,
    );
    expect(partialTime.dueAt).toBe("2026-01-05T01:00:00.000Z");
  });

  it("calls parcial only what the title says is a parcial", () => {
    expect(mapCourseWork(work({ title: "Parcial 2" }), null).type).toBe(
      "parcial",
    );
    expect(
      mapCourseWork(
        work({ title: "Entrega", description: "Examen final" }),
        null,
      ).type,
    ).toBe("tarea");
    expect(
      mapCourseWork(work({ title: "Actividad Calificable." }), null).type,
    ).toBe("tarea");
    expect(mapCourseWork(work({ title: "Notas Parcial 1" }), null).type).toBe(
      "parcial",
    );
    expect(mapCourseWork(work({ title: "Quiz 3" }), null).type).toBe("quiz");
    expect(mapCourseWork(work({ title: "Taller de listas" }), null).type).toBe(
      "tarea",
    );
  });

  it("maps a graded submission and ignores ungraded ones", () => {
    const graded = mapSubmissionGrade(
      { courseId: "1", courseWorkId: "w", id: "s", draftGrade: 40 },
      work({ maxPoints: 50 }),
      "subj",
    );
    expect(graded).toMatchObject({
      score: 40,
      maxScore: 50,
      externalId: "sub|1|w",
    });
    expect(
      mapSubmissionGrade(
        { courseId: "1", courseWorkId: "w", id: "s" },
        work({ maxPoints: 50 }),
        "x",
      ),
    ).toBeNull();
    expect(
      mapSubmissionGrade(
        { courseId: "1", courseWorkId: "w", id: "s", assignedGrade: 3 },
        work(),
        "x",
      ),
    ).toBeNull();
  });
});

describe("syncClassroom", () => {
  it("creates the items and grades from the recorded responses and stays on the API host", async () => {
    const fetchImpl = fixtureFetch();
    const run = await syncClassroom(db, { fetchImpl, token: "test-token" });
    expect(run.counts.created).toBe(5);
    expect(run.counts.unmatched).toBe(1);
    const items = await db.items.toArray();
    const grades = await db.grades.toArray();
    expect(items).toHaveLength(3);
    expect(grades).toHaveLength(2);
    expect(items.every((item) => item.source === "classroom")).toBe(true);
    expect(grades.every((grade) => grade.source === "classroom")).toBe(true);
    expect(items.some((item) => item.isActa)).toBe(false);
    expect(await getSetting(db, "unmatchedSubjects")).toContain(
      "Semillero de robótica",
    );
    for (const [url] of fetchImpl.mock.calls) {
      expect(String(url).startsWith(`${CLASSROOM_API}/`)).toBe(true);
      expect(String(url)).not.toContain("courseWorkMaterials");
    }

    const again = await syncClassroom(db, { fetchImpl, token: "test-token" });
    expect(again.counts.created).toBe(0);
    expect(await db.items.count()).toBe(3);
  });

  it("logs an error run, clears the token and keeps the data on 401", async () => {
    await fakeBrowser.storage.session.set({
      [TOKEN_KEY]: { accessToken: "old", expiresAt: Date.now() + 3_600_000 },
    });
    const subjectId = slugify("Programación III");
    await addManualItem(db, { title: "Pendiente", subjectId });
    await addManualGrade(db, {
      subjectId,
      label: "Taller",
      score: 4,
      maxScore: 5,
    });
    const fetchImpl = vi.fn(async () => json({ error: "unauthorized" }, 401));

    const run = await syncClassroom(db, { fetchImpl, token: "old" });
    expect(run.status).toBe("error");
    const [stored] = await db.syncRuns.toArray();
    expect(stored?.status).toBe("error");
    expect(
      (await fakeBrowser.storage.session.get(TOKEN_KEY))[TOKEN_KEY],
    ).toBeUndefined();
    expect(await db.items.count()).toBe(1);
    expect(await db.grades.count()).toBe(1);
  });

  it("fails with auth_required when there is no client id or token", async () => {
    const run = await syncClassroom(db, { fetchImpl: fixtureFetch() });
    expect(run.status).toBe("error");
    expect(run.error?.startsWith("auth_required")).toBe(true);
  });
});

describe("actaLinks", () => {
  function item(overrides: Partial<Item>): Item {
    return {
      id: crypto.randomUUID(),
      type: "otro",
      title: "Material",
      subjectId: "a",
      dueAt: null,
      weightPct: null,
      notes: "",
      done: false,
      links: [
        { title: "Abrir en Classroom", url: "https://classroom.google.com/x" },
      ],
      isActa: false,
      source: "classroom",
      externalId: null,
      overrides: [],
      hidden: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      ...overrides,
    };
  }

  it("returns only visible acta links of the subject", () => {
    const visible = item({
      isActa: true,
      links: [{ title: "acta.pdf", url: "https://drive.google.com/acta" }],
    });
    const hidden = item({ isActa: true, hidden: true });
    const plain = item({});
    const items = [visible, hidden, plain];
    expect(actaLinks(items, "a")).toEqual(visible.links);
    expect(actaLinks(items, "b")).toEqual([]);
  });
});

describe("syncClassroom unmatched list", () => {
  it("drops courses that now match and keeps the ones that still do not", async () => {
    await setSetting(db, "unmatchedSubjects", ["Cálculo integral", "Otro"]);
    await syncClassroom(db, { fetchImpl: fixtureFetch(), token: "test-token" });
    const stored = await getSetting(db, "unmatchedSubjects");
    expect(stored).not.toContain("Cálculo integral");
    expect(stored).toContain("Otro");
    expect(stored).toContain("Semillero de robótica");
  });
});
