import { parseScore } from "@/src/domain/sac";
import { normalizeText } from "@/src/domain/text";

// Parser for the SAC "Notas registradas" report export (notr62). The page is
// not made of data tables: it is a stream of positioned text elements. Each
// subject is a block: a header ("Cod.", "Curso", "Sección", then an index and
// a free-text label per component, then optionally "Inasistencia" and/or
// "Definitiva") followed by one data run (code, name, section, per component a
// bare score and a "score - (weight%)" token, optionally the final grade and an
// unrelated id). The parser works on the captured text nodes and tolerates
// merged or split nodes.

export type SacReportComponent = {
  label: string;
  score: number;
  weightPct: number;
};

export type SacReportBlock = {
  code: string;
  name: string;
  section: string;
  components: SacReportComponent[];
  final: number | null;
};

const COMPONENT_SOURCE = String.raw`(\d+(?:[.,]\d+)?)\s*-\s*\(\s*(\d+(?:[.,]\d+)?)\s*%\s*\)`;
const COMPONENT_TOKEN = new RegExp(String.raw`^\s*${COMPONENT_SOURCE}\s*$`);
const COMPONENT_ANY = new RegExp(COMPONENT_SOURCE, "g");
const HEADER_WORDS: readonly RegExp[] = [
  /^cod(?:igo)?$/,
  /^curso$/,
  /^secc?(?:ion)?$/,
];
const DEFINITIVA = /^definitiva$/;
const INASISTENCIA = /^(?:inasistencias?|fallas)$/;
const PRE_PATTERN = /^(\d+)\s+(.+?)(?:\s+(\d{1,3}[A-Za-z]{0,3}))?$/;

type ParsedComponent = { score: number; weightPct: number };

type HeaderState = {
  labels: string[];
  current: string | null;
  expected: number;
  sawIndex: boolean;
  hasDefinitiva: boolean;
};

function wordKey(word: string): string {
  return normalizeText(word).replace(/\./g, "");
}

function parseComponent(token: string | undefined): ParsedComponent | null {
  if (token === undefined) {
    return null;
  }
  const match = COMPONENT_TOKEN.exec(token);
  if (match === null) {
    return null;
  }
  const score = parseScore(match[1] ?? "");
  const weightPct = parseScore(match[2] ?? "");
  if (score === null || weightPct === null) {
    return null;
  }
  return { score, weightPct };
}

export function splitReportTokens(texts: readonly string[]): string[] {
  const tokens: string[] = [];
  for (const raw of texts) {
    const text = raw.replace(/\s+/g, " ").trim();
    let last = 0;
    for (const match of text.matchAll(COMPONENT_ANY)) {
      const start = match.index ?? 0;
      const before = text.slice(last, start).trim();
      if (before !== "") {
        tokens.push(before);
      }
      tokens.push(match[0].trim());
      last = start + match[0].length;
    }
    const rest = text.slice(last).trim();
    if (rest !== "") {
      tokens.push(rest);
    }
  }
  return tokens;
}

type HeaderMatch = { end: number; remainder: string };

// Returns the number of header words matched and the leftover text, or null
// when a word contradicts the "Cod. Curso Sección" sequence.
function matchHeaderWords(
  text: string,
): { matched: number; remainder: string } | null {
  const words = text.split(" ").filter((word) => word !== "");
  let matched = 0;
  let index = 0;
  for (; index < words.length && matched < HEADER_WORDS.length; index += 1) {
    const key = wordKey(words[index] ?? "");
    if (key === "") {
      continue;
    }
    if (!HEADER_WORDS[matched]?.test(key)) {
      return null;
    }
    matched += 1;
  }
  return { matched, remainder: words.slice(index).join(" ") };
}

function matchHeaderAt(tokens: string[], start: number): HeaderMatch | null {
  const parts: string[] = [];
  for (let offset = 0; offset < HEADER_WORDS.length; offset += 1) {
    const token = tokens[start + offset];
    if (token === undefined) {
      return null;
    }
    parts.push(token);
    const result = matchHeaderWords(parts.join(" "));
    if (result === null || result.matched === 0) {
      return null;
    }
    if (result.matched === HEADER_WORDS.length) {
      return { end: start + offset + 1, remainder: result.remainder };
    }
  }
  return null;
}

function flushLabel(state: HeaderState): void {
  if (state.current !== null && state.current !== "") {
    state.labels.push(state.current);
  }
}

function feedHeader(state: HeaderState, token: string): void {
  const words = token.split(" ").filter((word) => word !== "");
  const isFlag = (word: string | undefined): boolean => {
    const key = wordKey(word ?? "");
    if (DEFINITIVA.test(key)) {
      state.hasDefinitiva = true;
      return true;
    }
    return INASISTENCIA.test(key);
  };
  while (words.length > 0 && isFlag(words[words.length - 1])) {
    words.pop();
  }
  while (words.length > 0 && isFlag(words[0])) {
    words.shift();
  }
  if (words.length === 0) {
    return;
  }
  if (words[0] === String(state.expected)) {
    for (const word of words) {
      if (word === String(state.expected) && state.current !== "") {
        flushLabel(state);
        state.current = "";
        state.expected += 1;
        state.sawIndex = true;
      } else {
        state.current = state.current ? `${state.current} ${word}` : word;
      }
    }
    return;
  }
  const text = words.join(" ");
  if (state.sawIndex && state.current !== null) {
    state.current = state.current ? `${state.current} ${text}` : text;
  } else {
    state.labels.push(text);
  }
}

function isDataStart(token: string, expected: number): boolean {
  if (COMPONENT_TOKEN.test(token)) {
    return true;
  }
  const first = token.split(" ")[0] ?? "";
  return /^\d+$/.test(first) && first !== String(expected);
}

function isPreStop(token: string, next: string | undefined): boolean {
  if (COMPONENT_TOKEN.test(token)) {
    return true;
  }
  if (/^\d+[.,]\d+$/.test(token) || /^\d{4,}$/.test(token)) {
    return true;
  }
  return parseScore(token) !== null && parseComponent(next) !== null;
}

function pickFinal(
  data: string[],
  from: number,
  scaleMax: number,
): number | null {
  const candidates: { value: number; twoDecimals: boolean }[] = [];
  for (let index = from; index < Math.min(data.length, from + 3); index += 1) {
    const token = data[index] ?? "";
    const value = parseScore(token);
    if (value === null) {
      break;
    }
    if (value >= 0 && value <= scaleMax) {
      candidates.push({ value, twoDecimals: /[.,]\d{2}$/.test(token) });
    }
  }
  const preferred = candidates.find((candidate) => candidate.twoDecimals);
  return (preferred ?? candidates[candidates.length - 1])?.value ?? null;
}

function uniqueLabel(label: string, used: Set<string>): string {
  let candidate = label;
  for (let n = 2; used.has(normalizeText(candidate)); n += 1) {
    candidate = `${label} (${n})`;
  }
  used.add(normalizeText(candidate));
  return candidate;
}

function parseBlock(
  body: string[],
  remainder: string,
  scaleMax: number,
): SacReportBlock | null {
  const state: HeaderState = {
    labels: [],
    current: null,
    expected: 1,
    sawIndex: false,
    hasDefinitiva: false,
  };
  if (remainder !== "") {
    feedHeader(state, remainder);
  }
  let start = 0;
  while (
    start < body.length &&
    !isDataStart(body[start] ?? "", state.expected)
  ) {
    feedHeader(state, body[start] ?? "");
    start += 1;
  }
  flushLabel(state);
  const data = body.slice(start);

  const pre: string[] = [];
  let index = 0;
  while (index < data.length) {
    const token = data[index] ?? "";
    if (index > 0 && isPreStop(token, data[index + 1])) {
      break;
    }
    pre.push(token);
    index += 1;
  }
  const head = PRE_PATTERN.exec(pre.join(" "));
  const code = head?.[1];
  const name = head?.[2]?.trim();
  if (code === undefined || name === undefined || !/\p{L}/u.test(name)) {
    return null;
  }

  const parsed: ParsedComponent[] = [];
  while (index < data.length) {
    const token = data[index] ?? "";
    const component = parseComponent(token);
    if (component !== null) {
      parsed.push(component);
      index += 1;
      continue;
    }
    const bare = parseScore(token);
    const next = parseComponent(data[index + 1]);
    if (bare !== null && next !== null && next.score === bare) {
      index += 1;
      continue;
    }
    break;
  }

  const used = new Set<string>();
  const components: SacReportComponent[] = [];
  parsed.forEach((component, position) => {
    const valid =
      component.score >= 0 &&
      component.score <= scaleMax &&
      component.weightPct > 0 &&
      component.weightPct <= 100;
    if (!valid) {
      return;
    }
    const label = state.labels[position]?.trim() || `Nota ${position + 1}`;
    components.push({ ...component, label: uniqueLabel(label, used) });
  });
  const final = state.hasDefinitiva ? pickFinal(data, index, scaleMax) : null;
  return { code, name, section: head?.[3] ?? "", components, final };
}

function mergeBlock(
  merged: Map<string, SacReportBlock>,
  block: SacReportBlock,
): void {
  const existing = merged.get(block.code);
  if (existing === undefined) {
    merged.set(block.code, { ...block, components: [...block.components] });
    return;
  }
  const used = new Set(existing.components.map((c) => normalizeText(c.label)));
  for (const component of block.components) {
    if (!used.has(normalizeText(component.label))) {
      used.add(normalizeText(component.label));
      existing.components.push(component);
    }
  }
  existing.final = existing.final ?? block.final;
  if (existing.section === "") {
    existing.section = block.section;
  }
}

export function parseSacReport(
  texts: readonly string[],
  scaleMax = 5,
): SacReportBlock[] {
  const tokens = splitReportTokens(texts);
  const headers: (HeaderMatch & { start: number })[] = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const match = matchHeaderAt(tokens, index);
    if (match !== null) {
      headers.push({ ...match, start: index });
      index = match.end - 1;
    }
  }
  const merged = new Map<string, SacReportBlock>();
  headers.forEach((header, position) => {
    const stop = headers[position + 1]?.start ?? tokens.length;
    const block = parseBlock(
      tokens.slice(header.end, stop),
      header.remainder,
      scaleMax,
    );
    if (block !== null) {
      mergeBlock(merged, block);
    }
  });
  return [...merged.values()].filter(
    (block) => block.components.length > 0 || block.final !== null,
  );
}
