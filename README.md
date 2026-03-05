# CDN Enabler for Publii

## Overview

CDN Enabler rewrites eligible local asset URLs to a configured CDN domain during publish/deploy output generation in Publii.

Last documentation update: 2026-03-05
Current plugin version: `0.0.2`

## Current Feature Set

1. Deploy-only rewriting (no rewrite in preview or instant-preview).
2. HTML attribute rewriting for `src`, `href`, and `srcset`.
3. Asset type toggles for images, CSS, JavaScript, and fonts.
4. Optional output modifiers for `feed.xml`, `feed.json`, and `sitemap.xml`.
5. Same-origin safety: third-party URLs are not rewritten.
6. Protocol-safe behavior for root-relative and protocol-relative URLs.
7. Optional include/exclude path regex filters for advanced control.

![CDN Enabler for Publii](https://cdn.jsdelivr.net/gh/vivek-kumar-poddar/cdn-enabler-publii@main/assets/cdn-enabler-plugin-publii.png)

## Configuration

### CDN Config

1. `cdnUrl`: CDN origin URL, for example `https://cdn.yourdomain.com`.
Protocol fallback order for root-relative assets:
site protocol -> configured CDN protocol -> HTTPS fallback.

### Asset Settings

1. `enableImages`: rewrite image paths (typically `/media/`).
2. `enableCss`: rewrite CSS files in `/assets/` and `/themes/`.
3. `enableJs`: rewrite JS files in `/assets/` and `/themes/`.
4. `enableFonts`: rewrite font files in `/assets/` and `/themes/`.

### Advanced Settings

1. `enableSitemap`: allow rewrite processing for sitemap output.
2. `enableJsonFeed`: allow rewrite processing for JSON feed output.
3. `enableXmlFeed`: allow rewrite processing for RSS feed output.
4. `includePathPattern` (optional): only rewrite paths matching this regex.
Example: `^/(media|assets|themes)/`
5. `excludePathPattern` (optional): skip rewrite for paths matching this regex.
Example: `/media/private/|\\.map$`

## Deployment Behavior

1. Rewrites are applied only during deploy contexts to preserve editing preview behavior.
2. Main page URLs are not intended for replacement; asset URLs are the focus.
3. `srcset` descriptors are preserved while only URL tokens are replaced.
4. Feed/sitemap rewriting respects the same asset toggle rules used by HTML rewrites.

## Rewrite Safety Examples

1. Same-origin rewrite:
`https://mysite.com/media/logo.jpg` -> `https://cdn.example.com/media/logo.jpg`
2. Third-party URL protection:
`https://othercdn.com/media/logo.jpg` -> unchanged
3. Root-relative protocol-safe rewrite:
`/media/hero.webp` on an HTTPS site -> `https://cdn.example.com/media/hero.webp`
4. Srcset rewrite with descriptor preservation:
`/media/a-400.jpg 400w, /media/a-800.jpg 800w` -> both URLs rewritten, descriptors preserved

## License

This plugin is licensed under **GNU AGPLv3**. See:
`cdn-enabler/license.md`
