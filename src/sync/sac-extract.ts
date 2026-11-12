import { sanitizeSacUrl } from "@/src/domain/sac";
import type { SacCapture, SacTable } from "@/src/sync/messages";

function cellText(cell: Element): string {
  return (cell.textContent ?? "").replace(/\s+/g, " ").trim();
}

// Only the row's own cells and the table's own rows: a nested table keeps its
// cells to itself (browsers already do this; some DOM implementations do not).
function rowCells(row: HTMLTableRowElement): string[] {
  return Array.from(row.cells)
    .filter((cell) => cell.parentElement === row)
    .map(cellText);
}

function ownRows(table: HTMLTableElement): HTMLTableRowElement[] {
  return Array.from(table.rows).filter((row) => row.closest("table") === table);
}

export function extractTables(doc: Document): SacTable[] {
  const tables: SacTable[] = [];
  for (const table of Array.from(doc.querySelectorAll("table"))) {
    const [first, ...rest] = ownRows(table);
    if (first === undefined) {
      continue;
    }
    const headers = rowCells(first);
    if (headers.every((header) => header === "")) {
      continue;
    }
    const rows = rest.map(rowCells).filter((row) => row.length > 0);
    if (rows.length === 0) {
      continue;
    }
    tables.push({ headers, rows });
  }
  return tables;
}

function frameDocument(frame: HTMLIFrameElement): Document | null {
  try {
    return frame.contentDocument;
  } catch {
    return null;
  }
}

export function collectDocuments(root: Document): Document[] {
  const documents: Document[] = [root];
  for (const frame of Array.from(root.querySelectorAll("iframe"))) {
    const inner = frameDocument(frame);
    if (inner === null || documents.includes(inner)) {
      continue;
    }
    documents.push(...collectDocuments(inner));
  }
  return documents;
}

const SKIPPED_TEXT_PARENTS = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);
const SHOW_TEXT = 4;

function insideSkippedElement(node: Node): boolean {
  for (let el = node.parentElement; el !== null; el = el.parentElement) {
    if (SKIPPED_TEXT_PARENTS.has(el.tagName.toUpperCase())) {
      return true;
    }
  }
  return false;
}

// Every non-empty text node of the document in DOM order, whitespace
// normalised. Read-only: it only walks the existing tree.
export function extractTexts(doc: Document): string[] {
  const root = doc.body ?? doc.documentElement;
  if (root === null) {
    return [];
  }
  const texts: string[] = [];
  const walker = doc.createTreeWalker(root, SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = (node.nodeValue ?? "").replace(/\s+/g, " ").trim();
    if (text !== "" && !insideSkippedElement(node)) {
      texts.push(text);
    }
  }
  return texts;
}

export function captureSac(root: Document, now: Date): SacCapture {
  const documents = collectDocuments(root);
  return {
    url: sanitizeSacUrl(root.URL),
    title: root.title,
    capturedAt: now.toISOString(),
    tables: documents.flatMap(extractTables),
    texts: documents.flatMap(extractTexts),
  };
}
