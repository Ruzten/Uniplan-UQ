import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyTable,
  parseDay,
  parseScore,
  parseTime,
} from "@/src/domain/sac";
import { DEFAULT_SETTINGS } from "@/src/domain/schemas";
import { sacCaptureSchema } from "@/src/sync/messages";
import {
  captureSac,
  collectDocuments,
  extractTables,
} from "@/src/sync/sac-extract";

const FIXTURES = path.resolve("tests/fixtures/sac");

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function readCapture(name: string) {
  const raw = JSON.parse(readFileSync(path.join(FIXTURES, name), "utf8"));
  return sacCaptureSchema.parse(raw);
}

describe("extractTables", () => {
  it("reads the body table of the sample page with its headers and one row per data tr", () => {
    const html = readFileSync(path.join(FIXTURES, "sac-page.html"), "utf8");
    const doc = parseHtml(html);
    const tables = extractTables(doc);
    const body = tables.find((table) => table.headers[0] === "Asignatura");
    expect(body).toBeDefined();
    expect(body?.headers).toEqual([
      "Asignatura",
      "Grupo",
      "Nota 1",
      "Nota 2",
      "Definitiva",
    ]);
    const dataRows = doc.querySelectorAll("#notas-cuerpo tbody tr").length;
    expect(body?.rows).toHaveLength(dataRows);
    expect(body?.rows[0]).toEqual(["Cálculo integral", "01", "3,8", "4,2", ""]);
  });

  it("skips tables without data rows", () => {
    const doc = parseHtml(
      "<table><tr><th>Solo</th></tr></table><table></table>",
    );
    expect(extractTables(doc)).toEqual([]);
  });
});

describe("classifyTable", () => {
  const synonyms = DEFAULT_SETTINGS.headerSynonyms;
  const cases: [string, string][] = [
    ["grades.json", "grades"],
    ["schedule.json", "schedule"],
    ["enrollment.json", "enrollment"],
    ["unknown.json", "unknown"],
  ];
  for (const [file, kind] of cases) {
    it(`classifies every table of ${file} as ${kind}`, () => {
      const capture = readCapture(file);
      expect(capture.tables.length).toBeGreaterThan(0);
      for (const table of capture.tables) {
        expect(classifyTable(table, synonyms).kind).toBe(kind);
      }
    });
  }

  it("records the column indexes and the partial grade columns", () => {
    const [table] = readCapture("grades.json").tables;
    expect(table).toBeDefined();
    if (table === undefined) return;
    const { columns } = classifyTable(table, synonyms);
    expect(columns.subjectName).toBe(0);
    expect(columns.group).toBe(1);
    expect(columns.partials).toEqual([2, 3]);
    expect(columns.finalGrade).toBe(4);
  });
});

describe("collectDocuments", () => {
  it("skips a frame whose contentDocument throws and keeps the others", () => {
    const root = parseHtml(
      "<table><tr><th>Asignatura</th></tr><tr><td>Raíz</td></tr></table><iframe></iframe><iframe></iframe>",
    );
    const inner = parseHtml(
      "<table><tr><th>Materia</th></tr><tr><td>Interna</td></tr></table>",
    );
    const [broken, working] = Array.from(root.querySelectorAll("iframe"));
    if (broken === undefined || working === undefined) {
      throw new Error("frames missing");
    }
    Object.defineProperty(broken, "contentDocument", {
      get() {
        throw new DOMException("Blocked", "SecurityError");
      },
    });
    Object.defineProperty(working, "contentDocument", { get: () => inner });

    const documents = collectDocuments(root);
    expect(documents).toEqual([root, inner]);

    const capture = captureSac(root, new Date(2026, 10, 10, 18));
    expect(capture.tables.map((table) => table.headers[0])).toEqual([
      "Asignatura",
      "Materia",
    ]);
  });
});

describe("parsers", () => {
  it("parses scores with a decimal comma and rejects empty text", () => {
    expect(parseScore("3,8")).toBe(3.8);
    expect(parseScore("4.5")).toBe(4.5);
    expect(parseScore("")).toBeNull();
    expect(parseScore("N/A")).toBeNull();
  });

  it("parses day names and three-letter prefixes", () => {
    expect(parseDay("Lunes")).toBe(1);
    expect(parseDay("Miércoles")).toBe(3);
    expect(parseDay("SAB")).toBe(6);
    expect(parseDay("feriado")).toBeNull();
  });

  it("parses times with optional am/pm", () => {
    expect(parseTime("8:00")).toBe("08:00");
    expect(parseTime("18:30")).toBe("18:30");
    expect(parseTime("6:00 pm")).toBe("18:00");
    expect(parseTime("12:15 am")).toBe("00:15");
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("tarde")).toBeNull();
  });
});
