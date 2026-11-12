import type { UniplanDb } from "@/src/db/db";
import { clearToken } from "@/src/sync/classroom-client";

// Deletes the whole local database and the Classroom session token. The next
// time the panel opens, Dexie recreates the database and its populate event
// seeds the pensum again, exactly like a fresh install.
export async function eraseAllData(db: UniplanDb): Promise<void> {
  await clearToken();
  db.close();
  await db.delete();
}
