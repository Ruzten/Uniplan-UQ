import type { UniplanDb } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import { matchCourse } from "@/src/domain/classroom";
import {
  isMoodleLoginUrl,
  MOODLE_ORIGIN,
  type MoodleGradeRow,
  mapMoodleEvent,
  mapMoodleGradeRow,
  moodleCourseSchema,
  moodleEventSchema,
  sesskeyFromHtml,
} from "@/src/domain/moodle";
import type { SyncCounts, SyncRun } from "@/src/domain/schemas";
import {
  type IncomingGrade,
  type IncomingItem,
  runSync,
  upsertSynced,
} from "@/src/sync/merge";

// Reads Aulas Virtuales with the session the student already has open in
// this browser. It never asks for, stores or sends a password, and it only
// reads: no submissions, forms or changes in Moodle.

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export class MoodleError extends Error {
  constructor(
    readonly code: "auth_required" | "handler_error",
    message: string,
  ) {
    super(`${code}: ${message}`);
  }
}

const LOOKBACK_DAYS = 30;

function moodleUrl(path: string): string {
  const url = new URL(path, MOODLE_ORIGIN);
  if (url.origin !== MOODLE_ORIGIN) {
    throw new MoodleError("handler_error", "ruta fuera de Aulas Virtuales");
  }
  return url.toString();
}

async function openSession(fetchImpl: FetchLike): Promise<string> {
  const response = await fetchImpl(moodleUrl("/my/"), {
    credentials: "include",
  });
  const html = await response.text();
  const sesskey = sesskeyFromHtml(html);
  if (isMoodleLoginUrl(response.url) || sesskey === null) {
    throw new MoodleError(
      "auth_required",
      "inicia sesión en Aulas Virtuales en este navegador y vuelve a sincronizar",
    );
  }
  return sesskey;
}

async function callAjax(
  fetchImpl: FetchLike,
  sesskey: string,
  methodname: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetchImpl(
    moodleUrl(`/lib/ajax/service.php?sesskey=${sesskey}&info=${methodname}`),
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ index: 0, methodname, args }]),
    },
  );
  if (response.status !== 200) {
    throw new MoodleError(
      "handler_error",
      `Aulas Virtuales respondió ${response.status}`,
    );
  }
  const body = (await response.json()) as {
    error?: boolean;
    data?: unknown;
    exception?: { errorcode?: string };
  }[];
  const first = body[0];
  if (first === undefined || first.error === true) {
    const code = first?.exception?.errorcode ?? "error desconocido";
    throw new MoodleError(
      code === "servicerequireslogin" || code === "invalidsesskey"
        ? "auth_required"
        : "handler_error",
      `Aulas Virtuales rechazó ${methodname} (${code})`,
    );
  }
  return first.data;
}

export function extractGradeRows(html: string): MoodleGradeRow[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows: MoodleGradeRow[] = [];
  for (const row of doc.querySelectorAll("table.user-grade tbody tr")) {
    const nameCell = row.querySelector(".column-itemname.item");
    if (nameCell === null) continue;
    const text = (selector: string) =>
      row.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() ??
      "";
    rows.push({
      name:
        nameCell.querySelector(".gradeitemheader")?.textContent?.trim() ??
        nameCell.textContent?.trim() ??
        "",
      weight: text(".column-weight"),
      grade: text(".column-grade"),
      range: text(".column-range"),
    });
  }
  return rows;
}

function listOf<T>(
  raw: unknown,
  key: string,
  parse: (value: unknown) => T | null,
): T[] {
  const list =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)[key]
      : undefined;
  return Array.isArray(list)
    ? list.flatMap((entry) => {
        const parsed = parse(entry);
        return parsed === null ? [] : [parsed];
      })
    : [];
}

async function syncAulas(
  db: UniplanDb,
  fetchImpl: FetchLike,
  now: Date,
): Promise<SyncCounts> {
  const counts: SyncCounts = {
    created: 0,
    updated: 0,
    skipped: 0,
    unmatched: 0,
  };
  const sesskey = await openSession(fetchImpl);
  const subjects = await db.subjects.toArray();
  const aliases = await getSetting(db, "subjectAliases");

  const courses = listOf(
    await callAjax(
      fetchImpl,
      sesskey,
      "core_course_get_enrolled_courses_by_timeline_classification",
      { classification: "inprogress", limit: 0, offset: 0 },
    ),
    "courses",
    (entry) => moodleCourseSchema.safeParse(entry).data ?? null,
  );
  const subjectByCourse = new Map<number, string>();
  const unmatched: string[] = [];
  const matchedNames: string[] = [];
  for (const course of courses) {
    const subject = matchCourse(course.fullname, subjects, aliases);
    if (subject === null) {
      unmatched.push(course.fullname);
    } else {
      subjectByCourse.set(course.id, subject.id);
      matchedNames.push(course.fullname);
    }
  }

  const events = listOf(
    await callAjax(
      fetchImpl,
      sesskey,
      "core_calendar_get_action_events_by_timesort",
      {
        timesortfrom: Math.floor(now.getTime() / 1000) - LOOKBACK_DAYS * 86_400,
        limitnum: 50,
      },
    ),
    "events",
    (entry) => moodleEventSchema.safeParse(entry).data ?? null,
  );
  const items: IncomingItem[] = events.flatMap((event) => {
    const subjectId = subjectByCourse.get(event.course?.id ?? -1);
    return subjectId === undefined ? [] : [mapMoodleEvent(event, subjectId)];
  });

  const grades: IncomingGrade[] = [];
  for (const [courseId, subjectId] of subjectByCourse) {
    const response = await fetchImpl(
      moodleUrl(`/grade/report/user/index.php?id=${courseId}`),
      { credentials: "include" },
    );
    if (response.status !== 200 || isMoodleLoginUrl(response.url)) continue;
    for (const row of extractGradeRows(await response.text())) {
      const grade = mapMoodleGradeRow(row, courseId, subjectId);
      if (grade !== null) grades.push(grade);
    }
  }

  if (items.length > 0) {
    const result = await upsertSynced(db, "items", "moodle", items);
    counts.created += result.created;
    counts.updated += result.updated;
    counts.skipped += result.skipped;
  }
  if (grades.length > 0) {
    const result = await upsertSynced(db, "grades", "moodle", grades);
    counts.created += result.created;
    counts.updated += result.updated;
    counts.skipped += result.skipped;
  }

  const unique = [...new Set(unmatched)];
  const stored = await getSetting(db, "unmatchedSubjects");
  const next = [
    ...new Set([
      ...stored.filter((name) => !matchedNames.includes(name)),
      ...unique,
    ]),
  ];
  if (next.join("\n") !== stored.join("\n")) {
    await setSetting(db, "unmatchedSubjects", next);
  }
  counts.unmatched = unique.length;
  return counts;
}

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

export function syncMoodle(
  db: UniplanDb,
  options: { fetchImpl?: FetchLike; now?: Date } = {},
): Promise<SyncRun> {
  return runSync(db, "moodle", async () => ({
    counts: await syncAulas(
      db,
      options.fetchImpl ?? defaultFetch,
      options.now ?? new Date(),
    ),
  }));
}
