## CDN Enabler Improvements Tracker

Last updated: 2026-03-05

## DONE (Baseline Already Present)

1. Plugin wiring with Publii modifiers:
`htmlOutput`, `feedRssOutput`, `feedJsonOutput`, `sitemapOutput`.
2. Basic deploy-only guard to avoid preview rewriting.
3. Toggle-driven asset type targeting for images/CSS/JS/fonts.
4. `srcset` handling for responsive image URLs.
5. Feed/sitemap modifier scaffold and site URL based replacement entry point.
6. Protocol handling fixed for root-relative URLs (no forced `http://` fallback).
7. Third-party absolute URL rewrite blocked through same-origin host checks.
8. Protocol-relative URL parsing and rewrite safety added.
9. HTML attribute matching improved:
case-insensitive + flexible spacing around `=`.
10. Feed/sitemap URL rewriting expanded to enabled asset types, not only `/media/`.
11. Cached runtime regex/state added for better publish-time performance.
12. Early-exit prechecks added before expensive replacement passes.
13. Optional include/exclude path regex filters added.
14. Detailed inline code comments with examples added in core logic.

## IN PROGRESS (Current Task)

1. Add compact smoke-test script or fixture set for rewrite matrix validation.

## NEXT (After This Task)

1. Add lightweight automated smoke tests for URL rewrite cases.
2. Add real-world examples for Cloudflare/Bunny/KeyCDN in README.
3. Add troubleshooting section for mixed content and CORS/font MIME issues.
4. Consider optional canonical-host alias support (`www` <-> apex) for same-origin logic.
