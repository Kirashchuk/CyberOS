import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const VAULT_DIRS = [
  "private",
  "shared",
  "context",
  "sources",
  "facts",
  "content",
  "logs",
  "index"
];

export type VaultCheck = {
  missingDirs: string[];
};

export async function ensureVaultStructure(vaultPath: string): Promise<void> {
  for (const dir of VAULT_DIRS) {
    await mkdir(join(vaultPath, dir), { recursive: true });
  }

  const identityPath = join(vaultPath, "context", "who-am-i.md");
  if (!existsSync(identityPath)) {
    const template = [
      "# Who Am I",
      "",
      "- Name:",
      "- Role:",
      "- Goals:",
      "- Preferences:",
      ""
    ].join("\n");
    await writeFile(identityPath, template, "utf8");
  }

  const aliasesPath = join(vaultPath, "context", "aliases.json");
  if (!existsSync(aliasesPath)) {
    await writeFile(aliasesPath, "[]\n", "utf8");
  }
}

export function validateVaultStructure(vaultPath: string): VaultCheck {
  const missingDirs = VAULT_DIRS.filter((dir) => !existsSync(join(vaultPath, dir)));
  return { missingDirs };
}
