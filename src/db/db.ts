import Dexie, { type Table } from "dexie";
import { PENSUM_SEED_TEXT } from "@/src/data/pensum.seed";
import { parsePensumSeed } from "@/src/domain/pensum";
import type {
  Grade,
  Item,
  NotifiedRow,
  ScheduleBlock,
  SettingRow,
  Subject,
  SyncRun,
} from "@/src/domain/schemas";

export const DB_NAME = "uniplan";

export const SCHEMA_V1 = {
  subjects: "id, semester, status",
  items: "id, subjectId, dueAt, [source+externalId]",
  grades: "id, subjectId, [source+externalId]",
  scheduleBlocks: "id, subjectId, day, source",
  settings: "key",
  syncRuns: "id, source, startedAt",
  notified: "key",
} as const;

export type TableName = keyof typeof SCHEMA_V1;

export const TABLE_NAMES = Object.keys(SCHEMA_V1) as TableName[];

export type UniplanDb = Dexie & {
  subjects: Table<Subject, string>;
  items: Table<Item, string>;
  grades: Table<Grade, string>;
  scheduleBlocks: Table<ScheduleBlock, string>;
  settings: Table<SettingRow, string>;
  syncRuns: Table<SyncRun, string>;
  notified: Table<NotifiedRow, string>;
};

export function applySchema(target: Dexie): void {
  target.version(1).stores(SCHEMA_V1);
}

export function createDb(name: string = DB_NAME): UniplanDb {
  const instance = new Dexie(name) as UniplanDb;
  applySchema(instance);
  instance.on("populate", (tx) => {
    tx.table("subjects").bulkAdd(parsePensumSeed(PENSUM_SEED_TEXT));
  });
  return instance;
}

export const db = createDb();
