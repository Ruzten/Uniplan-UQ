import { describe, expect, it } from "vitest";
import { PENSUM_SEED_TEXT } from "@/src/data/pensum.seed";
import { matchCourse } from "@/src/domain/classroom";
import {
  isMoodleLoginUrl,
  MOODLE_ORIGIN,
  mapMoodleEvent,
  mapMoodleGradeRow,
  moodleEventTitle,
  moodleNumber,
  moodleRangeMax,
  sesskeyFromHtml,
  shouldAutoSync,
} from "@/src/domain/moodle";
import { parsePensumSeed } from "@/src/domain/pensum";

describe("session helpers", () => {
  it("reads the sesskey and spots the login page", () => {
    expect(sesskeyFromHtml('M.cfg = {"wwwroot":"x","sesskey":"Ab12Cd"};')).toBe(
      "Ab12Cd",
    );
    expect(sesskeyFromHtml("<html></html>")).toBeNull();
    expect(isMoodleLoginUrl(`${MOODLE_ORIGIN}/login/index.php`)).toBe(true);
    expect(isMoodleLoginUrl(`${MOODLE_ORIGIN}/my/`)).toBe(false);
  });
});

describe("mapMoodleEvent", () => {
  it("turns a due event into a dated agenda item", () => {
    const item = mapMoodleEvent(
      {
        id: 700001,
        name: "Vencimiento de PROYECTO FINAL",
        modulename: "assign",
        timesort: 1794805140,
        url: `${MOODLE_ORIGIN}/mod/assign/view.php?id=800001`,
        course: { id: 51001 },
      },
      "programacion-iii",
    );
    expect(item).toMatchObject({
      externalId: "md|51001|700001",
      title: "PROYECTO FINAL",
      type: "tarea",
      subjectId: "programacion-iii",
      dueAt: new Date(1794805140 * 1000).toISOString(),
      done: false,
    });
    expect(item.links).toHaveLength(1);
  });

  it("calls parcial only what says parcial and drops foreign links", () => {
    const base = { id: 1, timesort: 0, course: { id: 2 } };
    expect(
      mapMoodleEvent(
        { ...base, name: "Parcial 2 cierra", modulename: "quiz" },
        null,
      ).type,
    ).toBe("parcial");
    expect(
      mapMoodleEvent({ ...base, name: "Quiz 1", modulename: "quiz" }, null)
        .type,
    ).toBe("quiz");
    expect(
      mapMoodleEvent(
        { ...base, name: "Taller", url: "https://evil.example/x" },
        null,
      ).links,
    ).toEqual([]);
    expect(moodleEventTitle("Taller 3 vence")).toBe("Taller 3");
  });
});

describe("grade report rows", () => {
  it("parses Colombian decimals, ranges and pending grades", () => {
    expect(moodleNumber("4,8 Acciones Análisis de calificaciones")).toBe(4.8);
    expect(moodleNumber("-")).toBeNull();
    expect(moodleRangeMax("0–5")).toBe(5);
    expect(moodleRangeMax("0,00-100,00")).toBe(100);
    expect(moodleRangeMax("")).toBeNull();
  });

  it("maps graded and pending rows with their weight", () => {
    expect(
      mapMoodleGradeRow(
        {
          name: "Parcial 1 - Infraestructura Computacional",
          weight: "100,00 %",
          grade: "4,8 Acciones",
          range: "0–5",
        },
        51002,
        "infraestructura-computacional",
      ),
    ).toEqual({
      externalId: "mdg|51002|parcial-1-infraestructura-computacional",
      subjectId: "infraestructura-computacional",
      label: "Parcial 1 - Infraestructura Computacional",
      score: 4.8,
      maxScore: 5,
      weightPct: 100,
    });
    expect(
      mapMoodleGradeRow(
        { name: "Taller", weight: "-", grade: "-", range: "0–5" },
        1,
        "x",
      ),
    ).toMatchObject({ score: null, weightPct: null });
    expect(
      mapMoodleGradeRow(
        { name: "", weight: "", grade: "", range: "0–5" },
        1,
        "x",
      ),
    ).toBeNull();
  });
});

describe("Moodle course names", () => {
  const subjects = parsePensumSeed(PENSUM_SEED_TEXT);
  const cases: [string, string][] = [
    [
      "RA_INFRAESTRUCTURA COMPUTACIONAL_01N_20262",
      "infraestructura-computacional",
    ],
    ["RA_PROGRAMACIÓN III_02N_20262", "programacion-iii"],
    ["RA_SISTEMA DE INFORMACIÓN_01N_20262", "sistemas-de-informacion"],
    ["RA_CALCULO INTEGRAL_02N_20262", "calculo-integral"],
  ];
  for (const [name, id] of cases) {
    it(`${name} → ${id}`, () => {
      expect(matchCourse(name, subjects, {})?.id).toBe(id);
    });
  }
});

describe("shouldAutoSync", () => {
  const now = new Date(2026, 10, 11, 20);
  it("runs when enabled and the last run is at least an hour old", () => {
    expect(shouldAutoSync(true, null, now)).toBe(false);
    expect(
      shouldAutoSync(true, new Date(2026, 10, 11, 18, 59).toISOString(), now),
    ).toBe(true);
    expect(
      shouldAutoSync(true, new Date(2026, 10, 11, 19, 30).toISOString(), now),
    ).toBe(false);
    expect(shouldAutoSync(false, null, now)).toBe(false);
  });
});
