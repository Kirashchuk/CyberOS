# Cyber OS

Local-first "Cybernetic OS" kernel with strict separation between code and vault data. Evidence-first workflows, reproducible logs, and pluggable integrations.

## Quickstart
- Install deps:
```bash
bun install
```

- Init a vault:
```bash
bun run dev -- /init --vault <path>
```

- Build markdown facts index:
```bash
bun run dev -- /reindex
```

- Search indexed facts (with source citations):
```bash
bun run dev -- /search --q "your query"
```

- Ingest data and refresh public caches:
```bash
bun run dev -- /ingest-archive
bun run dev -- /ingest-gateway
bun run dev -- /refresh-aggregates
```

- Serve public endpoints:
```bash
bun run dev -- /serve-public --port 3000
```

Public endpoints:
- `GET /public/scanner?limit=50`
- `GET /public/leaderboard?minPnL=0&minVolume=100000&minTrades=10&limit=100&offset=0`

Tip: use `bun run dev -- /help` as the canonical command list.

## Notes
- Vault data is not part of this repo and should never be committed.
- Evidence-first: any extracted fact must include `source_ref`.
