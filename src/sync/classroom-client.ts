import { browser } from "wxt/browser";
import type { z } from "zod";
import { db as defaultDb, type UniplanDb } from "@/src/db/db";
import { getSetting, setSetting } from "@/src/db/repo";
import {
  type CourseWork,
  classroomCourseSchema,
  courseWorkSchema,
  type IncomingClassroomGrade,
  type IncomingClassroomItem,
  mapCourseWork,
  mapSubmissionGrade,
  matchCourse,
  submissionSchema,
} from "@/src/domain/classroom";
import type { SyncCounts, SyncRun } from "@/src/domain/schemas";
import { runSync, upsertSynced } from "@/src/sync/merge";

export const CLASSROOM_API = "https://classroom.googleapis.com";
export const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
export const TOKEN_KEY = "classroomToken";

export const CLASSROOM_SCOPES = [
  "classroom.courses.readonly",
  "classroom.coursework.me.readonly",
  "classroom.student-submissions.me.readonly",
  "classroom.courseworkmaterials.readonly",
  "classroom.announcements.readonly",
].map((scope) => `https://www.googleapis.com/auth/${scope}`);

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type ClassroomErrorCode = "auth_required" | "classroom_http_error";

export class ClassroomError extends Error {
  readonly code: ClassroomErrorCode;
  readonly status: number | null;

  constructor(
    code: ClassroomErrorCode,
    detail: string,
    status: number | null = null,
  ) {
    super(`${code}: ${detail}`);
    this.name = "ClassroomError";
    this.code = code;
    this.status = status;
  }
}

export type StoredToken = { accessToken: string; expiresAt: number };

const defaultFetch: FetchLike = (url, init) => fetch(url, init);

export function buildAuthUrl(clientId: string, redirectUri: string): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("scope", CLASSROOM_SCOPES.join(" "));
  return url.toString();
}

export function parseAuthRedirect(
  url: string,
  now: Date = new Date(),
): StoredToken | null {
  const hash = url.split("#")[1];
  if (hash === undefined) {
    return null;
  }
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const expiresIn = Number(params.get("expires_in") ?? "3600");
  if (accessToken === null || accessToken === "") {
    return null;
  }
  const seconds =
    Number.isFinite(expiresIn) && expiresIn > 0 ? expiresIn : 3600;
  return { accessToken, expiresAt: now.getTime() + seconds * 1000 };
}

async function readStoredToken(): Promise<StoredToken | null> {
  const stored = await browser.storage.session.get(TOKEN_KEY);
  const value = stored[TOKEN_KEY] as Partial<StoredToken> | undefined;
  if (
    typeof value?.accessToken !== "string" ||
    typeof value.expiresAt !== "number"
  ) {
    return null;
  }
  return { accessToken: value.accessToken, expiresAt: value.expiresAt };
}

export function getRedirectUri(): string {
  return browser.identity.getRedirectURL();
}

export async function connectClassroom(db: UniplanDb): Promise<void> {
  await getToken({ interactive: true, db });
}

export function needsReconnect(run: SyncRun | undefined): boolean {
  if (run === undefined || run.status !== "error" || run.error === null) {
    return false;
  }
  return (
    run.error.startsWith("auth_required") || run.error.includes("respondió 401")
  );
}

export async function clearToken(): Promise<void> {
  await browser.storage.session.remove(TOKEN_KEY);
}

export async function getToken(options: {
  interactive: boolean;
  db?: UniplanDb;
}): Promise<string> {
  const stored = await readStoredToken();
  if (stored !== null && stored.expiresAt - Date.now() >= 60_000) {
    return stored.accessToken;
  }
  const clientId = (
    await getSetting(options.db ?? defaultDb, "googleClientId")
  ).trim();
  if (clientId === "") {
    throw new ClassroomError(
      "auth_required",
      "falta el ID de cliente de Google",
    );
  }
  let redirect: string | undefined;
  try {
    redirect = await browser.identity.launchWebAuthFlow({
      url: buildAuthUrl(clientId, browser.identity.getRedirectURL()),
      interactive: options.interactive,
    });
  } catch {
    redirect = undefined;
  }
  const token = redirect === undefined ? null : parseAuthRedirect(redirect);
  if (token === null) {
    throw new ClassroomError(
      "auth_required",
      "no hay un token válido de Classroom",
    );
  }
  await browser.storage.session.set({ [TOKEN_KEY]: token });
  return token.accessToken;
}

export async function listAll(
  path: string,
  listKey: string,
  token: string,
  fetchImpl: FetchLike,
): Promise<unknown[]> {
  const results: unknown[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(path, CLASSROOM_API);
    if (url.origin !== CLASSROOM_API) {
      throw new ClassroomError(
        "classroom_http_error",
        "ruta fuera de Classroom",
      );
    }
    if (pageToken !== undefined) {
      url.searchParams.set("pageToken", pageToken);
    }
    const response = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status !== 200) {
      throw new ClassroomError(
        "classroom_http_error",
        `Classroom respondió ${response.status}`,
        response.status,
      );
    }
    const body = (await response.json()) as Record<string, unknown>;
    const page = body[listKey];
    if (Array.isArray(page)) {
      results.push(...page);
    }
    const next = body.nextPageToken;
    pageToken = typeof next === "string" && next !== "" ? next : undefined;
  } while (pageToken !== undefined);
  return results;
}

function parseEach<T>(schema: z.ZodType<T>, raw: readonly unknown[]): T[] {
  return raw.flatMap((entry) => {
    const parsed = schema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

function addCounts(target: SyncCounts, extra: SyncCounts): void {
  target.created += extra.created;
  target.updated += extra.updated;
  target.skipped += extra.skipped;
}

async function syncCourses(
  db: UniplanDb,
  token: string,
  fetchImpl: FetchLike,
): Promise<SyncCounts> {
  const counts: SyncCounts = {
    created: 0,
    updated: 0,
    skipped: 0,
    unmatched: 0,
  };
  const subjects = await db.subjects.toArray();
  const aliases = await getSetting(db, "subjectAliases");
  const courses = parseEach(
    classroomCourseSchema,
    await listAll(
      "/v1/courses?courseStates=ACTIVE&studentId=me",
      "courses",
      token,
      fetchImpl,
    ),
  );
  const unmatched: string[] = [];
  const matchedNames: string[] = [];
  const items: IncomingClassroomItem[] = [];
  const grades: IncomingClassroomGrade[] = [];
  for (const course of courses) {
    const subject = matchCourse(course.name, subjects, aliases);
    if (subject === null) {
      unmatched.push(course.name);
      continue;
    }
    matchedNames.push(course.name);
    const base = `/v1/courses/${encodeURIComponent(course.id)}`;
    const courseWork = parseEach(
      courseWorkSchema,
      await listAll(`${base}/courseWork`, "courseWork", token, fetchImpl),
    );
    const submissions = parseEach(
      submissionSchema,
      await listAll(
        `${base}/courseWork/-/studentSubmissions?userId=me`,
        "studentSubmissions",
        token,
        fetchImpl,
      ),
    );
    const workById = new Map<string, CourseWork>(
      courseWork.map((work) => [work.id, work]),
    );
    items.push(...courseWork.map((work) => mapCourseWork(work, subject.id)));
    // Only classwork activities and their grades come in. Materials the
    // teacher posts (slides, PDFs, the acta) are documents, not tasks.
    for (const submission of submissions) {
      const work = workById.get(submission.courseWorkId);
      const grade =
        work === undefined
          ? null
          : mapSubmissionGrade(submission, work, subject.id);
      if (grade !== null) {
        grades.push(grade);
      }
    }
  }
  if (items.length > 0) {
    addCounts(counts, await upsertSynced(db, "items", "classroom", items));
  }
  if (grades.length > 0) {
    addCounts(counts, await upsertSynced(db, "grades", "classroom", grades));
  }
  const uniqueUnmatched = [...new Set(unmatched)];
  const stored = await getSetting(db, "unmatchedSubjects");
  const next = [
    ...new Set([
      ...stored.filter((name) => !matchedNames.includes(name)),
      ...uniqueUnmatched,
    ]),
  ];
  if (
    next.length !== stored.length ||
    next.some((name, index) => name !== stored[index])
  ) {
    await setSetting(db, "unmatchedSubjects", next);
  }
  counts.unmatched = uniqueUnmatched.length;
  return counts;
}

export function syncClassroom(
  db: UniplanDb,
  options: { fetchImpl?: FetchLike; token?: string } = {},
): Promise<SyncRun> {
  return runSync(db, "classroom", async () => {
    try {
      const token =
        options.token ?? (await getToken({ interactive: false, db }));
      const counts = await syncCourses(
        db,
        token,
        options.fetchImpl ?? defaultFetch,
      );
      return { counts };
    } catch (error) {
      if (error instanceof ClassroomError && error.status === 401) {
        await clearToken();
      }
      throw error;
    }
  });
}
