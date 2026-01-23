import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { writeRunLog } from "./logging";

export async function runReindex(vaultPath: string): Promise<void> {
  const indexDir = join(vaultPath, "index");
  await mkdir(indexDir, { recursive: true });
  const statePath = join(indexDir, "STATE.json");
  const state = {
    status: "empty",
    lastReindex: new Date().toISOString(),
    notes: "Phase 0 placeholder - no documents indexed"
  };
  await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
  await writeRunLog(vaultPath, "reindex", "ok", ["Wrote empty index state"]);
}
