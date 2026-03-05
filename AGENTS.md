# AGENTS.md (Mandatory Rules)

Applies to every task in this PUBLII Plugin project.

## [1] Start Every Task

1. Ignore all contents of `build` folder.
2. Read `current-features-of-plugin.md`.
3. Read `whats-going-on-with-improvement.md`.
4. Read `plugin-architecture.md` (fixed decisions + migration status).
5. Preserve existing behavior when proposing or implementing changes.
6. If behavior, architecture, or roadmap changes, update:
   - `current-features-of-plugin.md`
   - `whats-going-on-with-improvement.md`
   - `plugin-architecture.md`
7. Use `whats-going-on-with-improvement.md` (`DONE` + `IN PROGRESS`) as fixed-vs-pending truth.
8. Update `plugin-architecture.md` for any file-path, ownership, migration, or mapping change.
9. Update `current-features-of-plugin.md` for any added, removed, or materially changed feature.

## [2] Architecture Guardrails

- `plugin-architecture.md` is the modularization source of truth.
- Keep root minimal; no broad new top-level folders without explicit approval.

Before architecture/file moves, review:

- `Fixed Decisions`
- `Migration Phases`
- `Open Items (Still Needed)`

After architecture/file moves:

- mark completed checklist items,
- add new blockers/open decisions,
- update current-to-target mappings.
