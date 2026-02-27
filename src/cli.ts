import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { loadConfig, saveConfig } from "./kernel/config";
import { ensureVaultStructure, validateVaultStructure } from "./kernel/vault";
import { runReindex } from "./kernel/reindex";
import { writeRunLog } from "./kernel/logging";
import { searchFacts } from "./kernel/indexer";

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

async function requireVault(options: Record<string, string | boolean>): Promise<string> {
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
  return vaultPath;
}

function usage(): string {
  return [
    "Cyber OS CLI",
    "",
    "Usage:",
    "  /init --vault <path>",
    "  /reindex",
    "  /search --q <query> [--limit <n>]",
    "  /ingest-archive",
    "  /ingest-gateway",
    "  /refresh-aggregates",
    "  /serve-public --port <n>",
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
    const vaultPath = await requireVault(options);
    await runReindex(vaultPath);
    console.log("Reindex complete.");
    return;
  }

  if (normalized === "search") {
    const vaultPath = await requireVault(options);

    if (typeof options.q !== "string" || options.q.trim().length === 0) {
      console.error("Missing query. Use /search --q <query>.");
      process.exit(1);
    }

    const limit = typeof options.limit === "string" ? Number(options.limit) : 20;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
    const query = options.q.trim();

    const results = await searchFacts(vaultPath, query, safeLimit);

    if (results.length === 0) {
      console.log("No facts found.");
    } else {
      for (const row of results) {
        console.log(`- ${row.statement}`);
        console.log(`  source_ref: ${row.sourceRef}`);
      }
    }

    await writeRunLog(vaultPath, "search", "ok", [
      `Query: ${query}`,
      `Limit: ${safeLimit}`,
      `Results: ${results.length}`
    ]);

    return;
  }

  if (normalized === "ingest-archive" || normalized === "ingest-gateway") {
    const vaultPath = await requireVault(options);
    const indexDir = join(vaultPath, "index");
    await mkdir(indexDir, { recursive: true });
    const outputPath = join(indexDir, `${normalized}.json`);
    await writeFile(
      outputPath,
      JSON.stringify(
        {
          status: "placeholder",
          command: normalized,
          completedAt: new Date().toISOString(),
          source_ref: `cli:${normalized}`
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    await writeRunLog(vaultPath, normalized, "ok", [
      "Placeholder ingest completed",
      `Output: ${outputPath}`,
      "source_ref: cli:ingest"
    ]);
    console.log(`${normalized} complete (placeholder).`);
    return;
  }

  if (normalized === "refresh-aggregates") {
    const vaultPath = await requireVault(options);
    const indexDir = join(vaultPath, "index");
    await mkdir(indexDir, { recursive: true });
    const outputPath = join(indexDir, "aggregates.json");
    await writeFile(
      outputPath,
      JSON.stringify(
        {
          status: "placeholder",
          refreshedAt: new Date().toISOString(),
          source_ref: "cli:refresh-aggregates"
        },
        null,
        2
      ) + "\n",
      "utf8"
    );

    await writeRunLog(vaultPath, "refresh-aggregates", "ok", [
      "Placeholder aggregate refresh completed",
      `Output: ${outputPath}`,
      "source_ref: cli:refresh-aggregates"
    ]);
    console.log("refresh-aggregates complete (placeholder).");
    return;
  }

  if (normalized === "serve-public") {
    const vaultPath = await requireVault(options);
    const port = typeof options.port === "string" ? Number(options.port) : 3000;
    const safePort = Number.isFinite(port) && port > 0 ? Math.floor(port) : 3000;

    await writeRunLog(vaultPath, "serve-public", "ok", [
      `Port: ${safePort}`,
      "Placeholder public endpoints announced",
      "source_ref: cli:serve-public"
    ]);

    console.log(`Serving public endpoints (placeholder) on :${safePort}`);
    console.log("- GET /public/scanner?limit=50");
    console.log("- GET /public/leaderboard?minPnL=0&minVolume=100000&minTrades=10&limit=100&offset=0");
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
