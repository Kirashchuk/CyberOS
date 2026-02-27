import { mkdir, readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { Database } from "bun:sqlite";

export type SearchResult = {
  id: number;
  statement: string;
  sourceRef: string;
  sourcePath: string;
};

function dbPath(vaultPath: string): string {
  return join(vaultPath, "index", "facts.db");
}

async function collectMarkdownFiles(root: string): Promise<string[]> {
  if (!existsSync(root)) return [];
  const out: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        out.push(full);
      }
    }
  }

  return out;
}

function extractFacts(markdown: string, sourcePath: string): Array<{ statement: string; sourceRef: string }> {
  const lines = markdown.split(/\r?\n/);
  const facts: Array<{ statement: string; sourceRef: string }> = [];

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith("#")) continue;

    let statement: string | null = null;
    if (raw.startsWith("- ")) {
      statement = raw.slice(2).trim();
    } else if (/^\d+\.\s+/.test(raw)) {
      statement = raw.replace(/^\d+\.\s+/, "").trim();
    } else if (raw.length >= 30 && !raw.startsWith("```")) {
      statement = raw;
    }

    if (!statement) continue;

    facts.push({
      statement,
      sourceRef: `${sourcePath}:L${i + 1}`
    });
  }

  return facts;
}

export async function ensureFactSchema(vaultPath: string): Promise<void> {
  const indexDir = join(vaultPath, "index");
  await mkdir(indexDir, { recursive: true });
  const db = new Database(dbPath(vaultPath));

  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL UNIQUE,
      hash TEXT,
      indexed_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      statement TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (source_id) REFERENCES sources(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_facts_statement ON facts(statement);
    CREATE INDEX IF NOT EXISTS idx_facts_source_ref ON facts(source_ref);
  `);

  db.close();
}

export async function rebuildFactsIndex(vaultPath: string): Promise<{ filesIndexed: number; factsIndexed: number }> {
  await ensureFactSchema(vaultPath);
  const sourcesRoot = join(vaultPath, "sources");
  const files = await collectMarkdownFiles(sourcesRoot);

  const db = new Database(dbPath(vaultPath));
  const now = new Date().toISOString();

  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM facts;");
    db.exec("DELETE FROM sources;");

    const insertSource = db.prepare("INSERT INTO sources(path, hash, indexed_at) VALUES(?, ?, ?)");
    const insertFact = db.prepare(
      "INSERT INTO facts(source_id, statement, source_ref, created_at) VALUES(?, ?, ?, ?)"
    );

    let factsIndexed = 0;

    for (const filePath of files) {
      const raw = await readFile(filePath, "utf8");
      const rel = relative(vaultPath, filePath);
      const sourceInfo = insertSource.run(rel, null, now);
      const sourceId = Number(sourceInfo.lastInsertRowid);
      const facts = extractFacts(raw, rel);

      for (const fact of facts) {
        insertFact.run(sourceId, fact.statement, fact.sourceRef, now);
        factsIndexed += 1;
      }
    }

    db.exec("COMMIT");
    return { filesIndexed: files.length, factsIndexed };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

export async function searchFacts(vaultPath: string, query: string, limit = 20): Promise<SearchResult[]> {
  await ensureFactSchema(vaultPath);
  const db = new Database(dbPath(vaultPath), { readonly: true });

  const stmt = db.prepare(`
    SELECT f.id as id, f.statement as statement, f.source_ref as sourceRef, s.path as sourcePath
    FROM facts f
    JOIN sources s ON s.id = f.source_id
    WHERE f.statement LIKE ?
    ORDER BY f.id DESC
    LIMIT ?
  `);

  const rows = stmt.all(`%${query}%`, limit) as SearchResult[];
  db.close();
  return rows;
}
