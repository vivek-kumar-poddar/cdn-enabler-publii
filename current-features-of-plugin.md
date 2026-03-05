## CDN Enabler for Publii - Current Features

Last updated: 2026-03-05
Version in code: `0.0.2`

### Core Behavior

1. Rewrites supported asset URLs from local origin to configured CDN URL during deploy builds.
2. Does not rewrite in preview contexts (`preview`, `instant-preview`).
3. Rewrites HTML attributes: `src`, `href`, `srcset`.
4. Rewrites enabled feed outputs:
`feed.xml`, `feed.json`, and `sitemap.xml` through Publii output modifiers.
5. Rewrites only local/same-origin URLs, preventing third-party URL mutation.
6. Correctly handles root-relative, absolute same-origin, and protocol-relative URLs.

### Configurable Asset Toggles

1. `enableImages`: `/media/` assets.
2. `enableCss`: CSS files under `/assets/` or `/themes/`.
3. `enableJs`: JS files under `/assets/` or `/themes/`.
4. `enableFonts`: font files under `/assets/` or `/themes/` (`woff`, `woff2`, `ttf`, `otf`, `eot`, `svg`).
5. `enableSitemap`: feed/sitemap modifier for `sitemap.xml`.
6. `enableJsonFeed`: feed modifier for `feed.json`.
7. `enableXmlFeed`: feed modifier for `feed.xml`.
8. `includePathPattern` (optional): include-only path filter using JavaScript regex.
9. `excludePathPattern` (optional): path exclusion filter using JavaScript regex.

### Performance and Reliability Improvements Applied

1. Root-relative URLs now use safe protocol fallback order:
site protocol -> configured CDN protocol -> HTTPS.
2. Third-party absolute URLs are skipped (same-origin check required).
3. Protocol-relative URLs (`//host/path`) are parsed safely and rewritten only for same host.
4. HTML attribute matching supports case-insensitive attributes and flexible spacing around `=`.
5. Feed/sitemap rewriting now applies to enabled local asset types (`/media/`, `/assets/`, `/themes/` + enabled extensions).
6. Runtime regex/state is cached once per plugin instance.
7. Added pre-check short-circuits to skip unnecessary replacement passes.

### Non-Goals / Preserved Behavior

1. Main page URLs are not rewritten for SEO safety.
2. Rewriting remains deploy-only, preserving Publii preview behavior.
3. Config UX stays minimal and site-scope only (`scope: site`).
