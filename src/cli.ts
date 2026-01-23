import { resolve } from "node:path";
import { loadConfig, saveConfig } from "./kernel/config";
import { ensureVaultStructure, validateVaultStructure } from "./kernel/vault";
import { runReindex } from "./kernel/reindex";
import { writeRunLog } from "./kernel/logging";

type ParsedArgs = {
  command: string | null;
  options: Record<string, string | boolean>;
};

function parseArgs(args: string[]): ParsedArgs {
  if (args.length === 0) {
    return { command: null, options: {} };
  }

  const command = args[0];
  const options: Record<string, string | boolean> = {};

  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = true;
    }
  }

  return { command, options };
}

function normalizeCommand(command: string | null): string | null {
  if (!command) return null;
  return command.startsWith("/") ? command.slice(1) : command;
}

async function resolveVaultPath(options: Record<string, string | boolean>): Promise<string | null> {
  if (typeof options.vault === "string") {
    return resolve(options.vault);
  }
  if (typeof process.env.CYBEROS_VAULT === "string") {
    return resolve(process.env.CYBEROS_VAULT);
  }
  const config = await loadConfig(process.cwd());
  if (config?.vaultPath) {
    return resolve(config.vaultPath);
  }
  return null;
}

function usage(): string {
  return [
    "Cyber OS CLI",
    "",
    "Usage:",
    "  /init --vault <path>",
    "  /reindex",
    "  /help",
    "",
    "Notes:",
    "  - Set CYBEROS_VAULT or pass --vault to select a vault.",
    "  - /init writes cyberos.config.json in the repo root."
  ].join("\n");
}

async function main(): Promise<void> {
  const { command, options } = parseArgs(process.argv.slice(2));
  const normalized = normalizeCommand(command);

  if (!normalized || normalized === "help") {
    console.log(usage());
    return;
  }

  if (normalized === "init") {
    const vaultPath = await resolveVaultPath(options);
    if (!vaultPath) {
      console.error("Missing vault path. Use --vault <path> or set CYBEROS_VAULT.");
      process.exit(1);
    }
    await ensureVaultStructure(vaultPath);
    await saveConfig(process.cwd(), { vaultPath });
    await writeRunLog(vaultPath, "init", "ok", ["Vault initialized", `Config saved in ${process.cwd()}`]);
    console.log(`Vault ready at ${vaultPath}`);
    return;
  }

  if (normalized === "reindex") {
    const vaultPath = await resolveVaultPath(options);
    if (!vaultPath) {
      console.error("Missing vault path. Use --vault <path> or set CYBEROS_VAULT.");
      process.exit(1);
    }
    const check = validateVaultStructure(vaultPath);
    if (check.missingDirs.length > 0) {
      console.error(`Vault is missing: ${check.missingDirs.join(", ")}. Run /init first.`);
      process.exit(1);
    }
    await runReindex(vaultPath);
    console.log("Reindex complete (empty placeholder state)." );
    return;
  }

  console.error(`Unknown command: ${normalized}`);
  console.log(usage());
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
