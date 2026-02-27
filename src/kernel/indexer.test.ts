import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureVaultStructure } from "./vault";
import { rebuildFactsIndex, searchFacts } from "./indexer";

async function createTempVault(): Promise<string> {
  const root = await mkdtemp("/tmp/cyberos-indexer-");
  await ensureVaultStructure(root);
  return root;
}

describe("indexer", () => {
  test("rebuildFactsIndex indexes markdown facts with source refs", async () => {
    const vault = await createTempVault();
    try {
      await mkdir(join(vault, "sources", "notes"), { recursive: true });
      await writeFile(
        join(vault, "sources", "notes", "daily.md"),
        "# Daily\n\n- Alpha signal\n1. Beta signal\n\nThis paragraph should be indexed as a fact because it is definitely longer than thirty characters.\n",
        "utf8"
      );

      const result = await rebuildFactsIndex(vault);
      expect(result.filesIndexed).toBe(1);
      expect(result.factsIndexed).toBe(3);

      const hits = await searchFacts(vault, "Alpha", 10);
      expect(hits.length).toBe(1);
      expect(hits[0]?.sourceRef).toBe("sources/notes/daily.md:L3");
    } finally {
      await rm(vault, { recursive: true, force: true });
    }
  });

  test("searchFacts returns empty array when no matches", async () => {
    const vault = await createTempVault();
    try {
      await writeFile(join(vault, "sources", "blank.md"), "# Header\n\n- only fact\n", "utf8");
      await rebuildFactsIndex(vault);
      const hits = await searchFacts(vault, "missing", 5);
      expect(hits).toHaveLength(0);
    } finally {
      await rm(vault, { recursive: true, force: true });
    }
  });
});
