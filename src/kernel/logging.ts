import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function writeRunLog(vaultPath: string, command: string, status: string, details: string[]): Promise<string> {
  const logsDir = join(vaultPath, "logs");
  await mkdir(logsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${stamp}-${command}.log`;
  const path = join(logsDir, filename);
  const lines = [
    `timestamp: ${new Date().toISOString()}`,
    `command: ${command}`,
    `status: ${status}`,
    ...details.map((line) => `detail: ${line}`)
  ].join("\n") + "\n";
  await writeFile(path, lines, "utf8");
  return path;
}
