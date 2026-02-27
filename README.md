# Cyber OS

Local-first "Cybernetic OS" kernel with strict separation between code and vault data. Evidence-first workflows, reproducible logs, and pluggable integrations.

## Quickstart
1) Install deps:
```
bun install
```

2) Init a vault:
```
bun run dev -- /init --vault <path>
```

3) Reindex (Phase 0 placeholder):
```
bun run dev -- /reindex
```

4) Ingest data and build public caches:
```
bun run dev -- /ingest-archive
bun run dev -- /ingest-gateway
bun run dev -- /refresh-aggregates
```

5) Serve public endpoints:
```
bun run dev -- /serve-public --port 3000
```

Endpoints:
- `GET /public/scanner?limit=50`
- `GET /public/leaderboard?minPnl=0&minVolume=100000&minTrades=10&limit=100&offset=0`

## Notes
- Vault data is not part of this repo and should never be committed.
- Evidence-first: any extracted fact must include `source_ref`.
