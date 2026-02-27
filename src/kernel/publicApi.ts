import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import { openDatabase } from "./db";

type LeaderboardFilters = {
  minPnl?: number;
  minVolume?: number;
  minTrades?: number;
  userId?: string;
  limit: number;
  offset: number;
};

export async function startPublicApi(vaultPath: string, port: number): Promise<void> {
  const db = await openDatabase(vaultPath);

  const server = createServer((req, res) => {
    void handleRequest(db, req, res).catch((error: unknown) => {
      json(res, 500, { error: "internal_error", details: String(error) });
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(port, () => resolve());
  });

  process.on("SIGINT", () => {
    server.close(() => db.close());
  });

  console.log(`Public API listening on http://localhost:${port}`);
}

async function handleRequest(db: ReturnType<typeof openDatabase> extends Promise<infer T> ? T : never, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (!req.url) {
    json(res, 400, { error: "bad_request" });
    return;
  }

  const url = new URL(req.url, "http://localhost");

  if (req.method === "GET" && url.pathname === "/public/scanner") {
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 500);
    const rows = db.prepare(`SELECT id, subaccount_id, user_id, symbol, side, quantity, price, notional_usd, happened_at, source_ref
                             FROM public_scanner_cache
                             ORDER BY happened_at DESC
                             LIMIT ?`).all(limit);
    json(res, 200, { data: rows, source_ref: "materialized:public_scanner_cache" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/public/leaderboard") {
    const filters = parseLeaderboardFilters(url);
    const where: string[] = [];
    const args: Array<string | number> = [];

    if (filters.userId) {
      where.push("user_id = ?");
      args.push(filters.userId);
    }
    if (filters.minPnl !== undefined) {
      where.push("total_pnl_usd >= ?");
      args.push(filters.minPnl);
    }
    if (filters.minVolume !== undefined) {
      where.push("total_volume_usd >= ?");
      args.push(filters.minVolume);
    }
    if (filters.minTrades !== undefined) {
      where.push("trades_count >= ?");
      args.push(filters.minTrades);
    }

    const sqlWhere = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const sql = `SELECT rank, subaccount_id, user_id, total_pnl_usd, total_volume_usd, win_rate, trades_count, updated_at, source_ref
                 FROM leaderboard_ranked
                 ${sqlWhere}
                 ORDER BY rank ASC
                 LIMIT ? OFFSET ?`;
    const rows = db.prepare(sql).all(...args, filters.limit, filters.offset);
    json(res, 200, { data: rows, source_ref: "materialized:leaderboard_all_time" });
    return;
  }

  json(res, 404, { error: "not_found" });
}

function parseLeaderboardFilters(url: URL): LeaderboardFilters {
  const minPnl = toNumber(url.searchParams.get("minPnl"));
  const minVolume = toNumber(url.searchParams.get("minVolume"));
  const minTrades = toNumber(url.searchParams.get("minTrades"));
  const userId = url.searchParams.get("userId") ?? undefined;
  const limit = Math.min(Math.max(toNumber(url.searchParams.get("limit")) ?? 100, 1), 1000);
  const offset = Math.max(toNumber(url.searchParams.get("offset")) ?? 0, 0);

  return { minPnl, minVolume, minTrades, userId, limit, offset };
}

function toNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function json(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload, null, 2));
}
