import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import type { Database } from "bun:sqlite";
import { openDatabase } from "./db";
import { writeRunLog } from "./logging";

type SourceRow = Record<string, unknown>;

type IngestionSummary = {
  files: number;
  snapshots: number;
  orderHistory: number;
  matchHistory: number;
  intents: number;
  executions: number;
};

export async function ingestArchive(vaultPath: string): Promise<IngestionSummary> {
  const db = await openDatabase(vaultPath);
  const dir = join(vaultPath, "sources", "archive");
  await mkdir(dir, { recursive: true });

  const summary: IngestionSummary = { files: 0, snapshots: 0, orderHistory: 0, matchHistory: 0, intents: 0, executions: 0 };
  const files = (await readdir(dir)).filter((entry) => entry.endsWith(".json"));
  for (const file of files) {
    const raw = await readFile(join(dir, file), "utf8");
    const payload = JSON.parse(raw) as SourceRow | SourceRow[];
    const rows = Array.isArray(payload) ? payload : [payload];
    summary.files += 1;
    for (const row of rows) {
      const sourceRef = stringOr(row.source_ref, `archive:${file}`);
      summary.snapshots += upsertSnapshot(db, row, sourceRef);
      summary.orderHistory += upsertOrderHistory(db, row, sourceRef);
      summary.matchHistory += upsertMatchHistory(db, row, sourceRef);
    }
  }

  refreshMaterializedCaches(db);
  await writeRunLog(vaultPath, "ingest-archive", "ok", [
    `Files: ${summary.files}`,
    `Snapshots: ${summary.snapshots}`,
    `Order history rows: ${summary.orderHistory}`,
    `Match history rows: ${summary.matchHistory}`
  ]);
  db.close();
  return summary;
}

export async function ingestGateway(vaultPath: string): Promise<IngestionSummary> {
  const db = await openDatabase(vaultPath);
  const dir = join(vaultPath, "sources", "gateway");
  await mkdir(dir, { recursive: true });

  const summary: IngestionSummary = { files: 0, snapshots: 0, orderHistory: 0, matchHistory: 0, intents: 0, executions: 0 };
  const files = (await readdir(dir)).filter((entry) => entry.endsWith(".json"));
  for (const file of files) {
    const raw = await readFile(join(dir, file), "utf8");
    const payload = JSON.parse(raw) as SourceRow | SourceRow[];
    const rows = Array.isArray(payload) ? payload : [payload];
    summary.files += 1;
    for (const row of rows) {
      const sourceRef = stringOr(row.source_ref, `gateway:${file}`);
      summary.intents += upsertIntent(db, row, sourceRef);
      summary.executions += upsertExecution(db, row, sourceRef);
    }
  }

  refreshMaterializedCaches(db);
  await writeRunLog(vaultPath, "ingest-gateway", "ok", [
    `Files: ${summary.files}`,
    `Execution intents: ${summary.intents}`,
    `Order executions: ${summary.executions}`
  ]);
  db.close();
  return summary;
}

export async function rebuildAggregates(vaultPath: string): Promise<void> {
  const db = await openDatabase(vaultPath);
  refreshMaterializedCaches(db);
  db.close();
  await writeRunLog(vaultPath, "refresh-aggregates", "ok", ["Refreshed leaderboard + scanner caches"]);
}

function ensureSubaccountAndUser(db: Database, row: SourceRow, sourceRef: string): string {
  const userId = stringOr(row.user_id, "user:unknown");
  const subaccountId = stringOr(row.subaccount_id, "subaccount:unknown");

  db.prepare("INSERT OR IGNORE INTO users(id, handle, created_at, source_ref) VALUES (?, ?, ?, ?)")
    .run(userId, stringOr(row.user_handle, userId), iso(row.created_at), sourceRef);

  db.prepare(`INSERT OR IGNORE INTO nado_subaccounts(id, user_id, exchange, exchange_subaccount_id, created_at, source_ref)
              VALUES (?, ?, ?, ?, ?, ?)`)
    .run(subaccountId, userId, stringOr(row.exchange, "unknown"), stringOr(row.exchange_subaccount_id, subaccountId), iso(row.created_at), sourceRef);

  return subaccountId;
}

function upsertSnapshot(db: Database, row: SourceRow, sourceRef: string): number {
  if (row.record_type && row.record_type !== "snapshot") return 0;
  if (!row.snapshot_at || row.equity_usd === undefined || row.pnl_usd === undefined) return 0;
  const subaccountId = ensureSubaccountAndUser(db, row, sourceRef);
  const id = stringOr(row.id, `snapshot:${subaccountId}:${stringOr(row.snapshot_at, iso())}`);
  db.prepare(`INSERT OR REPLACE INTO subaccount_snapshots
    (id, subaccount_id, equity_usd, pnl_usd, exposure_usd, snapshot_at, source_ref)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id, subaccountId, numberOr(row.equity_usd), numberOr(row.pnl_usd), numberOr(row.exposure_usd), iso(row.snapshot_at), sourceRef);
  return 1;
}

function upsertOrderHistory(db: Database, row: SourceRow, sourceRef: string): number {
  if (row.record_type && row.record_type !== "order_history") return 0;
  if (!row.order_id || !row.status || row.quantity === undefined) return 0;
  const subaccountId = ensureSubaccountAndUser(db, row, sourceRef);
  const id = stringOr(row.id, `order-history:${subaccountId}:${stringOr(row.order_id, "unknown")}`);
  db.prepare(`INSERT OR REPLACE INTO order_history
    (id, subaccount_id, order_id, symbol, side, status, quantity, price, created_at, source_ref)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      id,
      subaccountId,
      stringOr(row.order_id),
      stringOr(row.symbol, "UNKNOWN"),
      stringOr(row.side, "buy"),
      stringOr(row.status),
      numberOr(row.quantity),
      numberOr(row.price),
      iso(row.created_at),
      sourceRef
    );
  return 1;
}

function upsertMatchHistory(db: Database, row: SourceRow, sourceRef: string): number {
  if (row.record_type && row.record_type !== "match_history") return 0;
  if (!row.match_id || row.quantity === undefined) return 0;
  const subaccountId = ensureSubaccountAndUser(db, row, sourceRef);
  const id = stringOr(row.id, `match-history:${subaccountId}:${stringOr(row.match_id, "unknown")}`);
  db.prepare(`INSERT OR REPLACE INTO match_history
    (id, subaccount_id, match_id, order_id, symbol, side, quantity, price, matched_at, source_ref)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      id,
      subaccountId,
      stringOr(row.match_id),
      stringOr(row.order_id, ""),
      stringOr(row.symbol, "UNKNOWN"),
      stringOr(row.side, "buy"),
      numberOr(row.quantity),
      numberOr(row.price),
      iso(row.matched_at),
      sourceRef
    );
  return 1;
}

function upsertIntent(db: Database, row: SourceRow, sourceRef: string): number {
  if (row.record_type && row.record_type !== "execution_intent") return 0;
  if (!row.intent_id || !row.symbol || row.quantity === undefined) return 0;
  const subaccountId = ensureSubaccountAndUser(db, row, sourceRef);
  db.prepare(`INSERT OR REPLACE INTO execution_intents
    (id, subaccount_id, symbol, side, quantity, strategy_tag, status, created_at, source_ref)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      stringOr(row.intent_id),
      subaccountId,
      stringOr(row.symbol),
      stringOr(row.side, "buy"),
      numberOr(row.quantity),
      stringOr(row.strategy_tag, ""),
      stringOr(row.status, "new"),
      iso(row.created_at),
      sourceRef
    );
  return 1;
}

function upsertExecution(db: Database, row: SourceRow, sourceRef: string): number {
  if (row.record_type && row.record_type !== "order_execution") return 0;
  if (!row.execution_id || !row.symbol || row.quantity === undefined) return 0;
  db.prepare(`INSERT OR REPLACE INTO order_executions
    (id, execution_intent_id, gateway_order_id, exchange, symbol, side, quantity, price, executed_at, source_ref)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(
      stringOr(row.execution_id),
      stringOr(row.intent_id, ""),
      stringOr(row.gateway_order_id, ""),
      stringOr(row.exchange, "unknown"),
      stringOr(row.symbol),
      stringOr(row.side, "buy"),
      numberOr(row.quantity),
      numberOr(row.price),
      iso(row.executed_at),
      sourceRef
    );
  return 1;
}

function refreshMaterializedCaches(db: Database): void {
  db.exec("DELETE FROM leaderboard_all_time");
  db.exec(`INSERT INTO leaderboard_all_time (subaccount_id, user_id, total_pnl_usd, total_volume_usd, win_rate, trades_count, updated_at, source_ref)
    SELECT
      ns.id AS subaccount_id,
      ns.user_id,
      COALESCE((SELECT SUM(s.pnl_usd) FROM subaccount_snapshots s WHERE s.subaccount_id = ns.id), 0) AS total_pnl_usd,
      COALESCE((SELECT SUM(ABS(m.quantity * m.price)) FROM match_history m WHERE m.subaccount_id = ns.id), 0) AS total_volume_usd,
      COALESCE((SELECT CAST(SUM(CASE WHEN s.pnl_usd > 0 THEN 1 ELSE 0 END) AS REAL) / NULLIF(COUNT(*), 0) FROM subaccount_snapshots s WHERE s.subaccount_id = ns.id), 0) AS win_rate,
      COALESCE((SELECT COUNT(*) FROM match_history m WHERE m.subaccount_id = ns.id), 0) AS trades_count,
      datetime('now') AS updated_at,
      'materialized:leaderboard_all_time' AS source_ref
    FROM nado_subaccounts ns`);

  db.exec("DELETE FROM public_scanner_cache");
  db.exec(`INSERT INTO public_scanner_cache (id, subaccount_id, user_id, symbol, side, quantity, price, notional_usd, happened_at, source_ref)
    SELECT
      oe.id,
      ei.subaccount_id,
      ns.user_id,
      oe.symbol,
      oe.side,
      oe.quantity,
      oe.price,
      ABS(oe.quantity * oe.price) AS notional_usd,
      oe.executed_at,
      oe.source_ref
    FROM order_executions oe
    LEFT JOIN execution_intents ei ON ei.id = oe.execution_intent_id
    LEFT JOIN nado_subaccounts ns ON ns.id = ei.subaccount_id`);
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function numberOr(value: unknown, fallback = 0): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function iso(value?: unknown): string {
  if (typeof value === "string" && value.length > 0) {
    const dt = new Date(value);
    if (!Number.isNaN(dt.valueOf())) return dt.toISOString();
  }
  return new Date().toISOString();
}
