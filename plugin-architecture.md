## CDN Enabler Plugin Architecture

Last updated: 2026-03-05

## Fixed Decisions

1. Runtime remains a single plugin entry file:
`cdn-enabler/main.js`.
2. Plugin metadata and end-user settings remain in:
`cdn-enabler/plugin.json`.
3. Documentation remains root-level:
`README.md`, `current-features-of-plugin.md`, `whats-going-on-with-improvement.md`, `plugin-architecture.md`.
4. Build artifacts (if introduced later) are not a source of truth and should not drive architecture decisions.
5. Rewriting engine will stay regex-first (no heavy parser dependency) for plugin portability and speed.

## Current Modules and Ownership

1. `cdn-enabler/main.js`
Responsibility:
modifier registration, deploy guards, URL targeting logic, URL replacement logic for HTML + feeds/sitemap.
2. `cdn-enabler/plugin.json`
Responsibility:
plugin metadata, config surface, user-facing labels/notes/defaults.
3. `README.md`
Responsibility:
installation/usage/feature behavior/troubleshooting for users.

## Current-to-Target Mapping

1. Current:
precomputed runtime state with cached regex + quick precheck is now implemented.
Target:
maintain this model and add test coverage around it.
2. Current:
HTML rewriting now enforces local/same-origin scope.
Target:
evaluate optional canonical alias support (`www` and apex) as a future enhancement.
3. Current:
feed/sitemap rewriting now aligns with enabled asset types and same-origin scope.
Target:
add automated matrix tests for feed/json/xml/sitemap rewrite variants.
4. Current:
advanced routing controls now include include/exclude path regex filters.
Target:
consider prebuilt presets for common exclusions.

## Migration Phases

1. Phase 1 (Completed on 2026-03-05): Reliability + Performance
Protocol correctness, same-origin safety, protocol-relative handling, attribute regex robustness, state caching, early exits, and advanced path filters.
2. Phase 2 (Planned): Quality Guardrails
Add focused smoke tests for rewrite matrix (relative/absolute/protocol-relative, html/feed/json/xml/sitemap).
3. Phase 3 (Planned): UX Expansion
Preset suggestions and richer inline docs for CDN providers and troubleshooting.

## Open Items (Still Needed)

1. Define test harness approach for Publii plugin runtime simulation.
2. Decide whether `svg` should remain under both image and font behaviors for edge-case themes.
3. Decide if rewrite should support optional forced protocol mode (`https-only`) as a future advanced setting.
4. Decide if canonical host aliases (e.g., `www` vs apex) should count as same-origin for rewrites.

## Checklist

1. [x] Fixed decisions documented.
2. [x] Migration phases documented.
3. [x] Open items documented.
4. [x] Current-to-target mapping documented.
