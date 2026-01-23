import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type CyberConfig = {
  vaultPath: string;
};

export const CONFIG_FILENAME = "cyberos.config.json";

export async function loadConfig(cwd: string): Promise<CyberConfig | null> {
  const path = join(cwd, CONFIG_FILENAME);
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as CyberConfig;
  } catch {
    return null;
  }
}

export async function saveConfig(cwd: string, config: CyberConfig): Promise<void> {
  const path = join(cwd, CONFIG_FILENAME);
  const raw = JSON.stringify(config, null, 2) + "\n";
  await writeFile(path, raw, "utf8");
}
