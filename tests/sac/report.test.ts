import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeSacUrl } from "@/src/domain/sac";
import { parseSacReport, splitReportTokens } from "@/src/domain/sac-report";
import { sacCaptureSchema } from "@/src/sync/messages";
import {
  captureSac,
  extractTables,
  extractTexts,
} from "@/src/sync/sac-extract";

const REPORT_HTML = readFileSync(
  path.resolve("tests/fixtures/sac/notr62-report.html"),
  "utf8",
);

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

const BLOCK = [
  "Cod.",
  "Curso",
  "Sección",
  "1",
  "Parcial 1",
  "2",
  "Seguimiento",
  "Inasistencia",
  "Definitiva",
  "70101",
  "CÁLCULO INTEGRAL",
  "01N",
  "3.4",
  "3.4 - (50%)",
  "0",
  "0 - (50%)",
  "1.70",
  "99001",
];

describe("parseSacReport", () => {
  it("reads one block with its labels, weights and final grade", () => {
    expect(parseSacReport(BLOCK)).toEqual([
      {
        code: "70101",
        name: "CÁLCULO INTEGRAL",
        section: "01N",
        components: [
          { label: "Parcial 1", score: 3.4, weightPct: 50 },
          { label: "Seguimiento", score: 0, weightPct: 50 },
        ],
        final: 1.7,
      },
    ]);
  });

  it("accepts a header merged into one text node", () => {
    const merged = [
      "Cod. Curso Sección 1 Parcial 1 2 Seguimiento Inasistencia Definitiva",
      ...BLOCK.slice(9),
    ];
    expect(parseSacReport(merged)).toEqual(parseSacReport(BLOCK));
  });

  it("accepts header words split or merged differently and in any case", () => {
    const split = [
      "COD.",
      "curso sección",
      "1 Parcial 1",
      "2 Seguimiento",
      "Inasistencia Definitiva",
      ...BLOCK.slice(9),
    ];
    expect(parseSacReport(split)).toEqual(parseSacReport(BLOCK));
  });

  it("accepts labels without index numbers and comma decimals", () => {
    const texts = [
      "Cod. Curso Seccion",
      "Quiz",
      "Taller",
      "Definitiva",
      "70105",
      "ÁLGEBRA LINEAL",
      "03N",
      "4,5 - (40%)",
      "3,0 - (60%)",
      "3,60",
    ];
    const [block] = parseSacReport(texts);
    expect(block?.components).toEqual([
      { label: "Quiz", score: 4.5, weightPct: 40 },
      { label: "Taller", score: 3, weightPct: 60 },
    ]);
    expect(block?.final).toBe(3.6);
  });

  it("splits merged score tokens and ignores the bare duplicate", () => {
    const texts = [...BLOCK.slice(0, 12), "3.4 3.4 - (50%)", "0 0 - (50%)"];
    const [block] = parseSacReport(texts);
    expect(block?.components.map((c) => c.score)).toEqual([3.4, 0]);
  });

  it("does not take an id above the scale maximum as the final grade", () => {
    const texts = [...BLOCK.slice(0, 16), "99001"];
    expect(parseSacReport(texts)[0]?.final).toBeNull();
  });

  it("ignores a final grade when the header has no Definitiva column", () => {
    const texts = [
      "Cod.",
      "Curso",
      "Sección",
      "1",
      "Corte",
      "70106",
      "FÍSICA",
      "01N",
      "4 - (100%)",
      "Pág. 1 de 2",
      "2.50",
    ];
    expect(parseSacReport(texts)[0]?.final).toBeNull();
  });

  it("merges a subject split over two blocks by code", () => {
    const texts = [
      "Cod.",
      "Curso",
      "Sección",
      "1",
      "PROYECTO",
      "70102",
      "INFRAESTRUCTURA COMPUTACIONAL",
      "02N",
      "2.8",
      "2.8 - (100%)",
      "Cod.",
      "Curso",
      "Sección",
      "Inasistencia",
      "Definitiva",
      "70102",
      "INFRAESTRUCTURA COMPUTACIONAL",
      "02N",
      "2.80",
      "99002",
    ];
    expect(parseSacReport(texts)).toEqual([
      {
        code: "70102",
        name: "INFRAESTRUCTURA COMPUTACIONAL",
        section: "02N",
        components: [{ label: "PROYECTO", score: 2.8, weightPct: 100 }],
        final: 2.8,
      },
    ]);
  });

  it("skips unparseable blocks without throwing", () => {
    const texts = [
      "Cod. Alumno",
      "Cod. Curso Sección",
      "texto suelto",
      "Cod. Curso Sección",
      "1",
      "Nota",
      "70107",
      "QUÍMICA",
      "01N",
      "9 - (50%)",
      "4 - (50%)",
    ];
    const blocks = parseSacReport(texts);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.components).toEqual([
      { label: "Nota 2", score: 4, weightPct: 50 },
    ]);
    expect(parseSacReport([])).toEqual([]);
    expect(parseSacReport(["Cod. Curso Sección"])).toEqual([]);
  });

  it("splits component tokens out of merged text", () => {
    expect(splitReportTokens(["  01N 3.4   - ( 25 % ) fin "])).toEqual([
      "01N",
      "3.4 - ( 25 % )",
      "fin",
    ]);
  });
});

describe("report fixture", () => {
  it("extracts the visible report subjects from the synthetic notr62 page", () => {
    const doc = parseHtml(REPORT_HTML);
    expect(extractTables(doc)).toEqual([]);
    const blocks = parseSacReport(extractTexts(doc));
    expect(blocks.map((block) => block.code)).toEqual([
      "70101",
      "70102",
      "70103",
      "70104",
    ]);
    const infra = blocks.find((block) => block.code === "70102");
    expect(infra?.components.map((c) => c.label)).toEqual([
      "PARCIAL 1",
      "PROYECTO",
      "PARTE PRACTICA",
    ]);
    expect(infra?.final).toBe(2.81);
    const calculo = blocks.find((block) => block.code === "70101");
    expect(calculo?.components).toEqual([
      { label: "Parcial 1", score: 3.4, weightPct: 25 },
      { label: "Parcial 2", score: 0, weightPct: 25 },
      { label: "Parcial 3", score: 0, weightPct: 25 },
      { label: "Seguimiento", score: 4, weightPct: 25 },
    ]);
    expect(calculo?.final).toBe(1.85);
  });
});

describe("extractTexts and captureSac", () => {
  it("lists text nodes in DOM order and skips script, style and noscript", () => {
    const doc = parseHtml(
      "<div> Uno <span>dos\n  tres</span></div><script>x()</script><style>p{}</style><noscript>no</noscript><p>&nbsp;</p><p>cuatro</p>",
    );
    expect(extractTexts(doc)).toEqual(["Uno", "dos tres", "cuatro"]);
  });

  it("captures texts and a sanitised url", () => {
    const doc = parseHtml(REPORT_HTML);
    Object.defineProperty(doc, "URL", {
      value:
        "https://sac.uniquindio.edu.co/sgacampus/services/parf20/report/export/notr62;jsessionid=ABC123?x=1#top",
    });
    const capture = captureSac(doc, new Date(2026, 10, 11, 12));
    expect(capture.url).toBe(
      "https://sac.uniquindio.edu.co/sgacampus/services/parf20/report/export/notr62",
    );
    expect(capture.texts).toContain("CÁLCULO INTEGRAL");
    expect(capture.texts.join(" ")).not.toContain("reportViewer");
  });

  it("defaults texts to an empty list for older captures", () => {
    const parsed = sacCaptureSchema.parse({
      url: "u",
      title: "t",
      capturedAt: "c",
      tables: [],
    });
    expect(parsed.texts).toEqual([]);
  });
});

describe("sanitizeSacUrl", () => {
  it("drops the session path parameter, the query and the hash", () => {
    expect(
      sanitizeSacUrl(
        "https://sac.uniquindio.edu.co/sgacampus/a;JSESSIONID=x.y-z/b?token=1#h",
      ),
    ).toBe("https://sac.uniquindio.edu.co/sgacampus/a/b");
    expect(
      sanitizeSacUrl("https://sac.uniquindio.edu.co/sgacampus/notas"),
    ).toBe("https://sac.uniquindio.edu.co/sgacampus/notas");
  });
});
