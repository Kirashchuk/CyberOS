# AGENTS

## Quickstart
- Install deps: `bun install`
- Init vault: `bun run dev -- /init --vault <path>`
- Reindex: `bun run dev -- /reindex`

## Commands
- `/init --vault <path>`: create or validate a vault and write `cyberos.config.json`
- `/reindex`: create an empty index state and log a run
- `/help`: show usage

## Conventions
- Keep user data in the vault; never commit vault contents to the repo.
- Any workflow run must write a log to `vault/logs/`.
- Evidence-first: outputs that claim facts must include `source_ref`.

## Module map
- `src/cli.ts`: CLI entrypoint and slash-command router.
- `src/kernel/config.ts`: repo config (vault path).
- `src/kernel/vault.ts`: vault detection, validation, and bootstrap.
- `src/kernel/reindex.ts`: placeholder indexer and run logging.
- `src/kernel/logging.ts`: run log writer.
- `tools/`: dev scaffolding scripts (lint/format placeholders).
