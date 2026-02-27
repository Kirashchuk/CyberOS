import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CorrelationContext, StructuredLog } from "./operations";

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

export async function writeStructuredRunLog(
  vaultPath: string,
  command: string,
  correlation: CorrelationContext,
  entries: Omit<StructuredLog, "timestamp" | "correlation">[]
): Promise<string> {
  const logsDir = join(vaultPath, "logs");
  await mkdir(logsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${stamp}-${command}.jsonl`;
  const path = join(logsDir, filename);

  const lines = entries
    .map((entry) => {
      const logEntry: StructuredLog = {
        ...entry,
        timestamp: new Date().toISOString(),
        correlation
      };
      return JSON.stringify(logEntry);
    })
    .join("\n") + "\n";

  await writeFile(path, lines, "utf8");
  return path;
}
