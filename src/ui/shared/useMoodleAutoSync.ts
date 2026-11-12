import { useEffect } from "react";
import { db } from "@/src/db/db";
import { getSetting } from "@/src/db/repo";
import { shouldAutoSync } from "@/src/domain/moodle";
import { syncMoodle } from "@/src/sync/moodle-client";

// Refreshes Aulas Virtuales in the background when the panel opens.
export function useMoodleAutoSync(): void {
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const enabled = await getSetting(db, "moodleAutoSync");
      const runs = await db.syncRuns
        .where("source")
        .equals("moodle")
        .sortBy("startedAt");
      const last = runs.at(-1)?.startedAt ?? null;
      if (!cancelled && shouldAutoSync(enabled, last, new Date())) {
        await syncMoodle(db);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);
}
