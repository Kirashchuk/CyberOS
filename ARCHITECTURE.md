# ARCHITECTURE

## Overview
Cyber OS is a local-first system with a strict separation between the kernel (this repo) and the vault (user data). The kernel provides CLI, workflows, indexing, and rules. The vault stores context, sources, facts, content, logs, and index state.

## Boundaries
- Repo = kernel code. No user data.
- Vault = user data. Never committed to the repo.
- Any fact or extracted event must include `source_ref` (doc id/path + quote or offset).

## Core primitives
- CONTEXT: identity, goals, style, policies in `vault/context/`.
- AGENT: workflow runners and tool orchestration in `kernel/agents/`.
- RULES: automation triggers and actions in `kernel/rules/`.

## Target module layout
- `kernel/cli/`: slash-command router (`/brief`, `/gtd`, `/reindex`, `/research`).
- `kernel/server/`: local API for UI + workflow execution.
- `kernel/indexer/`: vault crawler, parsers, entity resolution, sqlite writer.
- `kernel/rules/`: rule DSL parser + scheduler + executor.
- `kernel/agents/`: agent runtime + parallel orchestration.
- `kernel/connectors/`: MCP client wrappers.
- `kernel/ui/`: Setup Wizard + dashboards.

## Data flow (high level)
1) Vault sources are ingested into `vault/sources/`.
2) Indexer parses sources, writes facts and index state.
3) Workflows read context + facts + sources and write artifacts to `vault/content/`.
4) Every run writes logs to `vault/logs/` with references to sources used.

## Evidence model (phase 1)
Facts use a structured schema with `evidence{quote, source_ref}` and are stored in sqlite.
