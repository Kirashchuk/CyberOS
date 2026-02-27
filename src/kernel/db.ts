import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Database } from "bun:sqlite";

const DB_FILENAME = "cyberos.sqlite";
const MIGRATIONS_DIR = join(import.meta.dir, "sql", "migrations");

export function dbPath(vaultPath: string): string {
  return join(vaultPath, "index", DB_FILENAME);
}

export async function openDatabase(vaultPath: string): Promise<Database> {
  await mkdir(join(vaultPath, "index"), { recursive: true });
  const db = new Database(dbPath(vaultPath));
  db.run("PRAGMA journal_mode = WAL;");
  db.run("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);");
  await applyMigrations(db);
  return db;
}

async function applyMigrations(db: Database): Promise<void> {
  const files = (await readdir(MIGRATIONS_DIR)).filter((entry) => entry.endsWith(".sql")).sort();
  const seenStmt = db.prepare("SELECT 1 FROM _migrations WHERE name = ? LIMIT 1");
  const markStmt = db.prepare("INSERT INTO _migrations(name, applied_at) VALUES (?, ?)");

  for (const file of files) {
    const seen = seenStmt.get(file) as { 1: number } | null;
    if (seen) {
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      markStmt.run(file, new Date().toISOString());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
