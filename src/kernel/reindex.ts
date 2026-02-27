import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { writeRunLog } from "./logging";
import { rebuildFactsIndex } from "./indexer";

export async function runReindex(vaultPath: string): Promise<void> {
  const indexDir = join(vaultPath, "index");
  await mkdir(indexDir, { recursive: true });

  const { filesIndexed, factsIndexed } = await rebuildFactsIndex(vaultPath);

  const statePath = join(indexDir, "STATE.json");
  const state = {
    status: "ready",
    lastReindex: new Date().toISOString(),
    notes: "Phase 1 index built from markdown sources",
    stats: {
      filesIndexed,
      factsIndexed
    }
  };
  await writeFile(statePath, JSON.stringify(state, null, 2) + "\n", "utf8");
  await writeRunLog(vaultPath, "reindex", "ok", [
    `Indexed files: ${filesIndexed}`,
    `Indexed facts: ${factsIndexed}`
  ]);
}
