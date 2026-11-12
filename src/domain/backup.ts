import { z } from "zod";
import type { UniplanDb } from "@/src/db/db";
import {
  gradeSchema,
  itemSchema,
  notifiedRowSchema,
  scheduleBlockSchema,
  subjectSchema,
  syncRunSchema,
} from "@/src/domain/schemas";

export const BACKUP_SCHEMA_VERSION = 1;

const settingRowSchema = z.object({
  key: z.string().min(1),
  value: z.unknown(),
});

export const backupSchema = z.object({
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  exportedAt: z.string(),
  tables: z.object({
    subjects: z.array(subjectSchema),
    items: z.array(itemSchema),
    grades: z.array(gradeSchema),
    scheduleBlocks: z.array(scheduleBlockSchema),
    settings: z.array(settingRowSchema),
    syncRuns: z.array(syncRunSchema),
    notified: z.array(notifiedRowSchema),
  }),
});
export type Backup = z.infer<typeof backupSchema>;

export type BackupResult =
  | { ok: true; data: null }
  | { ok: false; error: { code: "invalid_backup"; message: string } };

const DAY_MS = 86_400_000;

export async function exportBackup(db: UniplanDb, now: Date): Promise<Backup> {
  const settings = await db.settings.toArray();
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    tables: {
      subjects: await db.subjects.toArray(),
      items: await db.items.toArray(),
      grades: await db.grades.toArray(),
      scheduleBlocks: await db.scheduleBlocks.toArray(),
      settings: settings.map((row) => ({ key: row.key, value: row.value })),
      syncRuns: await db.syncRuns.toArray(),
      notified: await db.notified.toArray(),
    },
  };
}

function invalid(message: string): BackupResult {
  return { ok: false, error: { code: "invalid_backup", message } };
}

export async function importBackup(
  db: UniplanDb,
  raw: unknown,
): Promise<BackupResult> {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) {
    return invalid("El archivo no cumple el formato de respaldo");
  }
  const { tables } = parsed.data;
  try {
    await db.transaction(
      "rw",
      [
        db.subjects,
        db.items,
        db.grades,
        db.scheduleBlocks,
        db.settings,
        db.syncRuns,
        db.notified,
      ],
      async () => {
        await Promise.all([
          db.subjects.clear(),
          db.items.clear(),
          db.grades.clear(),
          db.scheduleBlocks.clear(),
          db.settings.clear(),
          db.syncRuns.clear(),
          db.notified.clear(),
        ]);
        await db.subjects.bulkAdd(tables.subjects);
        await db.items.bulkAdd(tables.items);
        await db.grades.bulkAdd(tables.grades);
        await db.scheduleBlocks.bulkAdd(tables.scheduleBlocks);
        await db.settings.bulkAdd(
          tables.settings.map((row) => ({ key: row.key, value: row.value })),
        );
        await db.syncRuns.bulkAdd(tables.syncRuns);
        await db.notified.bulkAdd(tables.notified);
      },
    );
  } catch (error) {
    return invalid(error instanceof Error ? error.message : String(error));
  }
  return { ok: true, data: null };
}

export function daysSinceBackup(
  lastBackupAt: string | null,
  now: Date,
): number | null {
  if (lastBackupAt === null) {
    return null;
  }
  const last = new Date(lastBackupAt).getTime();
  if (Number.isNaN(last)) {
    return null;
  }
  return Math.max(0, Math.floor((now.getTime() - last) / DAY_MS));
}
