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

3) Reindex (build facts index from markdown sources):
```
bun run dev -- /reindex
```

4) Search indexed facts (with source citations):
```
bun run dev -- /search --q "your query"
```

## Notes
- Vault data is not part of this repo and should never be committed.
- Evidence-first: any extracted fact must include `source_ref`.
