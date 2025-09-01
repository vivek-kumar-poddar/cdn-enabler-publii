# CDN Enabler for Publii


## Powerful CDN Plugin for the Publii Static Site Generator

Enable a Content Delivery Network (CDN) to enhance your website's performance. This plugin gives you 100% complete control to choose which static assets to serve from a CDN server and which to keep local.

## Overview

CDN Enabler seamlessly replaces local asset paths with a custom CDN URL for optimized content delivery. It provides granular control over which assets are served through your CDN, helping to significantly speed up your site's loading times for visitors worldwide.

## Features

*   **Comprehensive Asset Support:** Works with images, CSS, JavaScript, and fonts.
*   **Complete Path Rewriting:** Replaces URLs for assets located in `/media/`, `/assets/`, and `/themes/` directories.
*   **Advanced Control:** Optionally enable CDN for RSS/JSON feeds and sitemaps.
*   **Protocol Preservation:** Automatically handles `http` and `https` protocols to avoid mixed-content errors.
*   **Responsive Image Support:** Intelligently handles responsive `srcset` attributes for images, ensuring all resolutions are served from the CDN.

![CDN Enabler for Publii](https://cdn.jsdelivr.net/gh/vivek-kumar-poddar/cdn-enabler-publii@main/assets/cdn-enabler-plugin-publii.png)

## How It Works

The plugin intelligently processes your site's output during deployment.

*   **For HTML Content:** It finds all `src`, `href`, and `srcset` attributes and replaces local URLs with your specified CDN URL based on your configuration.
*   **For Feeds & Sitemaps:** It identifies asset URLs within your `feed.xml`, `feed.json`, and `sitemap.xml` files and rewrites them to use the CDN path, ensuring that subscribers and search engines also benefit from accelerated content.

## Configuration Options

The plugin offers the following settings, which can be configured from the Publii interface.

### CDN URL

*   **Enter URL (`cdnUrl`)**
    *   **Description:** Enter your full CDN URL without a trailing slash (e.g., `https://cdn.yourdomain.com`). The plugin will automatically handle the protocol (http/https).

### Asset Settings

Choose which types of static assets should be served from your CDN.

*   **Images (`enableImages`)**
    *   **Description:** Enable to serve images (.jpg, .png, .gif, .svg, .webp, etc.) from the CDN. This includes images in posts, thumbnails, and responsive `srcset` images.
    *   **Default:** `Enabled`

*   **CSS (`enableCss`)**
    *   **Description:** Enable to serve CSS stylesheets from the CDN.
    *   **Default:** `Enabled`

*   **JavaScript (`enableJs`)**
    *   **Description:** Enable to serve JavaScript files from the CDN.
    *   **Default:** `Enabled`

*   **Fonts (`enableFonts`)**
    *   **Description:** Enable to serve font files (.woff, .woff2, .ttf, etc.) from the CDN.
    *   **Default:** `Enabled`

### Advanced Settings

Enable CDN for assets linked within feeds. It's recommended to keep these disabled unless you have a specific need.

*   **Sitemap (`enableSitemap`)**
    *   **Description:** Rewrites asset URLs (e.g., image sitemaps) within `sitemap.xml`. This will NOT rewrite the main page URLs, which is important for SEO.
    *   **Default:** `Disabled`

*   **JSON Feed (`enableJsonFeed`)**
    *   **Description:** Rewrites image and asset URLs within the `feed.json` file.
    *   **Default:** `Disabled`

*   **RSS Feed (`enableXmlFeed`)**
    *   **Description:** Rewrites image and asset URLs within the `feed.xml` file.
    *   **Default:** `Disabled`

## License

This plugin is licensed under the **GNU AGPLv3**.
