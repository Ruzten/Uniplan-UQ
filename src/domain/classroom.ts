import { z } from "zod";
import { matchCourseLoosely } from "@/src/domain/course-match";
import type { Item, ItemType, Subject } from "@/src/domain/schemas";
import { findByLooseName, normalizeText } from "@/src/domain/text";

export type Link = Item["links"][number];

export const classroomCourseSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
});
export type ClassroomCourse = z.infer<typeof classroomCourseSchema>;

const attachmentSchema = z.object({
  driveFile: z
    .object({
      driveFile: z
        .object({
          title: z.string().optional(),
          alternateLink: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  link: z.object({ url: z.string(), title: z.string().optional() }).optional(),
  youtubeVideo: z
    .object({
      title: z.string().optional(),
      alternateLink: z.string().optional(),
    })
    .optional(),
  form: z
    .object({ formUrl: z.string(), title: z.string().optional() })
    .optional(),
});
type Attachment = z.infer<typeof attachmentSchema>;

export const courseWorkSchema = z.object({
  courseId: z.string().min(1),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  alternateLink: z.string().optional(),
  maxPoints: z.number().optional(),
  dueDate: z
    .object({ year: z.number(), month: z.number(), day: z.number() })
    .optional(),
  dueTime: z
    .object({ hours: z.number().optional(), minutes: z.number().optional() })
    .optional(),
  materials: z.array(attachmentSchema).optional(),
});
export type CourseWork = z.infer<typeof courseWorkSchema>;

export const submissionSchema = z.object({
  courseId: z.string().min(1),
  courseWorkId: z.string().min(1),
  id: z.string().min(1),
  assignedGrade: z.number().optional(),
  draftGrade: z.number().optional(),
});
export type Submission = z.infer<typeof submissionSchema>;

export type IncomingClassroomItem = Omit<
  Item,
  | "id"
  | "source"
  | "overrides"
  | "hidden"
  | "createdAt"
  | "updatedAt"
  | "externalId"
> & { externalId: string };

export type IncomingClassroomGrade = {
  externalId: string;
  subjectId: string;
  label: string;
  score: number;
  maxScore: number;
  weightPct: number | null;
};

function attachmentLink(attachment: Attachment): Link | null {
  const drive = attachment.driveFile?.driveFile;
  if (drive?.alternateLink !== undefined) {
    return { title: drive.title ?? "Archivo", url: drive.alternateLink };
  }
  if (attachment.link !== undefined) {
    return {
      title: attachment.link.title ?? attachment.link.url,
      url: attachment.link.url,
    };
  }
  const video = attachment.youtubeVideo;
  if (video?.alternateLink !== undefined) {
    return { title: video.title ?? "Video", url: video.alternateLink };
  }
  if (attachment.form !== undefined) {
    return {
      title: attachment.form.title ?? "Formulario",
      url: attachment.form.formUrl,
    };
  }
  return null;
}

function buildLinks(
  alternateLink: string | undefined,
  attachments: readonly Attachment[] | undefined,
): Link[] {
  const links: Link[] = [];
  if (alternateLink !== undefined) {
    links.push({ title: "Abrir en Classroom", url: alternateLink });
  }
  for (const attachment of attachments ?? []) {
    const link = attachmentLink(attachment);
    if (link !== null) {
      links.push(link);
    }
  }
  return links;
}

export function dueAtFromClassroom(
  dueDate: CourseWork["dueDate"],
  dueTime: CourseWork["dueTime"],
): string | null {
  if (dueDate === undefined) {
    return null;
  }
  const hours = dueTime === undefined ? 23 : (dueTime.hours ?? 0);
  const minutes = dueTime === undefined ? 59 : (dueTime.minutes ?? 0);
  return new Date(
    Date.UTC(dueDate.year, dueDate.month - 1, dueDate.day, hours, minutes),
  ).toISOString();
}

// Only work whose title literally says "parcial" is an exam; everything else
// (talleres, actividades calificables, entregas, quizzes) is follow-up work.
export function courseWorkType(title: string, _description = ""): ItemType {
  const text = normalizeText(title);
  if (text.includes("parcial")) {
    return "parcial";
  }
  if (text.includes("quiz")) {
    return "quiz";
  }
  return "tarea";
}

export function mapCourseWork(
  courseWork: CourseWork,
  subjectId: string | null,
): IncomingClassroomItem {
  return {
    externalId: `cw|${courseWork.courseId}|${courseWork.id}`,
    type: courseWorkType(courseWork.title, courseWork.description),
    title: courseWork.title,
    subjectId,
    dueAt: dueAtFromClassroom(courseWork.dueDate, courseWork.dueTime),
    weightPct: null,
    notes: courseWork.description ?? "",
    done: false,
    links: buildLinks(courseWork.alternateLink, courseWork.materials),
    isActa: false,
  };
}

export function mapSubmissionGrade(
  submission: Submission,
  courseWork: CourseWork,
  subjectId: string,
): IncomingClassroomGrade | null {
  const score = submission.assignedGrade ?? submission.draftGrade;
  const maxScore = courseWork.maxPoints;
  if (score === undefined || score < 0) {
    return null;
  }
  if (maxScore === undefined || maxScore <= 0) {
    return null;
  }
  return {
    externalId: `sub|${submission.courseId}|${submission.courseWorkId}`,
    subjectId,
    label: courseWork.title,
    score,
    maxScore,
    weightPct: null,
  };
}

export function matchCourse(
  name: string,
  subjects: readonly Subject[],
  aliases: Record<string, string>,
): Subject | null {
  const normalized = normalizeText(name);
  const byName = subjects.find(
    (subject) => normalizeText(subject.name) === normalized,
  );
  if (byName !== undefined) {
    return byName;
  }
  const aliasId = aliases[normalized];
  const byAlias = subjects.find((subject) => subject.id === aliasId);
  if (byAlias !== undefined) {
    return byAlias;
  }
  return findByLooseName(name, subjects) ?? matchCourseLoosely(name, subjects);
}

export function actaLinks(items: readonly Item[], subjectId: string): Link[] {
  return items
    .filter(
      (item) => item.isActa && !item.hidden && item.subjectId === subjectId,
    )
    .flatMap((item) => item.links);
}
