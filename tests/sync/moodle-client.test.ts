import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb, type UniplanDb } from "@/src/db/db";
import { getSetting } from "@/src/db/repo";
import { MOODLE_ORIGIN } from "@/src/domain/moodle";
import { editRecord } from "@/src/sync/merge";
import { extractGradeRows, syncMoodle } from "@/src/sync/moodle-client";

const NOW = new Date(2026, 10, 11, 20);

const GRADE_REPORT = `
<table class="generaltable user-grade"><tbody>
  <tr><th class="level1 column-itemname">RA_CALCULO INTEGRAL_02N_20262</th></tr>
  <tr class="cat_1">
    <th class="level2 item column-itemname"><span>Cuestionario</span><a class="gradeitemheader">Parcial 1 - Cálculo</a></th>
    <td class="level2 item column-weight">30,00 %</td>
    <td class="level2 item column-grade">3,9 Acciones</td>
    <td class="level2 item column-range">0–5</td>
  </tr>
  <tr class="cat_1">
    <th class="level2 item column-itemname"><a class="gradeitemheader">Taller integrales</a></th>
    <td class="level2 item column-weight">20,00 %</td>
    <td class="level2 item column-grade">-</td>
    <td class="level2 item column-range">0–5</td>
  </tr>
  <tr class="cat_1 lastrow">
    <th class="level1 baggt column-itemname">Total del curso</th>
    <td class="level1 baggt column-weight">-</td>
    <td class="level1 baggt column-grade">3,9</td>
    <td class="level1 baggt column-range">0–5</td>
  </tr>
</tbody></table>`;

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function withUrl(response: Response, url: string): Response {
  Object.defineProperty(response, "url", { value: url });
  return response;
}

function moodleFetch(options: { loggedIn?: boolean } = {}) {
  const loggedIn = options.loggedIn ?? true;
  return vi.fn(async (url: string, init?: RequestInit) => {
    const parsed = new URL(url);
    if (parsed.pathname === "/my/") {
      return loggedIn
        ? withUrl(
            new Response('<script>M.cfg = {"sesskey":"abc123"};</script>'),
            url,
          )
        : withUrl(
            new Response("<form>login</form>"),
            `${MOODLE_ORIGIN}/login/index.php`,
          );
    }
    if (parsed.pathname === "/lib/ajax/service.php") {
      const [call] = JSON.parse(String(init?.body)) as { methodname: string }[];
      if (call?.methodname.startsWith("core_course")) {
        return json([
          {
            error: false,
            data: {
              courses: [
                { id: 10, fullname: "RA_CALCULO INTEGRAL_02N_20262" },
                { id: 20, fullname: "Club de lectura" },
              ],
            },
          },
        ]);
      }
      return json([
        {
          error: false,
          data: {
            events: [
              {
                id: 1,
                name: "Vencimiento de Taller integrales",
                modulename: "assign",
                timesort: 1794805140,
                url: `${MOODLE_ORIGIN}/mod/assign/view.php?id=5`,
                course: { id: 10 },
              },
              {
                id: 2,
                name: "Vencimiento de Reseña",
                modulename: "assign",
                timesort: 1794805140,
                course: { id: 20 },
              },
            ],
          },
        },
      ]);
    }
    if (parsed.pathname === "/grade/report/user/index.php") {
      return withUrl(new Response(GRADE_REPORT), url);
    }
    return new Response("not found", { status: 404 });
  });
}

let db: UniplanDb;

beforeEach(() => {
  db = createDb(`uniplan-test-${crypto.randomUUID()}`);
});

afterEach(async () => {
  await db.delete();
});

describe("extractGradeRows", () => {
  it("reads only grade items, not categories or the course total", () => {
    expect(extractGradeRows(GRADE_REPORT)).toEqual([
      {
        name: "Parcial 1 - Cálculo",
        weight: "30,00 %",
        grade: "3,9 Acciones",
        range: "0–5",
      },
      {
        name: "Taller integrales",
        weight: "20,00 %",
        grade: "-",
        range: "0–5",
      },
    ]);
  });
});

describe("syncMoodle", () => {
  it("imports matched activities and grades and stays on Aulas Virtuales", async () => {
    const fetchImpl = moodleFetch();
    const run = await syncMoodle(db, { fetchImpl, now: NOW });
    expect(run.status).toBe("partial");
    expect(run.counts).toMatchObject({ created: 3, unmatched: 1 });

    const items = await db.items.toArray();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      source: "moodle",
      title: "Taller integrales",
      subjectId: "calculo-integral",
    });
    const grades = await db.grades.toArray();
    expect(grades.map((grade) => [grade.label, grade.score])).toEqual(
      expect.arrayContaining([
        ["Parcial 1 - Cálculo", 3.9],
        ["Taller integrales", null],
      ]),
    );
    expect(await getSetting(db, "unmatchedSubjects")).toContain(
      "Club de lectura",
    );
    for (const [url, init] of fetchImpl.mock.calls) {
      expect(String(url).startsWith(`${MOODLE_ORIGIN}/`)).toBe(true);
      expect(init?.credentials).toBe("include");
      expect(String(init?.body ?? "")).not.toMatch(/password/i);
    }

    const again = await syncMoodle(db, { fetchImpl, now: NOW });
    expect(again.counts.created).toBe(0);
    expect(await db.items.count()).toBe(1);
  });

  it("never overwrites a grade the student edited", async () => {
    const fetchImpl = moodleFetch();
    await syncMoodle(db, { fetchImpl, now: NOW });
    const taller = (await db.grades.toArray()).find(
      (grade) => grade.label === "Taller integrales",
    );
    expect(taller).toBeDefined();
    await editRecord(db, "grades", taller?.id ?? "", { score: 4.5 });
    await syncMoodle(db, { fetchImpl, now: NOW });
    expect((await db.grades.get(taller?.id ?? ""))?.score).toBe(4.5);
  });

  it("logs an auth error and keeps the data when there is no open session", async () => {
    const run = await syncMoodle(db, {
      fetchImpl: moodleFetch({ loggedIn: false }),
      now: NOW,
    });
    expect(run.status).toBe("error");
    expect(run.error ?? "").toMatch(/^auth_required/);
    expect(await db.items.count()).toBe(0);
  });
});
