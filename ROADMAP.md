# ROADMAP

## Phase 0 - Skeleton & Standards
- [x] Vault bootstrap + config
- [x] `/init` and `/reindex` wired to logging
- [x] Repo standards: AGENTS, ARCHITECTURE, ROADMAP, SECURITY

## Phase 1 - Indexer + Evidence model
- [x] Fact schema and sqlite tables
- [x] Markdown parser with source refs
- [x] `/search` with citations

## Phase 2 - MCP integration layer
- [ ] MCP client support and connector registry
- [ ] One connector pulling sample data to `sources/`

## Phase 3 - Agents + Workflows
- [ ] Workflow runner and parallel subagents
- [ ] `/brief`, `/gtd`, `/research` with cited outputs

## Phase 4 - Rules engine
- [ ] Rules DSL parser and scheduler
- [ ] Dry-run execution planning

## Phase 5 - Setup Wizard UI
- [ ] Local onboarding UI
- [ ] Vault selection + identity + automations

## Phase 6 - Team mode
- [ ] Shared vault sync helpers
- [ ] Private/shared access boundaries
